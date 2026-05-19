import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  workloadTriggerCategories,
  type WorkloadTriggerState,
  type WorkloadTriggerKey,
} from "@/data/humanityCare";

type Props = {
  value: WorkloadTriggerState;
  onChange: (next: WorkloadTriggerState) => void;
  trigger: React.ReactNode;
};

export const WorkloadTriggerEditor = ({ value, onChange, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<WorkloadTriggerKey>(value.key);
  const [valueMap, setValueMap] = useState<Record<WorkloadTriggerKey, number | string>>(
    () => {
      const init = workloadTriggerCategories.reduce(
        (acc, c) => {
          acc[c.key] = c.defaultValue;
          return acc;
        },
        {} as Record<WorkloadTriggerKey, number | string>,
      );
      init[value.key] = value.value;
      return init;
    },
  );

  // 重新打开时同步外部值
  useEffect(() => {
    if (open) {
      setActiveKey(value.key);
      setValueMap((m) => ({ ...m, [value.key]: value.value }));
    }
  }, [open, value]);

  const activeCat = workloadTriggerCategories.find((c) => c.key === activeKey)!;
  const activeValue = valueMap[activeKey];
  const isPreset = activeCat.presets.includes(activeValue);

  const setActiveValue = (v: number | string) => {
    setValueMap((m) => ({ ...m, [activeKey]: v }));
  };

  const confirm = () => {
    onChange({ key: activeKey, value: valueMap[activeKey] });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl p-0">
        <div className="flex max-h-[85vh] flex-col">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle className="text-left text-base">
              选择触发条件
            </SheetTitle>
            <p className="text-left text-[11px] text-muted-foreground">
              选择一种类别和数值,满足条件即自动触达
            </p>
          </SheetHeader>

          {/* Tabs */}
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
                    className={`flex flex-1 min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-medium transition-base ${
                      active
                        ? "bg-card text-primary shadow-soft"
                        : "text-muted-foreground active:scale-95"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                    <span className="truncate">{cat.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active panel */}
          <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
            <div className="rounded-2xl border border-primary/40 bg-card p-4 shadow-soft">
              <div className="text-center text-[11px] text-muted-foreground">
                {activeCat.desc}
              </div>
              <div className="mt-2 text-center text-2xl font-bold text-foreground">
                {activeCat.formatValue(activeValue)}
              </div>

              {/* presets */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {activeCat.presets.map((p) => {
                  const selected = activeValue === p;
                  return (
                    <button
                      key={String(p)}
                      type="button"
                      onClick={() => setActiveValue(p)}
                      className={`flex-1 min-w-[60px] rounded-lg border px-2 py-2 text-xs font-medium transition-base ${
                        selected
                          ? "border-transparent bg-primary text-primary-foreground shadow-glow"
                          : "border-border bg-background text-foreground active:scale-95"
                      }`}
                    >
                      {p}
                      {activeCat.unit !== "时刻" && (
                        <span
                          className={`ml-0.5 text-[10px] ${
                            selected ? "opacity-80" : "text-muted-foreground"
                          }`}
                        >
                          {activeCat.unit === "小时" ? "h" : activeCat.unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* custom input */}
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2">
                <span className="text-xs text-muted-foreground">自定义</span>
                {activeCat.inputType === "number" ? (
                  <input
                    type="number"
                    min={activeCat.min}
                    max={activeCat.max}
                    value={typeof activeValue === "number" ? activeValue : ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isNaN(n)) return;
                      const clamped = Math.min(
                        activeCat.max ?? n,
                        Math.max(activeCat.min ?? n, n),
                      );
                      setActiveValue(clamped);
                    }}
                    placeholder={String(activeCat.defaultValue)}
                    className="flex-1 bg-transparent text-right text-sm font-medium text-foreground focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(activeValue)}
                    onChange={(e) => setActiveValue(e.target.value)}
                    placeholder="如 23:00 或 次日 00:30"
                    className="flex-1 bg-transparent text-right text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                )}
                <span className="text-xs text-muted-foreground">
                  {activeCat.unit}
                </span>
              </div>
              {!isPreset && activeCat.inputType === "number" && (
                <p className="mt-1 text-right text-[10px] text-muted-foreground">
                  范围 {activeCat.min}-{activeCat.max} {activeCat.unit}
                </p>
              )}
            </div>
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
