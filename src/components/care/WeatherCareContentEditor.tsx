import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  weatherTriggerCategories,
  resolveWeatherContent,
  normalizeWeatherContentEntry,
  aiWeatherContentVariants,
  getWeatherContentRowStatus,
  getWeatherThresholdLabel,
  type WeatherContentMap,
  type WeatherContentRowStatus,
  type WeatherTriggerKey,
  type WeatherTriggerState,
} from "@/data/humanityCare";
import { CareContentAiPanel } from "@/components/care/CareContentAiPanel";
import { Textarea } from "@/components/ui/textarea";

type WeatherCareContentEditorProps = {
  trigger: WeatherTriggerState;
  contents: WeatherContentMap;
  onChange: (contents: WeatherContentMap) => void;
};

export const WeatherCareContentEditor = ({
  trigger,
  contents,
  onChange,
}: WeatherCareContentEditorProps) => {
  const [editKey, setEditKey] = useState<WeatherTriggerKey | null>(null);
  const [aiDraft, setAiDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");

  const enabledCount = weatherTriggerCategories.filter((c) => trigger.enabled[c.key])
    .length;

  const openEdit = (key: WeatherTriggerKey) => {
    if (!trigger.enabled[key]) return;
    const existing = normalizeWeatherContentEntry(contents[key]);
    setEditKey(key);
    const text = resolveWeatherContent(existing);
    setAiDraft(existing?.selected ?? text);
    setContentDraft(text);
  };

  const handleAiSelect = (text: string) => {
    setAiDraft(text);
    setContentDraft(text);
  };

  const confirmEdit = () => {
    const final = contentDraft.trim();
    if (!editKey || !final) return;
    const selected = aiDraft.trim() || final;
    const custom = contentDraft.trim();
    onChange({
      ...contents,
      [editKey]: {
        selected,
        custom: custom !== selected ? custom : undefined,
      },
    });
    setEditKey(null);
  };

  const editCat = editKey
    ? weatherTriggerCategories.find((c) => c.key === editKey)
    : null;

  if (enabledCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300/60 bg-amber-50/40 px-3 py-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-amber-600/70" />
        <p className="text-sm font-medium text-foreground">尚未启用任何极端天气</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          请先在「触发条件」中启用至少 1 项，再为对应场景配置触达文案
        </p>
        <p className="mt-3 text-xs font-medium text-primary">
          ↑ 点击 STEP 02 右侧铅笔配置
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-1.5">
        {weatherTriggerCategories.map((cat) => {
          const status = getWeatherContentRowStatus(cat.key, trigger, contents);
          const Icon = cat.icon;
          const threshold = getWeatherThresholdLabel(cat.key, trigger);
          const preview = resolveWeatherContent(contents[cat.key]);

          return (
            <li key={cat.key}>
              <button
                type="button"
                disabled={status === "disabled"}
                onClick={() => openEdit(cat.key)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-base",
                  status === "disabled" &&
                    "cursor-not-allowed border-transparent bg-muted/40 opacity-60",
                  status === "pending" &&
                    "border-amber-200/80 bg-amber-50/50 active:scale-[0.99]",
                  status === "ready" &&
                    "border-border bg-card active:scale-[0.99] hover:bg-secondary/30",
                )}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `hsl(var(${cat.colorVar}) / 0.15)`,
                    color: `hsl(var(${cat.colorVar}))`,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                    <WeatherContentStatusBadge status={status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{threshold}</p>
                  {status === "disabled" ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      未启用 · 该场景不会触达
                    </p>
                  ) : status === "pending" ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-800">
                      已启用，请选择 AI 生成文案
                    </p>
                  ) : (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-foreground/90">
                      {preview}
                    </p>
                  )}
                </div>
                {status !== "disabled" && (
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!editKey} onOpenChange={(o) => !o && setEditKey(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-left text-base">
              编辑关怀内容 · {editCat?.name}
            </SheetTitle>
          </SheetHeader>
          {editCat && (
            <div className="mt-2 space-y-3">
              <p className="text-xs text-muted-foreground">
                触发条件：{getWeatherThresholdLabel(editCat.key, trigger)}
              </p>
              <CareContentAiPanel
                key={editKey}
                pool={aiWeatherContentVariants[editCat.key]}
                onSelect={handleAiSelect}
              />
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  自定义内容
                </label>
                <Textarea
                  value={contentDraft}
                  onChange={(e) => setContentDraft(e.target.value)}
                  placeholder="选择上方 AI 方案后将自动填入，可自行修改"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
              <button
                type="button"
                onClick={confirmEdit}
                disabled={!contentDraft.trim()}
                className="w-full rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-base active:scale-95 disabled:opacity-40"
              >
                确定
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

function WeatherContentStatusBadge({ status }: { status: WeatherContentRowStatus }) {
  if (status === "disabled") {
    return (
      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
        未启用
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="shrink-0 rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-medium text-amber-900">
        待选择
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">
      <CheckCircle2 className="h-2.5 w-2.5" />
      已配置
    </span>
  );
}
