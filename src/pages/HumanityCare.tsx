import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Sparkles,
  HandHeart,
  TrendingUp,
  Users,
  Bell,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  careModuleList,
  defaultStatsTimeRange,
  statsTimeRangeScale,
  summarizeStatsTimeRange,
  type CareType,
  type StatsTimeRange,
} from "@/data/humanityCare";
import { useCareRules } from "@/data/careRulesStore";
import {
  StatsTimeRangeBar,
  StatsTimeRangePicker,
} from "@/components/care/StatsTimeRangePicker";
import ChatInputBar from "@/components/agent/ChatInputBar";
import {
  HumanityCareAgentChat,
  type CareChatMessage,
} from "@/components/care/HumanityCareAgentChat";
import {
  dispatchHumanityCareAgent,
  type AgentAction,
  type PendingSession,
} from "@/lib/humanityCareAgent";

let msgCounter = 0;
const nextMsgId = () => `hc-msg-${++msgCounter}`;

type Prompt = {
  text: string;
  type: CareType;
  /** action: new = 跳转新建页; detail = 模块详情; chat = 发送给 Agent */
  action?: "new" | "detail" | "chat";
  query?: Record<string, string>;
};

const promptGroups: { title: string; prompts: Prompt[] }[] = [
  {
    title: "📊 整体统计",
    prompts: [
      { text: "本月发送消息总数", type: "birthday", action: "chat" },
      { text: "查看本月积分发放总量", type: "birthday", action: "chat" },
      { text: "本月各关怀类型触达占比", type: "birthday", action: "chat" },
    ],
  },
  {
    title: "🎂 生日关怀",
    prompts: [
      { text: "帮我新建一个生日关怀", type: "birthday", action: "chat" },
      { text: "修改生日关怀", type: "birthday", action: "chat" },
      { text: "统计上月生日关怀发送消息总数", type: "birthday", action: "chat" },
    ],
  },
  {
    title: "🎉 节日关怀",
    prompts: [
      { text: "帮我新建一个节日关怀", type: "festival", action: "chat" },
      { text: "修改节日关怀", type: "festival", action: "chat" },
      { text: "统计节日关怀发送消息总数", type: "festival", action: "chat" },
    ],
  },
  {
    title: "☔ 天气关怀",
    prompts: [
      { text: "帮我新建一个天气关怀", type: "weather", action: "chat" },
      { text: "修改天气关怀", type: "weather", action: "chat" },
      { text: "统计上月天气关怀发送消息总数", type: "weather", action: "chat" },
    ],
  },
  {
    title: "💪 工作强度关怀",
    prompts: [
      { text: "帮我新建一个工作强度关怀", type: "workload", action: "chat" },
      { text: "修改工作强度关怀", type: "workload", action: "chat" },
      { text: "统计上月工作强度关怀发送消息总数", type: "workload", action: "chat" },
    ],
  },
];

const overviewBase = {
  reached: 1684,
  covered: 1286,
  points: 32510,
};

const HumanityCare = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<CareChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pending, setPending] = useState<PendingSession | null>(null);
  const allRules = useCareRules();
  const [statsRange, setStatsRange] = useState<StatsTimeRange>(defaultStatsTimeRange);
  const statsRangeSummary = summarizeStatsTimeRange(statsRange);
  const rangeScale = statsTimeRangeScale(statsRange);

  const overviewStats = useMemo(() => {
    const reached = Math.max(1, Math.round(overviewBase.reached * rangeScale));
    const covered = Math.max(
      1,
      Math.round(overviewBase.covered * Math.min(rangeScale * 2.5, 1)),
    );
    const points = Math.round(overviewBase.points * rangeScale);
    return [
      {
        label: "已配置方案",
        value: String(allRules.length),
        icon: Settings,
        color: "--cat-1",
      },
      {
        label: "触达人次",
        value: reached.toLocaleString(),
        icon: Bell,
        color: "--cat-7",
      },
      {
        label: "覆盖员工",
        value: covered.toLocaleString(),
        icon: Users,
        color: "--cat-3",
      },
      {
        label: "积分发放",
        value: points.toLocaleString(),
        icon: TrendingUp,
        color: "--cat-6",
      },
    ];
  }, [allRules.length, rangeScale]);

  const refreshPrompts = () => setPromptIdx((i) => (i + 1) % promptGroups.length);
  const currentGroup = promptGroups[promptIdx];
  const hasChat = messages.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const handleAgentAction = (action: AgentAction) => {
    if (action.type === "navigate" && action.payload) {
      navigate(action.payload);
    }
  };

  const sendToAgent = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setChatInput("");

    const userMsg: CareChatMessage = {
      id: nextMsgId(),
      role: "user",
      content: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    window.setTimeout(() => {
      const { reply, pending: nextPending } = dispatchHumanityCareAgent(q, pending);
      setPending(nextPending);
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          role: "assistant",
          content: reply.summary,
          reply,
        },
      ]);
      setIsTyping(false);
    }, 500 + Math.random() * 400);
  };

  const goModule = (type: CareType) => navigate(`/agents/humanity-care/${type}`);

  return (
    <>
      <h1 className="sr-only">人文关怀 Agent - 关怀与福利引擎</h1>
      <div className="mx-auto flex h-screen max-w-md flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/85 px-3 pb-2 pt-3 backdrop-blur-lg">
          <div className="flex items-center gap-2">
            <button
              aria-label="返回"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-base active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center text-base font-semibold text-foreground">
              人文关怀
            </div>
            <div className="h-10 w-10 shrink-0" aria-hidden />
          </div>
        </header>

        <main
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-2 scrollbar-hide"
        >
          {hasChat ? (
            <HumanityCareAgentChat
              messages={messages}
              isTyping={isTyping}
              onAction={handleAgentAction}
            />
          ) : (
            <>
          {/* Hero 介绍卡片 */}
          <section className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-glow gradient-banner">
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <HandHeart className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium opacity-90">关怀与福利引擎</span>
              </div>
              <h2 className="mt-3 text-xl font-bold leading-snug">让每一份关怀,温暖且准时</h2>
              <p className="mt-1.5 text-xs leading-relaxed opacity-90">
                自动识别生日、节日、极端天气与高强度工作场景,
                通过 IM 准时触达员工,搭配积分与福利消费引导。
              </p>
            </div>
            <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-4 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          </section>

          {/* 数据概览 */}
          <section>
            <div className="mb-2 flex items-center gap-1.5 px-0.5">
              <span className="text-xs text-muted-foreground">统计周期</span>
              <StatsTimeRangePicker
                value={statsRange}
                onChange={setStatsRange}
                trigger={<StatsTimeRangeBar summary={statsRangeSummary} />}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
            {overviewStats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex flex-col items-center rounded-2xl bg-card p-2.5 shadow-soft"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{
                      background: `hsl(var(${s.color}) / 0.15)`,
                      color: `hsl(var(${s.color}))`,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </div>
                  <div className="mt-1.5 text-sm font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              );
            })}
            </div>
          </section>

          {/* 核心能力 */}
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-foreground">核心能力</h3>
              <span className="text-[11px] text-muted-foreground">点击进入设置 / 查询 / 统计</span>
            </div>
            <ul className="grid grid-cols-2 gap-2.5">
              {careModuleList.map((m) => {
                const Icon = m.icon;
                return (
                  <li key={m.key}>
                    <button
                      onClick={() => goModule(m.key)}
                      className="group flex h-full w-full items-center gap-2.5 rounded-2xl bg-card p-2.5 text-left shadow-soft transition-base active:scale-[0.98] active:shadow-glow"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, hsl(var(${m.colorVar}) / 0.22), hsl(var(${m.colorVar}) / 0.08))`,
                          color: `hsl(var(${m.colorVar}))`,
                        }}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">{m.name}</div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {m.desc}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
              {/* 占位 - 员工生命周期 */}
              <li className="col-span-2">
                <div className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-card/60 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">员工生命周期关怀</div>
                      <div className="text-[11px] text-muted-foreground">入职 / 转正 / 周年 等节点 · 即将上线</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">敬请期待</span>
                </div>
              </li>
            </ul>
          </section>

          {/* 常用提示词 */}
          <section className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{currentGroup.title} · 试试这样问</h3>
              </div>
              <button
                onClick={refreshPrompts}
                aria-label="换一批"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-base active:scale-90"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {currentGroup.prompts.map((p) => {
                const handleClick = () => {
                  if (p.action === "chat") {
                    sendToAgent(p.text);
                    return;
                  }
                  if (p.action === "detail") {
                    navigate(`/agents/humanity-care/${p.type}`);
                  } else {
                    const qs = p.query
                      ? "?" +
                        new URLSearchParams(p.query).toString()
                      : "";
                    navigate(`/agents/humanity-care/${p.type}/new${qs}`);
                  }
                };
                return (
                  <li key={p.text}>
                    <button
                      onClick={handleClick}
                      className="flex w-full items-center justify-between gap-2 rounded-xl bg-accent/60 px-3 py-2 text-left text-xs text-accent-foreground transition-base active:scale-[0.99]"
                    >
                      <span className="line-clamp-1">{p.text}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
            </>
          )}
        </main>

        <ChatInputBar
          value={chatInput}
          onChange={setChatInput}
          onSubmit={sendToAgent}
          placeholder="查询统计、管理生日关怀规则…"
        />
      </div>
    </>
  );
};

export default HumanityCare;
