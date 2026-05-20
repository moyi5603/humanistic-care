import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  Heart,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Users,
} from "lucide-react";
import {
  weatherTriggerCategories,
  defaultWeatherTrigger,
  summarizeWeather,
  type WeatherTriggerKey,
  type WeatherTriggerState,
} from "@/data/humanityCare";
import { WeatherTriggerEditor } from "@/components/care/WeatherTriggerEditor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ContentEntry = { template: string; custom: string };
type ContentMap = Partial<Record<WeatherTriggerKey, ContentEntry>>;

/** 每类天气：2 条固定文案 + 1 条 AI 生成（与正式页关怀内容编辑一致） */
const contentTemplatesByType: Record<
  WeatherTriggerKey,
  readonly [string, string, string]
> = {
  extremeHeat: [
    "🥵 高温预警!请注意防暑降温,多补水",
    "☀ 今日气温较高,请减少户外作业并及时补水",
    "✨ AI 动态生成(根据高温场景与岗位提醒)",
  ],
  extremeCold: [
    "❄ 低温预警,注意保暖防冻",
    "🧊 天气寒冷,户外作业请做好防寒措施",
    "✨ AI 动态生成(根据低温场景与通勤提醒)",
  ],
  coldWave: [
    "❄ 寒潮来袭,注意添衣保暖",
    "🧣 气温骤降,请合理安排出行并注意保暖",
    "✨ AI 动态生成(根据寒潮降温场景提醒)",
  ],
  rainstorm: [
    "☔ 今日有暴雨,出门请带好雨具,注意安全",
    "🌧 暴雨天气,建议错峰出行,注意交通安全",
    "✨ AI 动态生成(根据暴雨预警等级提醒)",
  ],
  snowstorm: [
    "🌨 暴雪预警,出行注意安全",
    "⛄ 降雪较大,路面湿滑,请减速慢行",
    "✨ AI 动态生成(根据暴雪预警等级提醒)",
  ],
  typhoon: [
    "🌀 台风影响,尽量减少外出",
    "💨 台风天气,请关好门窗,非必要不外出",
    "✨ AI 动态生成(根据台风预警等级提醒)",
  ],
  sandstorm: [
    "🌫 沙尘天气,建议佩戴口罩",
    "😷 能见度较低,出行请注意防护",
    "✨ AI 动态生成(根据沙尘暴预警提醒)",
  ],
  haze: [
    "😷 空气质量较差,建议减少户外活动",
    "🌁 霾 / 重污染,敏感人群请减少外出",
    "✨ AI 动态生成(根据空气质量与 AQI 提醒)",
  ],
};

const resolveContent = (entry?: ContentEntry) =>
  entry ? entry.custom.trim() || entry.template : "";

const isAiTemplate = (text: string) => text.includes("AI 动态生成");
type RowStatus = "disabled" | "pending" | "ready";
type ScenarioId = "none" | "partial" | "full";

const scenarios: {
  id: ScenarioId;
  label: string;
  desc: string;
  trigger: WeatherTriggerState;
  contents: ContentMap;
}[] = [
  {
    id: "none",
    label: "全部未启用",
    desc: "8 类触发均未开启",
    trigger: {
      enabled: Object.fromEntries(
        weatherTriggerCategories.map((c) => [c.key, false]),
      ) as Record<WeatherTriggerKey, boolean>,
      thresholds: defaultWeatherTrigger.thresholds,
      levels: defaultWeatherTrigger.levels,
    },
    contents: {},
  },
  {
    id: "partial",
    label: "部分已配置",
    desc: "3 类启用，其中 1 类待写文案",
    trigger: {
      enabled: {
        extremeHeat: true,
        rainstorm: true,
        coldWave: true,
        extremeCold: false,
        snowstorm: false,
        typhoon: false,
        sandstorm: false,
        haze: false,
      },
      thresholds: defaultWeatherTrigger.thresholds,
      levels: defaultWeatherTrigger.levels,
    },
    contents: {
      extremeHeat: {
        template: contentTemplatesByType.extremeHeat[0],
        custom: "",
      },
      rainstorm: {
        template: contentTemplatesByType.rainstorm[0],
        custom: "",
      },
    },
  },
  {
    id: "full",
    label: "全部已配置",
    desc: "8 类均已启用且均有文案",
    trigger: defaultWeatherTrigger,
    contents: Object.fromEntries(
      weatherTriggerCategories.map((c) => [
        c.key,
        { template: contentTemplatesByType[c.key][0], custom: "" },
      ]),
    ) as ContentMap,
  },
];

function getThresholdLabel(key: WeatherTriggerKey, state: WeatherTriggerState): string {
  const cat = weatherTriggerCategories.find((c) => c.key === key)!;
  if (!state.enabled[key]) return "未启用";
  if (cat.kind === "threshold") {
    const v = state.thresholds[key] ?? cat.defaultValue;
    return cat.formatValue(v);
  }
  const levels = state.levels[key] ?? cat.defaultLevels;
  return cat.formatValue(levels);
}

function getRowStatus(
  key: WeatherTriggerKey,
  trigger: WeatherTriggerState,
  contents: ContentMap,
): RowStatus {
  if (!trigger.enabled[key]) return "disabled";
  if (!contents[key]) return "pending";
  return "ready";
}

const WeatherCareContentPrototype = () => {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("partial");
  const [trigger, setTrigger] = useState<WeatherTriggerState>(scenarios[1].trigger);
  const [contents, setContents] = useState<ContentMap>(scenarios[1].contents);
  const [editKey, setEditKey] = useState<WeatherTriggerKey | null>(null);
  const [contentDraft, setContentDraft] = useState<ContentEntry>({
    template: "",
    custom: "",
  });

  const applyScenario = (id: ScenarioId) => {
    const s = scenarios.find((x) => x.id === id)!;
    setScenarioId(id);
    setTrigger(s.trigger);
    setContents({ ...s.contents });
  };

  const weatherSummary = summarizeWeather(trigger);

  const readyCount = useMemo(
    () =>
      weatherTriggerCategories.filter(
        (c) => trigger.enabled[c.key] && contents[c.key],
      ).length,
    [trigger, contents],
  );

  const openEdit = (key: WeatherTriggerKey) => {
    if (!trigger.enabled[key]) return;
    const templates = contentTemplatesByType[key];
    const existing = contents[key];
    setEditKey(key);
    setContentDraft(
      existing ?? { template: templates[0], custom: "" },
    );
  };

  const confirmEdit = () => {
    if (!editKey) return;
    setContents((prev) => ({ ...prev, [editKey]: contentDraft }));
    setEditKey(null);
  };

  const editCat = editKey
    ? weatherTriggerCategories.find((c) => c.key === editKey)
    : null;

  return (
    <MobileFrame className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            to="/agents/humanity-care/weather"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-base active:scale-90 hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-foreground">
              关怀内容 · 原型预览
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              8 类极端天气场景清单（未接入正式创建页）
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            DEMO
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-4 scrollbar-hide">
        <section className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">快速切换演示数据</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => applyScenario(s.id)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-left transition-base active:scale-[0.98]",
                  scenarioId === s.id
                    ? "border-primary bg-accent"
                    : "border-border bg-card",
                )}
              >
                <div className="text-xs font-semibold text-foreground">{s.label}</div>
                <p className="mt-0.5 max-w-[120px] text-[10px] text-muted-foreground">{s.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">策略全景（片段）</h2>
          <div className="relative">
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              <TimelineStepMock step="01" title="关怀对象" icon={Users} colorVar="--cat-3">
                <SummaryMock text="全公司员工" sub="按组织架构选择" />
              </TimelineStepMock>

              <TimelineStepMock
                step="02"
                title="触发条件"
                icon={Clock}
                colorVar="--cat-7"
                editTrigger={
                  <WeatherTriggerEditor
                    value={trigger}
                    onChange={setTrigger}
                    trigger={<EditPencilBtn />}
                  />
                }
              >
                <SummaryMock
                  text={weatherSummary.text}
                  sub={weatherSummary.sub}
                  warn={weatherSummary.text.includes("未启用")}
                />
              </TimelineStepMock>

              <TimelineStepMock step="03" title="关怀内容" icon={Heart} colorVar="--cat-9">
                <WeatherContentPanel
                  trigger={trigger}
                  contents={contents}
                  onEdit={openEdit}
                />
                <button
                  type="button"
                  disabled={readyCount === 0}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-secondary/40 py-2 text-xs font-medium text-foreground transition-base active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {readyCount === 0
                    ? "请先配置至少 1 类文案后再模拟查收"
                    : "模拟员工查收"}
                </button>
              </TimelineStepMock>
            </div>
          </div>
        </section>

        <p className="rounded-xl border border-dashed border-border bg-secondary/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          说明：此为独立原型页，不影响现有「新建天气关怀」流程。可在上方切换场景，或点开 STEP
          02 修改触发开关，观察 STEP 03 清单与摘要联动。
        </p>
      </main>

      <Sheet open={!!editKey} onOpenChange={(o) => !o && setEditKey(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-left text-base">编辑 · {editCat?.name}</SheetTitle>
          </SheetHeader>
          {editCat && (
            <div className="mt-2 space-y-3">
              <p className="text-xs text-muted-foreground">
                触发条件：{getThresholdLabel(editCat.key, trigger)}
              </p>
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  选择模板
                </div>
                <ul className="max-h-[36vh] space-y-1 overflow-y-auto scrollbar-hide">
                  {contentTemplatesByType[editCat.key].map((opt) => (
                    <li key={opt}>
                      <button
                        type="button"
                        onClick={() =>
                          setContentDraft((d) => ({ ...d, template: opt }))
                        }
                        className={cn(
                          "flex w-full items-start justify-between gap-2 rounded-xl px-3 py-3 text-left text-sm transition-base",
                          contentDraft.template === opt
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground active:bg-secondary",
                        )}
                      >
                        <span className="flex min-w-0 items-start gap-1.5 leading-relaxed">
                          {isAiTemplate(opt) && (
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                          {opt}
                        </span>
                        {contentDraft.template === opt && (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  自定义内容(可选)
                </div>
                <textarea
                  value={contentDraft.custom}
                  onChange={(e) =>
                    setContentDraft((d) => ({ ...d, custom: e.target.value }))
                  }
                  placeholder="填写后将覆盖模板内容…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={confirmEdit}
                className="w-full rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-base active:scale-95"
              >
                确定
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </MobileFrame>
  );
};

function MobileFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-md", className)}>{children}</div>;
}

function TimelineStepMock({
  step,
  title,
  icon: Icon,
  colorVar,
  editTrigger,
  children,
}: {
  step: string;
  title: string;
  icon: typeof Users;
  colorVar: string;
  editTrigger?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-3">
      <div
        className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-soft"
        style={{
          background: `linear-gradient(135deg, hsl(var(${colorVar})), hsl(var(${colorVar}) / 0.75))`,
        }}
      >
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl bg-card p-3 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">
              STEP {step}:
            </span>
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>
          {editTrigger}
        </div>
        {children}
      </div>
    </div>
  );
}

function SummaryMock({ text, sub, warn }: { text: string; sub?: string; warn?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl px-2.5 py-2 text-left",
        warn ? "border border-amber-200/80 bg-amber-50/80" : "bg-secondary/50",
      )}
    >
      <p className="text-sm text-foreground">{text}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}


function WeatherContentPanel({
  trigger,
  contents,
  onEdit,
}: {
  trigger: WeatherTriggerState;
  contents: ContentMap;
  onEdit: (key: WeatherTriggerKey) => void;
}) {
  const enabledCount = weatherTriggerCategories.filter((c) => trigger.enabled[c.key])
    .length;

  if (enabledCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300/60 bg-amber-50/40 px-3 py-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-amber-600/70" />
        <p className="text-sm font-medium text-foreground">尚未启用任何极端天气</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          请先在「触发条件」中启用至少 1 项，再为对应场景配置触达文案
        </p>
        <p className="mt-3 text-xs font-medium text-primary">↑ 点击 STEP 02 右侧铅笔配置</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {weatherTriggerCategories.map((cat) => {
          const status = getRowStatus(cat.key, trigger, contents);
          const Icon = cat.icon;
          const threshold = getThresholdLabel(cat.key, trigger);
          const preview = resolveContent(contents[cat.key]);
          const usingAi =
            contents[cat.key] &&
            !contents[cat.key]!.custom.trim() &&
            isAiTemplate(contents[cat.key]!.template);

          return (
            <li key={cat.key}>
              <button
                type="button"
                disabled={status === "disabled"}
                onClick={() => onEdit(cat.key)}
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
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{threshold}</p>
                  {status === "disabled" ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      未启用 · 该场景不会触达
                    </p>
                  ) : status === "pending" ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-800">
                      已启用，尚未配置触达文案
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "mt-1 line-clamp-2 text-[11px] leading-snug",
                        usingAi ? "text-primary" : "text-foreground/90",
                      )}
                    >
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
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
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
        待配置
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

function EditPencilBtn() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
      <Edit3 className="h-3.5 w-3.5" />
    </span>
  );
}

export default WeatherCareContentPrototype;
