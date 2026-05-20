import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Edit3, Users } from "lucide-react";
import {
  WorkloadOvertimeTriggerEditor,
  defaultOvertimeDaysConfig,
  summarizeWorkloadPrototype,
  type WorkloadTriggerPrototypeValue,
} from "@/components/care/prototype/WorkloadOvertimeTriggerEditor";
import { defaultWorkloadTrigger } from "@/data/humanityCare";
import { cn } from "@/lib/utils";

type ScenarioId = "overtime" | "overtimeStrict" | "daily";

const scenarios: {
  id: ScenarioId;
  label: string;
  desc: string;
  value: WorkloadTriggerPrototypeValue;
}[] = [
  {
    id: "overtime",
    label: "连班 · 默认",
    desc: "连续 3 天 · 单日 ≥10h",
    value: {
      kind: "overtimeDays",
      config: defaultOvertimeDaysConfig,
    },
  },
  {
    id: "overtimeStrict",
    label: "连班 · 更严",
    desc: "连续 5 天 · 单日 ≥12h",
    value: {
      kind: "overtimeDays",
      config: { consecutiveDays: 5, dailyHoursAsOvertime: 12 },
    },
  },
  {
    id: "daily",
    label: "对比 · 单日工时",
    desc: "沿用现有单日触发",
    value: { kind: "standard", state: defaultWorkloadTrigger },
  },
];

const WorkloadOvertimeTriggerPrototype = () => {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("overtime");
  const [triggerValue, setTriggerValue] = useState<WorkloadTriggerPrototypeValue>(
    scenarios[0].value,
  );

  const applyScenario = (id: ScenarioId) => {
    const s = scenarios.find((x) => x.id === id)!;
    setScenarioId(id);
    setTriggerValue(s.value);
  };

  const summary = summarizeWorkloadPrototype(triggerValue);
  const isOvertime = triggerValue.kind === "overtimeDays";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            to="/agents/humanity-care/workload/new"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-base active:scale-90 hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-foreground">
              工作强度 · 触发时间预览
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              连班增加「单日超 xx 小时视为加班日」
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">
            DEMO
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-4 scrollbar-hide">
        <section className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">快速切换演示</p>
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
                <p className="mt-0.5 max-w-[130px] text-[10px] text-muted-foreground">
                  {s.desc}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-xl border border-violet-200/60 bg-violet-50/50 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-violet-900">
            <strong>本次改动点：</strong>仅「连班」Tab 增加
            <strong> 加班日认定</strong>；单日、下班、周与正式版完全一致。
          </p>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">新建辛苦补贴 · 片段</h2>
          <div className="relative">
            <div className="absolute bottom-2 left-[18px] top-2 w-px bg-border" />
            <div className="space-y-4">
              <TimelineStepMock step="01" title="关怀对象" icon={Users} colorVar="--cat-3">
                <p className="rounded-xl bg-secondary/50 px-2.5 py-2 text-sm text-foreground">
                  全公司员工
                </p>
              </TimelineStepMock>

              <TimelineStepMock
                step="02"
                title="触发时间"
                icon={Clock}
                colorVar="--cat-7"
                highlight={isOvertime}
                editTrigger={
                  <WorkloadOvertimeTriggerEditor
                    value={triggerValue}
                    onChange={setTriggerValue}
                    trigger={<EditPencilBtn />}
                  />
                }
              >
                <WorkloadOvertimeTriggerEditor
                  value={triggerValue}
                  onChange={setTriggerValue}
                  trigger={
                    <button
                      type="button"
                      className="w-full rounded-xl bg-secondary/50 px-2.5 py-2.5 text-left transition-base active:scale-[0.99] hover:bg-secondary/70"
                    >
                      <p className="text-sm font-medium text-foreground">{summary.text}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{summary.sub}</p>
                    </button>
                  }
                />
              </TimelineStepMock>
            </div>
          </div>
        </section>

        <p className="rounded-xl border border-dashed border-border bg-secondary/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          正式入口（当前仍为旧版连班逻辑）：
          <Link
            to="/agents/humanity-care/workload/new"
            className="ml-1 font-medium text-primary"
          >
            新建辛苦补贴
          </Link>
        </p>
      </main>
    </div>
  );
};

function TimelineStepMock({
  step,
  title,
  icon: Icon,
  colorVar,
  highlight,
  editTrigger,
  children,
}: {
  step: string;
  title: string;
  icon: typeof Users;
  colorVar: string;
  highlight?: boolean;
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
      <div
        className={cn(
          "min-w-0 flex-1 rounded-2xl bg-card p-3 shadow-soft",
          highlight && "ring-1 ring-violet-300/60",
        )}
      >
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

function EditPencilBtn() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
      <Edit3 className="h-3.5 w-3.5" />
    </span>
  );
}

export default WorkloadOvertimeTriggerPrototype;
