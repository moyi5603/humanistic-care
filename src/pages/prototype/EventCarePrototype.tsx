import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Cake,
  ChevronDown,
  ChevronLeft,
  CloudSun,
  Home,
  PartyPopper,
  RefreshCw,
  Send,
  Smile,
  Plus,
  AudioLines,
  Bot,
  MessageCircle,
} from "lucide-react";
import type { CareType } from "@/data/humanityCare";

const overviewStats = [
  { label: "已配置方案", value: "0" },
  { label: "触达人次", value: "2" },
  { label: "覆盖员工", value: "2" },
  { label: "积分发放", value: "33" },
] as const;

const capabilityCards: {
  key: CareType;
  name: string;
  desc: string;
  icon: typeof Cake;
  bg: string;
  iconBg: string;
}[] = [
  {
    key: "birthday",
    name: "生日事件",
    desc: "为员工生日发送祝福、积分与蛋糕电影福利",
    icon: Cake,
    bg: "linear-gradient(145deg, #FFF0F3 0%, #FFE8EE 100%)",
    iconBg: "#FFD6E0",
  },
  {
    key: "festival",
    name: "节日事件",
    desc: "重要节日为员工送祝福、积分与节日礼包",
    icon: PartyPopper,
    bg: "linear-gradient(145deg, #FFF4E8 0%, #FFE9D4 100%)",
    iconBg: "#FFD9B8",
  },
  {
    key: "weather",
    name: "天气事件",
    desc: "极端天气自动推送提醒，守护员工健康通勤",
    icon: CloudSun,
    bg: "linear-gradient(145deg, #EEF6FF 0%, #E3F0FF 100%)",
    iconBg: "#C8E4FF",
  },
  {
    key: "workload",
    name: "工作强度事件",
    desc: "实时识别加班/高强度并送上慰问与打车福利",
    icon: Activity,
    bg: "linear-gradient(145deg, #ECFAF4 0%, #DFF5EA 100%)",
    iconBg: "#B8EBD4",
  },
];

const promptSamples = [
  "为研发部下月过生日的同事创建…",
  "统计近7日节日事件触达人次",
  "帮我新建一个暴雨天气关怀方案",
  "查看工作强度事件本月积分发放",
];

const GiftBoxIllustration = () => (
  <svg
    viewBox="0 0 120 110"
    className="h-[88px] w-[96px] shrink-0 drop-shadow-md"
    aria-hidden
  >
    <ellipse cx="60" cy="98" rx="38" ry="8" fill="hsl(25 80% 55% / 0.18)" />
    <path
      d="M22 52 L60 38 L98 52 L98 88 C98 94 82 98 60 98 C38 98 22 94 22 88 Z"
      fill="url(#giftBody)"
    />
    <path d="M22 52 L60 66 L98 52 L60 38 Z" fill="#FFB84D" />
    <path d="M54 38 L66 38 L64 98 L56 98 Z" fill="#FF6B4A" />
    <path d="M22 52 L98 52 L94 58 L26 58 Z" fill="#FF8A5C" />
    <circle cx="44" cy="30" r="5" fill="#FFD166" />
    <circle cx="78" cy="26" r="4" fill="#FF8FAB" />
    <circle cx="88" cy="42" r="3.5" fill="#6ECBFF" />
    <circle cx="34" cy="22" r="3" fill="#B794F6" />
    <circle cx="68" cy="18" r="4" fill="#FFD166" />
    <path
      d="M48 20 C52 8 68 8 72 20 C76 32 60 36 60 36 C60 36 44 32 48 20 Z"
      fill="#FFB84D"
      stroke="#FF9F43"
      strokeWidth="1.5"
    />
    <defs>
      <linearGradient id="giftBody" x1="22" y1="52" x2="98" y2="98">
        <stop offset="0%" stopColor="#FFC857" />
        <stop offset="100%" stopColor="#FFAD33" />
      </linearGradient>
    </defs>
  </svg>
);

/** 事件关怀首页 · 按设计稿还原（独立原型页） */
const EventCarePrototype = () => {
  const navigate = useNavigate();
  const [promptIdx, setPromptIdx] = useState(0);
  const currentPrompt = promptSamples[promptIdx % promptSamples.length];

  const goModule = (type: CareType) => navigate(`/agents/humanity-care/${type}`);

  return (
    <div
      className="mx-auto flex h-[100dvh] max-w-md flex-col"
      style={{
        background: "linear-gradient(180deg, #FFF6F0 0%, #FFF0E6 38%, #FFF8F4 100%)",
      }}
    >
      <h1 className="sr-only">事件关怀</h1>

      {/* Header */}
      <header className="sticky top-0 z-30 px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="返回"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#3D3D3D] transition-base active:scale-95"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="首页"
              onClick={() => navigate("/")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#3D3D3D] transition-base active:scale-95"
            >
              <Home className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 text-center text-[17px] font-semibold text-[#2B2B2B]">
            事件关怀
          </div>
          <button
            type="button"
            className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/90 px-2.5 text-[12px] font-medium text-[#5C5C5C] shadow-sm transition-base active:scale-95"
          >
            <Bot className="h-3.5 w-3.5 text-[#FF8C42]" />
            智能体
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-3 pb-3 scrollbar-hide">
        {/* Hero */}
        <section className="relative px-0.5 pt-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-[22px] font-bold leading-[1.35] text-[#FF7A2E]">
                让每一份关怀
                <br />
                温暖且准时
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[#8A8A8A]">
                依托场景智能识别，IM 精准触达员工，
                <br />
                以积分福利暖心关怀、正向激励
              </p>
            </div>
            <GiftBoxIllustration />
          </div>
        </section>

        {/* 荣誉概览 */}
        <section>
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h3 className="text-[15px] font-semibold text-[#2B2B2B]">荣誉概览</h3>
            <button
              type="button"
              className="flex items-center gap-0.5 text-[12px] text-[#8A8A8A]"
            >
              近7日
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {overviewStats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-2xl bg-white px-1 py-3 shadow-[0_2px_12px_rgba(255,140,66,0.08)]"
              >
                <div className="text-[20px] font-bold leading-none text-[#FF8C42]">
                  {s.value}
                </div>
                <div className="mt-1.5 text-center text-[10px] leading-tight text-[#9A9A9A]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 核心能力 · 2x2 */}
        <section>
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h3 className="text-[15px] font-semibold text-[#2B2B2B]">核心能力</h3>
            <span className="text-[10px] text-[#B0B0B0]">点击进入设置 / 查询 / 统计</span>
          </div>
          <ul className="grid grid-cols-2 gap-2.5">
            {capabilityCards.map((card) => {
              const Icon = card.icon;
              return (
                <li key={card.key}>
                  <button
                    type="button"
                    onClick={() => goModule(card.key)}
                    className="relative flex h-full w-full flex-col rounded-2xl p-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-base active:scale-[0.98]"
                    style={{ background: card.bg }}
                  >
                    <div
                      className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: card.iconBg }}
                    >
                      <Icon className="h-[18px] w-[18px] text-[#5C5C5C]" strokeWidth={2} />
                    </div>
                    <div className="pr-10">
                      <div className="text-[14px] font-bold text-[#2B2B2B]">{card.name}</div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#8A8A8A]">
                        {card.desc}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 你可以这样问我 */}
        <section>
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h3 className="text-[15px] font-semibold text-[#2B2B2B]">你可以这样问我</h3>
            <button
              type="button"
              onClick={() => setPromptIdx((i) => (i + 1) % promptSamples.length)}
              className="flex items-center gap-1 text-[12px] text-[#8A8A8A] transition-base active:opacity-70"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              换一换
            </button>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl bg-[#FFF8F4] px-3 py-2.5 text-left transition-base active:scale-[0.99]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE8D6]">
                <MessageCircle className="h-4 w-4 text-[#FF8C42]" fill="#FF8C42" strokeWidth={0} />
              </div>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#5C5C5C]">
                {currentPrompt}
              </span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4B8BFF] text-white shadow-sm">
                <Send className="h-3.5 w-3.5" />
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom input bar */}
      <footer className="shrink-0 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="语音输入"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4B8BFF] text-white shadow-md transition-base active:scale-95"
          >
            <AudioLines className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <input
              type="text"
              placeholder=""
              className="min-w-0 flex-1 bg-transparent text-sm text-[#2B2B2B] placeholder:text-[#C0C0C0] focus:outline-none"
            />
          </div>
          <button
            type="button"
            aria-label="表情"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8A8A8A] transition-base active:scale-95"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="更多"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8E8E8] bg-white text-[#8A8A8A] transition-base active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default EventCarePrototype;
