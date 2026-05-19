import { useState } from "react";
import { CheckCircle2, HandHeart, Sparkles } from "lucide-react";
import { careModules, type CareType } from "@/data/humanityCare";
import { CarePreviewCard, previewConfig } from "./CarePreviewCard";
import { CareReceiveAnimation } from "./CareReceiveAnimation";

type Props = {
  moduleType: CareType;
  content: string;
  points: number;
  pointName: string;
  hasPoints: boolean;
};

const promptByType: Record<CareType, string> = {
  birthday: "你收到一份「生日关怀」🎂",
  festival: "你收到一份「节日关怀」🧧",
  weather: "你收到一条「天气出行提醒」☔",
  workload: "你收到一份「辛苦补贴关怀」🌙",
};

/**
 * 模拟「关怀与福利引擎」IM 会话:Bot 提示语 + 可点击关怀卡片 + 炫酷查收动画
 */
export const CareReceiveSimulator = ({
  moduleType,
  content,
  points,
  pointName,
  hasPoints,
}: Props) => {
  const mod = careModules[moduleType];
  const cfg = previewConfig[moduleType];
  const [received, setReceived] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleCardClick = () => {
    if (received || animating) return;
    setAnimating(true);
  };

  const handleAnimDone = () => {
    setAnimating(false);
    setReceived(true);
  };

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--secondary))]">
      {/* IM 时间分隔 */}
      <div className="flex justify-center px-4 pt-4">
        <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[10px] text-muted-foreground">
          今天 · 刚刚
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-6 pt-3 scrollbar-hide">
        {/* Bot 提示气泡 */}
        <div className="flex items-end gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`,
            }}
          >
            <HandHeart className="h-4 w-4" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-[13px] leading-relaxed text-foreground shadow-soft">
            <div className="font-medium">{promptByType[moduleType]}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              点击下方卡片完成查收 ↓
            </div>
          </div>
        </div>

        {/* Bot 发送的关怀卡片 */}
        <div className="flex items-end gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
          <div className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={handleCardClick}
              disabled={received}
              className="block w-full text-left transition-transform active:scale-[0.98] disabled:active:scale-100"
            >
              <CarePreviewCard
                moduleType={moduleType}
                content={content}
                points={points}
                pointName={pointName}
                hasPoints={hasPoints}
              />
              {!received && (
                <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>轻点卡片查收</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 已查收 状态条 */}
        {received && (
          <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`,
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-3 py-2.5 shadow-soft">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <span>✅ 查收成功</span>
              </div>
              {hasPoints && points > 0 ? (
                <div className="mt-1 text-[12px] text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {pointName} +{points}
                  </span>{" "}
                  已自动入账,可在「我的钱包」查看
                </div>
              ) : (
                <div className="mt-1 text-[12px] text-muted-foreground">
                  关怀已送达,愿你被温柔以待 💛
                </div>
              )}
              {cfg.perks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cfg.perks.map((p) => (
                    <span
                      key={p.label}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground"
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CareReceiveAnimation
        moduleType={moduleType}
        active={animating}
        onDone={handleAnimDone}
      />
      {/* 隐藏的 mod 引用消除未使用警告 */}
      <span className="sr-only">{mod.name}</span>
    </div>
  );
};

export default CareReceiveSimulator;
