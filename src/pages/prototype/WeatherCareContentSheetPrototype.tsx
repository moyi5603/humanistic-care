import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  Heart,
  Users,
} from "lucide-react";
import {
  weatherTriggerCategories,
  defaultWeatherTrigger,
  summarizeWeather,
  summarizeWeatherContent,
  countWeatherContentReady,
  truncateCarePreviewText,
  aiWeatherContentVariants,
  type WeatherContentMap,
  type WeatherTriggerState,
} from "@/data/humanityCare";
import { WeatherTriggerEditor } from "@/components/care/WeatherTriggerEditor";
import { WeatherCareContentSheetEditor } from "@/components/care/WeatherCareContentSheetEditor";
import { cn } from "@/lib/utils";

const initialTrigger: WeatherTriggerState = {
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
};

const initialContents: WeatherContentMap = {
  extremeHeat: { selected: aiWeatherContentVariants.extremeHeat[0] },
};

const WeatherCareContentSheetPrototype = () => {
  const [trigger, setTrigger] = useState<WeatherTriggerState>(initialTrigger);
  const [contents, setContents] = useState<WeatherContentMap>(initialContents);

  const weatherSummary = summarizeWeather(trigger);
  const contentSummary = summarizeWeatherContent(trigger, contents);
  const readyCount = countWeatherContentReady(trigger, contents);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            to="/agents/humanity-care/weather/new"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-base active:scale-90 hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-foreground">
              关怀内容 · Tab 弹层预览
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              点击 STEP 03 打开弹层，顶部天气 Tab 切换配置
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">
            新方案
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-4 scrollbar-hide">
        <section className="mb-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">策略全景（片段）</h2>
          <div className="relative">
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              <TimelineStepMock step="01" title="关怀对象" icon={Users} colorVar="--cat-3">
                <p className="rounded-xl bg-secondary/50 px-2.5 py-2 text-sm text-foreground">
                  全公司员工
                </p>
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
                <p className="rounded-xl bg-secondary/50 px-2.5 py-2 text-sm text-foreground">
                  {weatherSummary.text}
                </p>
                <p className="mt-0.5 px-2.5 text-[11px] text-muted-foreground">
                  {weatherSummary.sub}
                </p>
              </TimelineStepMock>

              <TimelineStepMock step="03" title="关怀内容" icon={Heart} colorVar="--cat-9">
                <WeatherCareContentSheetEditor
                  trigger={trigger}
                  contents={contents}
                  onChange={setContents}
                  triggerNode={
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-xl bg-secondary/60 px-2.5 py-2.5 text-left transition-base active:scale-[0.99] hover:bg-secondary"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            contentSummary.text === "未配置触达文案"
                              ? "text-muted-foreground"
                              : "text-foreground",
                          )}
                        >
                          {contentSummary.text === "未配置触达文案"
                            ? "请点击配置各场景触达文案"
                            : truncateCarePreviewText(contentSummary.text, 36)}
                        </p>
                        {contentSummary.sub && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {contentSummary.sub}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  }
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

        <section className="mb-4 rounded-xl border border-border bg-card p-3 shadow-soft">
          <h3 className="text-xs font-semibold text-foreground">交互说明</h3>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <li>· 弹层顶部 4×2 天气 Tab，样式与「触发条件」一致</li>
            <li>· 灰点 = 未启用；绿点 = 已启用且已配置文案</li>
            <li>· 切换 Tab 自动保存当前场景草稿，确定后写回列表</li>
            <li>· 未启用场景仅提示，需在触发条件中先开启</li>
          </ul>
        </section>

        <p className="text-[11px] text-muted-foreground">
          旧版列表：
          <Link
            to="/prototype/weather-care-content"
            className="ml-1 font-medium text-primary"
          >
            关怀内容列表方案
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

function EditPencilBtn() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
      <Edit3 className="h-3.5 w-3.5" />
    </span>
  );
}

export default WeatherCareContentSheetPrototype;
