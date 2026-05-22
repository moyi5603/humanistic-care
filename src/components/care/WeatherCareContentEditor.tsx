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
  truncateCarePreviewText,
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

  const enabledCats = weatherTriggerCategories.filter(
    (c) => trigger.enabled[c.key],
  );
  const disabledCount = weatherTriggerCategories.length - enabledCats.length;

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

  if (enabledCats.length === 0) {
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
      <ul className="space-y-1">
        {enabledCats.map((cat) => {
          const status = getWeatherContentRowStatus(cat.key, trigger, contents);
          const Icon = cat.icon;
          const threshold = getWeatherThresholdLabel(cat.key, trigger);
          const preview = resolveWeatherContent(contents[cat.key]);

          return (
            <li key={cat.key}>
              <button
                type="button"
                onClick={() => openEdit(cat.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-base active:scale-[0.99]",
                  status === "pending"
                    ? "border-amber-200/80 bg-amber-50/50"
                    : "border-border bg-card hover:bg-secondary/30",
                )}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `hsl(var(${cat.colorVar}) / 0.15)`,
                    color: `hsl(var(${cat.colorVar}))`,
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {cat.short}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {threshold}
                    </span>
                    <WeatherContentStatusBadge status={status} />
                  </div>
                  {status === "pending" ? (
                    <p className="mt-0.5 text-[10px] font-medium text-amber-800">
                      点击选择 AI 文案
                    </p>
                  ) : (
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {truncateCarePreviewText(preview)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>

      {disabledCount > 0 && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          另有 {disabledCount} 类未启用 · 在「触发条件」中开启后可配置
        </p>
      )}

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
  if (status === "pending") {
    return (
      <span className="ml-auto shrink-0 rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-medium text-amber-900">
        待选择
      </span>
    );
  }
  return (
    <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">
      <CheckCircle2 className="h-2.5 w-2.5" />
      已配置
    </span>
  );
}
