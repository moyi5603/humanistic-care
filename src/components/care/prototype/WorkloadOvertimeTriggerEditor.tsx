import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  workloadTriggerCategories,
  summarizeWorkload,
  type WorkloadTriggerKey,
  type WorkloadTriggerState,
} from "@/data/humanityCare";
import { WorkloadTriggerValuePanel } from "@/components/care/WorkloadTriggerValuePanel";
import { cn } from "@/lib/utils";

/** 连班触发：连续天数 + 单日超时时长视为 1 个加班日 */
export type OvertimeDaysTriggerConfig = {
  consecutiveDays: number;
  dailyHoursAsOvertime: number;
};

export type WorkloadTriggerPrototypeValue =
  | { kind: "standard"; state: WorkloadTriggerState }
  | { kind: "overtimeDays"; config: OvertimeDaysTriggerConfig };

const DAY_PRESETS = [2, 3, 5, 7] as const;
const HOUR_PRESETS = [8, 10, 12, 14] as const;

export const defaultOvertimeDaysConfig: OvertimeDaysTriggerConfig = {
  consecutiveDays: 3,
  dailyHoursAsOvertime: 10,
};

export const summarizeWorkloadPrototype = (
  value: WorkloadTriggerPrototypeValue,
): { text: string; sub: string } => {
  if (value.kind === "overtimeDays") {
    const { consecutiveDays, dailyHoursAsOvertime } = value.config;
    return {
      text: `连续加班 ≥ ${consecutiveDays} 天`,
      sub: `单日工作 ≥ ${dailyHoursAsOvertime} 小时视为 1 个加班日`,
    };
  }
  return summarizeWorkload(value.state);
};

type Props = {
  value: WorkloadTriggerPrototypeValue;
  onChange: (next: WorkloadTriggerPrototypeValue) => void;
  trigger: React.ReactNode;
};

/** 原型：仅「连班」Tab 为新交互，单日/下班/周与正式版一致 */
export const WorkloadOvertimeTriggerEditor = ({
  value,
  onChange,
  trigger,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<WorkloadTriggerKey>(
    value.kind === "overtimeDays" ? "overtimeDays" : value.state.key,
  );
  const [valueMap, setValueMap] = useState<Record<WorkloadTriggerKey, number | string>>(
    () => {
      const init = workloadTriggerCategories.reduce(
        (acc, c) => {
          acc[c.key] = c.defaultValue;
          return acc;
        },
        {} as Record<WorkloadTriggerKey, number | string>,
      );
      if (value.kind === "standard") {
        init[value.state.key] = value.state.value;
      }
      return init;
    },
  );
  const [overtimeConfig, setOvertimeConfig] = useState<OvertimeDaysTriggerConfig>(
    value.kind === "overtimeDays" ? value.config : defaultOvertimeDaysConfig,
  );

  useEffect(() => {
    if (!open) return;
    if (value.kind === "overtimeDays") {
      setActiveKey("overtimeDays");
      setOvertimeConfig(value.config);
    } else {
      setActiveKey(value.state.key);
      setValueMap((m) => ({ ...m, [value.state.key]: value.state.value }));
    }
  }, [open, value]);

  const activeCat = workloadTriggerCategories.find((c) => c.key === activeKey)!;
  const activeValue = valueMap[activeKey];
  const isOvertimeTab = activeKey === "overtimeDays";

  const setActiveValue = (v: number | string) => {
    setValueMap((m) => ({ ...m, [activeKey]: v }));
  };

  const setOvertimeDays = (days: number) => {
    setOvertimeConfig((c) => ({ ...c, consecutiveDays: days }));
  };

  const setDailyHours = (hours: number) => {
    setOvertimeConfig((c) => ({ ...c, dailyHoursAsOvertime: hours }));
  };

  const confirm = () => {
    if (isOvertimeTab) {
      onChange({ kind: "overtimeDays", config: overtimeConfig });
    } else {
      onChange({
        kind: "standard",
        state: { key: activeKey, value: valueMap[activeKey] },
      });
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl p-0">
        <div className="flex max-h-[88vh] flex-col">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle className="text-left text-base">选择触发条件</SheetTitle>
            <p className="text-left text-[11px] text-muted-foreground">
              选择一种类别和数值,满足条件即自动触达
            </p>
          </SheetHeader>

          <div className="mt-3 px-4">
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-secondary/60 p-1 scrollbar-hide">
              {workloadTriggerCategories.map((cat) => {
                const Icon = cat.icon;
                const active = cat.key === activeKey;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveKey(cat.key)}
                    className={cn(
                      "flex min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-medium transition-base",
                      active
                        ? "bg-card text-primary shadow-soft"
                        : "text-muted-foreground active:scale-95",
                      cat.key === "overtimeDays" && "relative",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                    <span className="truncate">{cat.short}</span>
                    {cat.key === "overtimeDays" && (
                      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
            {isOvertimeTab ? (
              <OvertimeDaysPanel
                config={overtimeConfig}
                onDaysChange={setOvertimeDays}
                onHoursChange={setDailyHours}
              />
            ) : (
              <WorkloadTriggerValuePanel
                cat={activeCat}
                value={activeValue}
                onChange={setActiveValue}
              />
            )}
          </div>

          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={confirm}
              className="w-full rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-base active:scale-95"
            >
              确定
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

function OvertimeDaysPanel({
  config,
  onDaysChange,
  onHoursChange,
}: {
  config: OvertimeDaysTriggerConfig;
  onDaysChange: (days: number) => void;
  onHoursChange: (hours: number) => void;
}) {
  const cat = workloadTriggerCategories.find((c) => c.key === "overtimeDays")!;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/40 bg-card p-4 shadow-soft">
        <p className="text-center text-[11px] text-muted-foreground">{cat.desc}</p>
        <p className="mt-2 text-center text-2xl font-bold text-foreground">
          连续 ≥ {config.consecutiveDays} 天
        </p>
        <OvertimePresetRow
          label="连续天数"
          unit="天"
          presets={DAY_PRESETS}
          value={config.consecutiveDays}
          min={1}
          max={14}
          onChange={onDaysChange}
        />
      </div>

      <div className="rounded-2xl border border-amber-300/50 bg-amber-50/40 p-4 shadow-soft">
        <p className="text-xs font-semibold text-amber-900">加班日认定</p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-900/80">
          单日工作超设定时长，计为 1 个「加班日」；再统计是否连续达到天数阈值。
        </p>
        <p className="mt-3 text-center text-xl font-bold text-foreground">
          单日 ≥ {config.dailyHoursAsOvertime} 小时
        </p>
        <p className="text-center text-[11px] text-muted-foreground">视为 1 个加班日</p>
        <OvertimePresetRow
          label="认定阈值"
          unit="小时"
          presets={HOUR_PRESETS}
          value={config.dailyHoursAsOvertime}
          min={6}
          max={16}
          onChange={onHoursChange}
        />
      </div>
    </div>
  );
}

/** 连班专用数值行（与正式版单日/周面板分离，避免影响现有 Tab） */
function OvertimePresetRow({
  label,
  unit,
  presets,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  presets: readonly number[];
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <p className="mt-4 text-[10px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const selected = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                "min-w-[60px] flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-base",
                selected
                  ? "border-transparent bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-background text-foreground active:scale-95",
              )}
            >
              {p}
              <span
                className={cn(
                  "ml-0.5 text-[10px]",
                  selected ? "opacity-80" : "text-muted-foreground",
                )}
              >
                {unit === "小时" ? "h" : "天"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2">
        <span className="text-xs text-muted-foreground">自定义</span>
        <input
          type="number"
          min={min}
          max={max}
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return;
            onChange(Math.min(max ?? n, Math.max(min ?? n, n)));
          }}
          className="flex-1 bg-transparent text-right text-sm font-medium text-foreground focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </>
  );
}
