import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEM_H = 44;
const WHEEL_PAD = 2;

/** ISO YYYY-MM-DD → 2025年5月19日 */
export const formatMobileDate = (iso: string | undefined) => {
  if (!iso) return "请选择日期";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "请选择日期";
  return `${y}年${m}月${d}日`;
};

/** MM-DD → 5月19日 */
export const formatMobileMonthDay = (md: string | undefined) => {
  if (!md) return "请选择日期";
  const [m, d] = md.split("-").map(Number);
  if (!m || !d) return "请选择日期";
  return `${m}月${d}日`;
};

export type MobileDateMode = "date" | "month-day";

const parseIso = (iso?: string) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
};

const parseMd = (md?: string) => {
  if (!md) return null;
  const [m, d] = md.split("-").map(Number);
  if (!m || !d) return null;
  return { m, d };
};

const toIso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const toMd = (m: number, d: number) =>
  `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
/** 月日模式用闰年，保证 2 月可选到 29 */
const MD_REF_YEAR = 2024;

const clampYmd = (
  y: number,
  m: number,
  d: number,
  min?: string,
  max?: string,
) => {
  const minP = parseIso(min);
  const maxP = parseIso(max);
  let cy = y;
  let cm = m;
  let cd = Math.min(d, daysInMonth(y, m));

  const iso = toIso(cy, cm, cd);
  if (minP && iso < toIso(minP.y, minP.m, minP.d)) {
    cy = minP.y;
    cm = minP.m;
    cd = minP.d;
  }
  if (maxP && iso > toIso(maxP.y, maxP.m, maxP.d)) {
    cy = maxP.y;
    cm = maxP.m;
    cd = maxP.d;
  }
  return { y: cy, m: cm, d: cd };
};

type WheelColumnProps = {
  items: number[];
  value: number;
  onChange: (v: number) => void;
  unit: string;
  scrollKey: string;
};

const WheelColumn = ({
  items,
  value,
  onChange,
  unit,
  scrollKey,
}: WheelColumnProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();

  const scrollToValue = useCallback(
    (v: number, behavior: ScrollBehavior = "auto") => {
      const el = ref.current;
      if (!el) return;
      const idx = items.indexOf(v);
      if (idx < 0) return;
      el.scrollTo({ top: idx * ITEM_H, behavior });
    },
    [items],
  );

  useEffect(() => {
    scrollToValue(value);
  }, [scrollKey, value, scrollToValue]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const next = items[clamped];
      if (next !== undefined && next !== value) onChange(next);
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
    }, 80);
  };

  return (
    <div className="relative h-[220px] flex-1 overflow-hidden touch-pan-y">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth scrollbar-hide"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ height: ITEM_H * WHEEL_PAD }} aria-hidden />
        {items.map((n) => (
          <div
            key={n}
            className={cn(
              "flex items-center justify-center text-base transition-colors",
              n === value
                ? "font-semibold text-foreground"
                : "text-muted-foreground",
            )}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
          >
            {n}
            {unit}
          </div>
        ))}
        <div style={{ height: ITEM_H * WHEEL_PAD }} aria-hidden />
      </div>
    </div>
  );
};

type DateWheelModalProps = {
  open: boolean;
  title: string;
  value: string;
  min?: string;
  max?: string;
  /** date = 年月日；month-day = 仅月日 */
  mode?: MobileDateMode;
  onConfirm: (value: string) => void;
  onOpenChange: (open: boolean) => void;
};

const DateWheelModal = ({
  open,
  title,
  value,
  min,
  max,
  mode = "date",
  onConfirm,
  onOpenChange,
}: DateWheelModalProps) => {
  const today = new Date();
  const monthDayOnly = mode === "month-day";
  const minP = monthDayOnly ? null : parseIso(min);
  const maxP = monthDayOnly ? null : parseIso(max);
  const startYear = minP?.y ?? today.getFullYear() - 2;
  const endYear = maxP?.y ?? today.getFullYear() + 5;

  const initial = useMemo(() => {
    if (monthDayOnly) {
      const md = parseMd(value);
      const m = md?.m ?? today.getMonth() + 1;
      const d = Math.min(
        md?.d ?? today.getDate(),
        daysInMonth(MD_REF_YEAR, m),
      );
      return { y: MD_REF_YEAR, m, d };
    }
    const p = parseIso(value) ?? {
      y: today.getFullYear(),
      m: today.getMonth() + 1,
      d: today.getDate(),
    };
    return clampYmd(p.y, p.m, p.d, min, max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, monthDayOnly]);

  const [y, setY] = useState(initial.y);
  const [m, setM] = useState(initial.m);
  const [d, setD] = useState(initial.d);

  useEffect(() => {
    if (!open) return;
    if (monthDayOnly) {
      setY(MD_REF_YEAR);
      setM(initial.m);
      setD(initial.d);
      return;
    }
    const next = clampYmd(initial.y, initial.m, initial.d, min, max);
    setY(next.y);
    setM(next.m);
    setD(next.d);
  }, [open, initial.y, initial.m, initial.d, min, max, monthDayOnly]);

  const years = useMemo(
    () =>
      Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    [startYear, endYear],
  );

  const months = useMemo(() => {
    if (monthDayOnly) {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
    let from = 1;
    let to = 12;
    if (minP && y === minP.y) from = minP.m;
    if (maxP && y === maxP.y) to = maxP.m;
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [y, minP, maxP, monthDayOnly]);

  const days = useMemo(() => {
    const yearForDays = monthDayOnly ? MD_REF_YEAR : y;
    const maxD = daysInMonth(yearForDays, m);
    if (monthDayOnly) {
      return Array.from({ length: maxD }, (_, i) => i + 1);
    }
    let from = 1;
    let to = maxD;
    if (minP && y === minP.y && m === minP.m) from = minP.d;
    if (maxP && y === maxP.y && m === maxP.m) to = maxP.d;
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [y, m, minP, maxP, monthDayOnly]);

  useEffect(() => {
    if (!months.includes(m)) setM(months[0] ?? 1);
  }, [months, m]);

  useEffect(() => {
    if (!days.includes(d)) setD(days[days.length - 1] ?? 1);
  }, [days, d]);

  const wheelKey = `${open}-${monthDayOnly ? "md" : y}-${m}`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300"
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm text-muted-foreground active:opacity-70"
            >
              取消
            </button>
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <button
              type="button"
              onClick={() => {
                onConfirm(monthDayOnly ? toMd(m, d) : toIso(y, m, d));
                onOpenChange(false);
              }}
              className="text-sm font-semibold text-primary active:opacity-70"
            >
              确定
            </button>
          </div>

          <div className="relative flex px-2 touch-pan-y">
            <div
              className="pointer-events-none absolute inset-x-4 top-1/2 z-0 h-11 -translate-y-1/2 rounded-lg bg-secondary/80"
              aria-hidden
            />
            {!monthDayOnly && (
              <WheelColumn
                items={years}
                value={y}
                onChange={setY}
                unit="年"
                scrollKey={`y-${wheelKey}`}
              />
            )}
            <WheelColumn
              items={months}
              value={m}
              onChange={setM}
              unit="月"
              scrollKey={`m-${wheelKey}`}
            />
            <WheelColumn
              items={days}
              value={d}
              onChange={setD}
              unit="日"
              scrollKey={`d-${wheelKey}-${days.length}`}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

type MobileDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** date = 年月日（默认）；month-day = 仅月日，值为 MM-DD */
  mode?: MobileDateMode;
  className?: string;
};

/**
 * 移动端日期：点击行 → 底部蒙层 + 年/月/日滚轮（Radix Dialog 嵌套，避免 Sheet 拦截点击）。
 * mode="month-day" 时只滚月日，值为 MM-DD。
 */
export const MobileDateField = ({
  label,
  value,
  onChange,
  min,
  max,
  mode = "date",
  className,
}: MobileDateFieldProps) => {
  const [open, setOpen] = useState(false);
  const display =
    mode === "month-day" ? formatMobileMonthDay(value) : formatMobileDate(value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-3 text-left active:bg-secondary/60",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">
              {label}
            </span>
            <span
              className={cn(
                "block truncate text-sm font-medium",
                value ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {display}
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <DateWheelModal
        open={open}
        title={label}
        value={value}
        min={min}
        max={max}
        mode={mode}
        onOpenChange={setOpen}
        onConfirm={onChange}
      />
    </>
  );
};
