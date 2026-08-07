import { useState } from "react";
import { Edit3, Sparkles, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { careModules, type CareRule, type CareType } from "@/data/humanityCare";
import { cn } from "@/lib/utils";

export const carePointLabels: Record<CareType, string> = {
  birthday: "生日慰问金",
  festival: "节日慰问金",
  weather: "关怀提示",
  workload: "辛苦补贴",
};

type CareRuleCardProps = {
  rule: CareRule;
  enabled: boolean;
  onToggle?: (next: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  /** 默认 li；聊天内用 div */
  as?: "li" | "div";
  /** 是否显示编辑/删除等操作按钮，默认 true */
  showActions?: boolean;
};

export const CareRuleCard = ({
  rule,
  enabled,
  onToggle,
  onEdit,
  onDelete,
  className,
  as = "li",
  showActions = true,
}: CareRuleCardProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const moduleType = rule.type;
  const mod = careModules[moduleType];
  const Icon = mod.icon;
  const checkRate = (85 + (rule.reached % 12)).toFixed(1);
  const Wrapper = as;
  const interactive = showActions && !!onEdit;

  return (
    <Wrapper
      className={cn(
        "rounded-2xl bg-card p-3.5 shadow-soft transition-base",
        interactive && "active:scale-[0.99]",
        enabled ? "" : "opacity-75",
        className,
      )}
      onClick={interactive ? onEdit : undefined}
      role={interactive ? "button" : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-soft"
          style={{
            background: enabled
              ? `linear-gradient(135deg, hsl(var(${mod.colorVar})), hsl(var(${mod.colorVar}) / 0.75))`
              : `hsl(var(--muted))`,
            color: enabled ? "white" : `hsl(var(--muted-foreground))`,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  enabled ? "bg-emerald-500" : "bg-muted-foreground/40"
                }`}
              />
              <h4
                className={`truncate text-sm font-semibold ${
                  enabled ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {rule.name}
              </h4>
            </div>
            {showActions && onToggle ? (
              <label
                className="flex shrink-0 cursor-pointer items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={enabled}
                  onCheckedChange={onToggle}
                  aria-label={enabled ? "停用方案" : "启用方案"}
                />
                <span
                  className={`text-[11px] font-medium ${
                    enabled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {enabled ? "已启用" : "已停用"}
                </span>
              </label>
            ) : (
              <span
                className={`shrink-0 text-[11px] font-medium ${
                  enabled
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                {enabled ? "已启用" : "已停用"}
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="truncate max-w-[55%]">{rule.audience}</span>
            <span className="shrink-0">· {rule.triggerTime}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {rule.points > 0 ? (
          <div
            className="rounded-lg p-2 text-center"
            style={{ backgroundColor: `hsl(var(${mod.colorVar}) / 0.1)` }}
          >
            <div
              className="truncate text-[10px]"
              style={{ color: `hsl(var(${mod.colorVar}))` }}
            >
              {carePointLabels[moduleType]}
            </div>
            <div
              className="mt-0.5 text-sm font-bold"
              style={{ color: `hsl(var(${mod.colorVar}))` }}
            >
              +{rule.points}
              <span className="ml-0.5 text-[10px] font-normal">积分</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-secondary p-2 text-center">
            <div className="text-[10px] text-muted-foreground">类型</div>
            <div className="mt-0.5 text-sm font-bold text-foreground">仅提醒</div>
          </div>
        )}
        <div className="rounded-lg bg-secondary/60 p-2 text-center">
          <div className="text-[10px] text-muted-foreground">已触达</div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {rule.reached.toLocaleString()}
            <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
              人次
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-secondary/60 p-2 text-center">
          <div className="text-[10px] text-muted-foreground">查收率</div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {checkRate}
            <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {showActions && (
        <div
          className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {moduleType === "weather" ? (
            enabled ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium"
                style={{ color: `hsl(var(${mod.colorVar}))` }}
              >
                <Sparkles className="h-3 w-3" />
                每日触发
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/60">已停用</span>
            )
          ) : enabled && rule.reached > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: `hsl(var(${mod.colorVar}))` }}
            >
              <Sparkles className="h-3 w-3" />
              {(rule.reached % 12) + 1}h 前触达
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/60">
              {enabled ? "暂无触达" : "已停用"}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-base hover:bg-secondary/80 active:scale-95"
            >
              <Edit3 className="h-3 w-3" /> 编辑
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive transition-base hover:bg-destructive/15 active:scale-95"
            >
              <Trash2 className="h-3 w-3" /> 删除
            </button>
          </div>
        </div>
      )}

      {showActions && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>删除「{rule.name}」?</AlertDialogTitle>
              <AlertDialogDescription>
                删除后该方案将立即停止触达,历史数据仍会保留,但操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Wrapper>
  );
};
