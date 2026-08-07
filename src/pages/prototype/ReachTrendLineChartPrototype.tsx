import { addDays, addMonths, format } from "date-fns";
import { TrendingUp } from "lucide-react";

type ChartPoint = { label: string; value: number };

const COLOR = "hsl(var(--cat-7))";
const COLOR_FILL = "hsl(var(--cat-7) / 0.12)";

const fmtMd = (d: Date) => format(d, "M/d");
const fmtYearMonth = (d: Date) => format(d, "yy年M月");
const fmtWeekRange = (start: Date, end: Date) => `${fmtMd(start)}~${fmtMd(end)}`;

/** 将约 70% 的数据点置为 0（均匀分布） */
const sparseZeros = (data: number[]): number[] => {
  const n = data.length;
  const zeroCount = Math.round(n * 0.7);
  const step = n / zeroCount;
  const zeroIdx = new Set<number>();
  for (let k = 0; k < zeroCount; k++) {
    zeroIdx.add(Math.min(n - 1, Math.floor(k * step)));
  }
  return data.map((v, i) => (zeroIdx.has(i) ? 0 : v));
};

const sum = (data: number[]) => data.reduce((a, b) => a + b, 0);

const buildDaily14 = (): ChartPoint[] => {
  const start = new Date(2026, 5, 1); // 2026-06-01
  const base = [42, 56, 38, 71, 84, 95, 63, 58, 72, 49, 66, 81, 54, 77];
  return base.map((value, i) => ({
    label: fmtMd(addDays(start, i)),
    value,
  }));
};

const aggregateByWeek = (
  daily: { date: Date; value: number }[],
): ChartPoint[] => {
  const weeks: ChartPoint[] = [];
  for (let w = 0; w * 7 < daily.length; w++) {
    const slice = daily.slice(w * 7, (w + 1) * 7);
    if (!slice.length) break;
    weeks.push({
      label: fmtWeekRange(slice[0].date, slice[slice.length - 1].date),
      value: slice.reduce((a, b) => a + b.value, 0),
    });
  }
  return weeks;
};

const buildWeekly30 = (): ChartPoint[] => {
  const start = new Date(2026, 4, 1); // 2026-05-01
  const values = [
    12, 18, 15, 22, 19, 25, 14, 16, 20, 17, 23, 21, 13, 19,
    24, 18, 16, 22, 20, 26, 15, 17, 21, 19, 23, 18, 14, 20, 22, 16,
  ];
  const daily = values.map((value, i) => ({
    date: addDays(start, i),
    value,
  }));
  return aggregateByWeek(daily);
};

const buildMonthly12 = (): ChartPoint[] => {
  const start = new Date(2026, 0, 1); // 2026-01-01
  const values = [320, 285, 410, 398, 452, 380, 365, 420, 390, 445, 410, 480];
  return values.map((value, i) => ({
    label: fmtYearMonth(addMonths(start, i)),
    value,
  }));
};

const ReachTrendLineChart = ({
  title,
  points,
}: {
  title?: string;
  points: ChartPoint[];
}) => {
  const data = points.map((p) => p.value);
  const labels = points.map((p) => p.label);
  const total = sum(data);
  const max = Math.max(...data, 1);

  const labelFontSize = labels.some((l) => l.length > 6) ? 7 : 8;
  const W = 320;
  const padX = 12;
  const padTop = 18;
  const padBottom = 36;
  const plotH = 64;
  const H = padTop + plotH + padBottom;
  const plotW = W - padX * 2;
  const labelY = padTop + plotH + 4;
  const labelRotate = -40;

  const coords = data.map((v, i) => {
    const x = padX + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = padTop + plotH - (v / max) * plotH;
    return { x, y, v };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)}` +
    ` L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

  return (
    <section className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {title ?? "触达趋势"}
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground">总计 {total}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`触达趋势折线图，总计 ${total}`}
      >
        <path d={areaPath} fill={COLOR_FILL} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={3} fill={COLOR} stroke="white" strokeWidth={1.5} />
            <text
              x={c.x}
              y={Math.max(10, c.y - 6)}
              textAnchor="middle"
              className="fill-foreground text-[9px] font-semibold"
              style={{ fontSize: 9 }}
            >
              {c.v}
            </text>
            <text
              x={c.x}
              y={labelY}
              textAnchor="end"
              transform={`rotate(${labelRotate}, ${c.x}, ${labelY})`}
              className="fill-muted-foreground"
              style={{ fontSize: labelFontSize }}
            >
              {labels[i]}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
};

const ChartBlock = ({
  heading,
  points,
  sparsePoints,
}: {
  heading: string;
  points: ChartPoint[];
  sparsePoints: ChartPoint[];
}) => (
  <div className="space-y-3">
    <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
    <ReachTrendLineChart title="触达趋势 · 正常数据" points={points} />
    <ReachTrendLineChart title="触达趋势 · 70% 为零" points={sparsePoints} />
  </div>
);

const ReachTrendLineChartPrototype = () => {
  const daily14 = buildDaily14();
  const weekly30 = buildWeekly30();
  const monthly12 = buildMonthly12();

  const sparseDaily14 = daily14.map((p, i) => ({
    ...p,
    value: sparseZeros(daily14.map((d) => d.value))[i],
  }));
  const sparseWeekly30 = weekly30.map((p, i) => ({
    ...p,
    value: sparseZeros(weekly30.map((d) => d.value))[i],
  }));
  const sparseMonthly12 = monthly12.map((p, i) => ({
    ...p,
    value: sparseZeros(monthly12.map((d) => d.value))[i],
  }));

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-background px-3 py-4">
      <h1 className="mb-1 text-base font-bold text-foreground">触达趋势折线图 · 原型</h1>
      <p className="mb-4 text-[11px] text-muted-foreground">
        14 天按天（如 6/1）· 30 天按周（如 5/1~5/7）· 1 年按月（如 26年1月）
      </p>
      <div className="space-y-8">
        <ChartBlock
          heading="14 天（横坐标按天）"
          points={daily14}
          sparsePoints={sparseDaily14}
        />
        <ChartBlock
          heading="30 天（横坐标按周聚合）"
          points={weekly30}
          sparsePoints={sparseWeekly30}
        />
        <ChartBlock
          heading="1 年（横坐标按月聚合）"
          points={monthly12}
          sparsePoints={sparseMonthly12}
        />
      </div>
    </div>
  );
};

export default ReachTrendLineChartPrototype;
