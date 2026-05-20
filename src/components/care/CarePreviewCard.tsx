import {
  Cake,
  Film,
  Gift,
  Sparkles,
  Umbrella,
  Sun,
  Snowflake,
  Wind,
  Moon,
  HandHeart,
  PartyPopper,
  Coins,
  type LucideIcon,
} from "lucide-react";
import type { CareType } from "@/data/humanityCare";

export type PreviewConfig = {
  icon: LucideIcon;
  emoji: string;
  tag: string;
  greeting: string;
  gradientFrom: string;
  gradientTo: string;
  ctaPrimary: string;
  perks: { label: string; icon: LucideIcon; color: string }[];
};

export const previewConfig: Record<CareType, PreviewConfig> = {
  birthday: {
    icon: Cake,
    emoji: "🎂",
    tag: "生日关怀 · 来自公司",
    greeting: "Hi 小李,生日快乐!",
    gradientFrom: "hsl(330 85% 62%)",
    gradientTo: "hsl(20 90% 60%)",
    ctaPrimary: "🎁 查收生日礼包",
    perks: [
      { label: "蛋糕券", icon: Cake, color: "--cat-7" },
      { label: "电影票", icon: Film, color: "--cat-4" },
    ],
  },
  festival: {
    icon: PartyPopper,
    emoji: "🧧",
    tag: "节日关怀 · 来自公司",
    greeting: "节日快乐,愿你温暖如常",
    gradientFrom: "hsl(0 80% 58%)",
    gradientTo: "hsl(35 90% 58%)",
    ctaPrimary: "🎁 领取节日礼包",
    perks: [
      { label: "节日礼包", icon: Gift, color: "--cat-4" },
      { label: "节日商城", icon: Sparkles, color: "--cat-1" },
    ],
  },
  weather: {
    icon: Umbrella,
    emoji: "☔",
    tag: "天气关怀 · 出行提醒",
    greeting: "今日天气提醒,请注意安全",
    gradientFrom: "hsl(210 75% 55%)",
    gradientTo: "hsl(190 70% 55%)",
    ctaPrimary: "通知已收到",
    perks: [
      { label: "防晒贴士", icon: Sun, color: "--cat-1" },
      { label: "保暖建议", icon: Snowflake, color: "--cat-9" },
      { label: "通勤指南", icon: Wind, color: "--cat-3" },
    ],
  },
  workload: {
    icon: Moon,
    emoji: "🌙",
    tag: "工作强度关怀 · 实时识别",
    greeting: "辛苦了,记得照顾自己",
    gradientFrom: "hsl(260 60% 55%)",
    gradientTo: "hsl(220 65% 50%)",
    ctaPrimary: "🎁 领取加班礼包",
    perks: [
      { label: "加班礼包", icon: Gift, color: "--cat-2" },
      { label: "夜宵福利", icon: HandHeart, color: "--cat-7" },
    ],
  },
};

type Props = {
  moduleType: CareType;
  content: string;
  points: number;
  pointName: string;
  hasPoints: boolean;
  /** compact = 用于列表的紧凑展示(隐藏底部 CTA & 福利栏) */
  compact?: boolean;
  timeLabel?: string;
  /** 是否显示底部「稍后」按钮 */
  showLaterButton?: boolean;
};

export const CarePreviewCard = ({
  moduleType,
  content,
  points,
  pointName,
  hasPoints,
  compact = false,
  timeLabel = "刚刚",
  showLaterButton = true,
}: Props) => {
  const cfg = previewConfig[moduleType];
  const Icon = cfg.icon;
  const showLater = showLaterButton && moduleType !== "birthday";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
      {/* 顶部:模拟 IM 会话条 */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-secondary/60 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
          <HandHeart className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-medium text-foreground">
            关怀与福利引擎
          </div>
        </div>
        <span className="rounded-full bg-background px-1.5 py-0.5 text-[9px] text-muted-foreground">
          {timeLabel}
        </span>
      </div>

      {/* Hero 区 */}
      <div
        className={`relative overflow-hidden text-primary-foreground ${
          compact ? "px-3 pb-2.5 pt-3" : "px-4 pb-3 pt-4"
        }`}
        style={{
          background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`,
        }}
      >
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-2 h-16 w-16 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute right-2 top-1 select-none text-3xl opacity-30">
          {cfg.emoji}
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/25 backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[11px] font-medium opacity-95">{cfg.tag}</span>
        </div>
        <div
          className={`relative z-10 mt-2 font-bold leading-snug ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {cfg.greeting}
        </div>
        <p
          className={`relative z-10 mt-1 leading-relaxed opacity-95 ${
            compact ? "line-clamp-2 text-[11px]" : "text-[11px]"
          }`}
        >
          {content}
        </p>
      </div>

      {/* 积分/慰问条 */}
      {hasPoints && points > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 dark:from-amber-950/40 dark:to-orange-950/40">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Coins className="h-3 w-3" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-foreground">
                {pointName}
              </div>
              <div className="text-[9px] text-muted-foreground">
                点击查收即可入账
              </div>
            </div>
          </div>
          <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            +{points}
          </span>
        </div>
      )}

      {!compact && cfg.perks.length > 0 && (
        <div className="px-3 py-2.5">
          <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">
            为你准备的福利
          </div>
          <div className="flex gap-1.5">
            {cfg.perks.map((p) => {
              const PI = p.icon;
              return (
                <div
                  key={p.label}
                  className="flex flex-1 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-1.5"
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                    style={{
                      background: `hsl(var(${p.color}) / 0.15)`,
                      color: `hsl(var(${p.color}))`,
                    }}
                  >
                    <PI className="h-3 w-3" />
                  </div>
                  <span className="truncate text-[10px] font-medium text-foreground">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!compact && (
        <div
          className={`flex items-center border-t border-border/50 px-3 py-2 ${
            showLater ? "gap-2" : ""
          }`}
        >
          <button
            className={`rounded-full py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm ${
              showLater ? "flex-1" : "w-full"
            }`}
            style={{
              background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`,
            }}
          >
            {cfg.ctaPrimary}
          </button>
          {showLater && (
            <button className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
              稍后
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CarePreviewCard;
