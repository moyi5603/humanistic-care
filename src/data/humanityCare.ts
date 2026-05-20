import {
  Cake,
  PartyPopper,
  CloudSun,
  Activity,
  Timer,
  Moon,
  CalendarRange,
  CalendarCheck2,
  Thermometer,
  Snowflake,
  ThermometerSnowflake,
  CloudRain,
  CloudSnow,
  Wind,
  CloudFog,
  Cloudy,
  type LucideIcon,
} from "lucide-react";

export type CareType = "birthday" | "festival" | "weather" | "workload";

export type CareModule = {
  key: CareType;
  name: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  colorVar: string; // CSS HSL var name without var()
  triggers: string[]; // 预制触发条件 / 节日 / 模板等
  templates: string[]; // 预制内容模板
  consumeHint: string; // 引导消费
};

export const careModules: Record<CareType, CareModule> = {
  birthday: {
    key: "birthday",
    name: "生日关怀",
    short: "生日",
    desc: "为员工生日发送祝福、积分与蛋糕电影福利",
    icon: Cake,
    colorVar: "--cat-7",
    triggers: ["生日当天 09:00", "生日前 1 天 18:00"],
    templates: [
      "🎂 生日快乐!愿新的一岁充满惊喜与成长",
      "🎉 祝你生日快乐!公司为你准备了一份小礼物",
      "✨ AI 动态生成(根据员工岗位/兴趣)",
    ],
    consumeHint: "蛋糕券 / 电影票 福利商城",
  },
  festival: {
    key: "festival",
    name: "节日关怀",
    short: "节日",
    desc: "重要节日为员工送祝福、积分与节日礼包",
    icon: PartyPopper,
    colorVar: "--cat-4",
    triggers: ["春节", "端午节", "中秋节", "国庆节", "元旦", "妇女节", "劳动节"],
    templates: [
      "🧧 新春快乐,阖家团圆",
      "🥮 中秋月圆人团圆,公司送上节日福利",
      "✨ AI 动态生成(贴合节日氛围与文化)",
    ],
    consumeHint: "节日礼包 / 节日商城",
  },
  weather: {
    key: "weather",
    name: "天气关怀",
    short: "天气",
    desc: "极端天气自动推送提醒,守护员工健康通勤",
    icon: CloudSun,
    colorVar: "--cat-9",
    triggers: ["高温 ≥ 35℃", "暴雨 / 雷暴", "暴雪 / 寒潮 ≤ -5℃", "空气质量 AQI ≥ 200"],
    templates: [
      "☔ 今日有暴雨,出门请带好雨具,注意安全",
      "🥵 高温预警!请注意防暑降温,多补水",
      "❄ 寒潮来袭,注意添衣保暖",
    ],
    consumeHint: "无消费引导",
  },
  workload: {
    key: "workload",
    name: "工作强度关怀",
    short: "强度",
    desc: "实时识别加班/高强度并送上慰问与打车福利",
    icon: Activity,
    colorVar: "--cat-2",
    triggers: [
      "连续加班 ≥ 3 天",
      "单日工时 ≥ 12h",
      "周工时 ≥ 60h",
      "凌晨 0 点后仍在线",
    ],
    templates: [
      "🌙 辛苦了!夜深了请注意休息,公司为你准备了打车券",
      "💪 看到你最近很拼,公司给你加 50 积分,记得照顾好自己",
      "✨ AI 动态生成(根据加班场景温情慰问)",
    ],
    consumeHint: "打车券 / 夜宵福利",
  },
};

export const careModuleList: CareModule[] = [
  careModules.birthday,
  careModules.festival,
  careModules.weather,
  careModules.workload,
];

/** 支持有效日期步骤的关怀类型 */
export const careTypesWithValidDate: CareType[] = ["birthday", "festival"];

export const hasValidDateStep = (type: CareType) =>
  careTypesWithValidDate.includes(type);

/** 方案有效日期 (生日/节日关怀等) */
export type ValidDateRange = {
  mode: "permanent" | "year" | "custom";
  start?: string; // YYYY-MM-DD
  end?: string;
};

export const defaultValidDateRange = (): ValidDateRange => ({
  mode: "year",
});

export const summarizeValidDate = (
  range: ValidDateRange,
): { text: string; sub: string } => {
  const year = new Date().getFullYear();
  if (range.mode === "permanent") {
    return { text: "长期有效", sub: "方案持续生效, 无截止日期" };
  }
  if (range.mode === "year") {
    return {
      text: `${year} 年全年`,
      sub: `${year}/01/01 — ${year}/12/31`,
    };
  }
  if (range.start && range.end) {
    return {
      text: `${range.start} 至 ${range.end}`,
      sub: "自定义有效期限",
    };
  }
  return { text: "请设置起止日期", sub: "自定义有效期限" };
};

/** 列表/摘要用一行文案 */
export const formatValidDateForList = (range?: ValidDateRange): string =>
  summarizeValidDate(range ?? defaultValidDateRange()).text;

/** 表单完整状态, 用于新建/编辑后回显 */
export type CareRuleFormData = {
  audience: {
    all: boolean;
    deptIds: string[];
    empIds: string[];
    tags: string[];
  };
  trigger?: string;
  festival?: string;
  customContent?: string;
  workloadTrigger?: WorkloadTriggerState;
  weatherTrigger?: WeatherTriggerState;
  validDateRange?: ValidDateRange;
};

export type CareRule = {
  id: string;
  type: CareType;
  name: string;
  audience: string; // 关怀对象
  triggerTime: string;
  template: string;
  points: number;
  enabled: boolean;
  reached: number; // 已触达人次
  /** 有效日期(列表展示, 生日/节日关怀) */
  validDateRange?: ValidDateRange;
  /** 可选: 保存表单草稿, 编辑时完整还原 */
  formData?: CareRuleFormData;
};

export const sampleRules: CareRule[] = [
  {
    id: "r1",
    type: "birthday",
    name: "全员生日祝福",
    audience: "全公司员工",
    triggerTime: "生日当天 09:00",
    template: "🎂 生日快乐!愿新的一岁充满惊喜与成长",
    points: 50,
    enabled: true,
    reached: 312,
    validDateRange: { mode: "year" },
  },
  {
    id: "r2",
    type: "festival",
    name: "中秋节关怀",
    audience: "全员 + 外派员工",
    triggerTime: "节日前 1 天 18:00",
    template: "🥮 中秋月圆人团圆,公司送上节日福利",
    points: 100,
    enabled: true,
    reached: 1286,
    validDateRange: { mode: "year" },
  },
  {
    id: "r3",
    type: "weather",
    name: "高温预警关怀",
    audience: "户外岗位 86 人",
    triggerTime: "每日 07:30",
    template: "🥵 高温预警!请注意防暑降温,多补水",
    points: 0,
    enabled: true,
    reached: 24,
  },
  {
    id: "r4",
    type: "workload",
    name: "深夜加班慰问",
    audience: "研发中心 320 人",
    triggerTime: "实时触发 (0:00 后在线)",
    template: "🌙 辛苦了!夜深了请注意休息,打车券已发放",
    points: 30,
    enabled: true,
    reached: 47,
  },
];

/* ============== 工作强度触发条件配置 ============== */

export type WorkloadTriggerKey =
  | "dailyHours"
  | "clockOut"
  | "weeklyHours"
  | "overtimeDays";

export type WorkloadTriggerCategory = {
  key: WorkloadTriggerKey;
  name: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  unit: string; // 显示单位,例如「小时」「天」
  inputType: "number" | "time";
  presets: (number | string)[];
  defaultValue: number | string;
  defaultEnabled: boolean;
  min?: number;
  max?: number;
  formatValue: (v: number | string) => string; // 例如 "≥ 12 小时"
  shortLabel: (v: number | string) => string; // 摘要里短标签 "单日 ≥ 12h"
};

export const workloadTriggerCategories: WorkloadTriggerCategory[] = [
  {
    key: "dailyHours",
    name: "单日工时",
    short: "单日",
    desc: "员工单日累计工作时长达到阈值即触达",
    icon: Timer,
    unit: "小时",
    inputType: "number",
    presets: [10, 12, 14, 16],
    defaultValue: 12,
    defaultEnabled: true,
    min: 6,
    max: 24,
    formatValue: (v) => `≥ ${v} 小时`,
    shortLabel: (v) => `单日 ≥ ${v}h`,
  },
  {
    key: "clockOut",
    name: "下班打卡时间",
    short: "下班",
    desc: "晚于该时刻下班自动触达(支持次日)",
    icon: Moon,
    unit: "时刻",
    inputType: "time",
    presets: ["21:00", "22:00", "23:00", "次日 00:00", "次日 02:00"],
    defaultValue: "23:00",
    defaultEnabled: false,
    formatValue: (v) => `≥ ${v}`,
    shortLabel: (v) => `下班 ≥ ${v}`,
  },
  {
    key: "weeklyHours",
    name: "周工时",
    short: "周",
    desc: "本周累计工作时长达到阈值即触达",
    icon: CalendarRange,
    unit: "小时",
    inputType: "number",
    presets: [50, 60, 70, 80],
    defaultValue: 60,
    defaultEnabled: false,
    min: 30,
    max: 100,
    formatValue: (v) => `≥ ${v} 小时 / 周`,
    shortLabel: (v) => `周 ≥ ${v}h`,
  },
  {
    key: "overtimeDays",
    name: "连续加班天数",
    short: "连班",
    desc: "连续加班达到天数阈值即触达",
    icon: CalendarCheck2,
    unit: "天",
    inputType: "number",
    presets: [2, 3, 5, 7],
    defaultValue: 3,
    defaultEnabled: false,
    min: 1,
    max: 14,
    formatValue: (v) => `连续 ≥ ${v} 天`,
    shortLabel: (v) => `连班 ≥ ${v}天`,
  },
];

export type WorkloadTriggerState = {
  key: WorkloadTriggerKey;
  value: number | string;
};

const defaultCat =
  workloadTriggerCategories.find((c) => c.defaultEnabled) ??
  workloadTriggerCategories[0];

export const defaultWorkloadTrigger: WorkloadTriggerState = {
  key: defaultCat.key,
  value: defaultCat.defaultValue,
};

export const summarizeWorkload = (
  state: WorkloadTriggerState,
): { text: string; sub: string } => {
  const cat = workloadTriggerCategories.find((c) => c.key === state.key);
  if (!cat) {
    return { text: "未设置触发条件", sub: "请选择一种触发条件" };
  }
  return {
    text: `${cat.name} ${cat.formatValue(state.value)}`,
    sub: "触发条件 · 满足即触达",
  };
};


/* ============== 天气触发条件配置 ============== */

export type WeatherTriggerKey =
  | "extremeHeat"
  | "extremeCold"
  | "coldWave"
  | "rainstorm"
  | "snowstorm"
  | "typhoon"
  | "sandstorm"
  | "haze";

export type WarningLevel = "blue" | "yellow" | "orange" | "red";

export const warningLevelMeta: Record<
  WarningLevel,
  { name: string; color: string; bg: string; ring: string }
> = {
  blue: { name: "蓝色", color: "#3B82F6", bg: "#DBEAFE", ring: "#93C5FD" },
  yellow: { name: "黄色", color: "#CA8A04", bg: "#FEF9C3", ring: "#FDE047" },
  orange: { name: "橙色", color: "#EA580C", bg: "#FFEDD5", ring: "#FDBA74" },
  red: { name: "红色", color: "#DC2626", bg: "#FEE2E2", ring: "#FCA5A5" },
};

export const allWarningLevels: WarningLevel[] = ["blue", "yellow", "orange", "red"];

export type WeatherTriggerCategory =
  | {
      key: WeatherTriggerKey;
      kind: "threshold";
      name: string;
      short: string;
      desc: string;
      tip: string;
      icon: LucideIcon;
      colorVar: string;
      unit: string;
      compare: "gte" | "lte"; // ≥ or ≤
      presets: number[];
      defaultValue: number;
      min: number;
      max: number;
      step?: number;
      formatValue: (v: number) => string;
      shortLabel: (v: number) => string;
    }
  | {
      key: WeatherTriggerKey;
      kind: "warning";
      name: string;
      short: string;
      desc: string;
      tip: string;
      icon: LucideIcon;
      colorVar: string;
      defaultLevels: WarningLevel[];
      formatValue: (levels: WarningLevel[]) => string;
      shortLabel: (levels: WarningLevel[]) => string;
    };

const fmtLevels = (levels: WarningLevel[]) =>
  levels.length === 0
    ? "未启用"
    : levels.map((l) => warningLevelMeta[l].name).join(" / ") + "预警";

export const weatherTriggerCategories: WeatherTriggerCategory[] = [
  {
    key: "extremeHeat",
    kind: "threshold",
    name: "极端高温",
    short: "高温",
    desc: "气温达到阈值时自动推送防暑提醒",
    tip: "建议设置 ≥ 37℃,人体易出现中暑风险",
    icon: Thermometer,
    colorVar: "--cat-1",
    unit: "℃",
    compare: "gte",
    presets: [35, 37, 38, 40],
    defaultValue: 37,
    min: 30,
    max: 50,
    formatValue: (v) => `≥ ${v} ℃`,
    shortLabel: (v) => `高温 ≥ ${v}℃`,
  },
  {
    key: "extremeCold",
    kind: "threshold",
    name: "极端低温",
    short: "低温",
    desc: "气温低于阈值时自动推送保暖提醒",
    tip: "建议设置 ≤ 0℃,户外作业需注意防冻",
    icon: ThermometerSnowflake,
    colorVar: "--cat-9",
    unit: "℃",
    compare: "lte",
    presets: [5, 0, -5, -10],
    defaultValue: 0,
    min: -30,
    max: 15,
    formatValue: (v) => `≤ ${v} ℃`,
    shortLabel: (v) => `低温 ≤ ${v}℃`,
  },
  {
    key: "coldWave",
    kind: "threshold",
    name: "寒潮降温",
    short: "寒潮",
    desc: "24h降温≥8℃且最低温≤4℃",
    tip: "24h降温≥8℃且最低温≤4℃,两项同时满足时触发",
    icon: Snowflake,
    colorVar: "--cat-3",
    unit: "℃",
    compare: "gte",
    presets: [6, 8, 10, 12],
    defaultValue: 8,
    min: 4,
    max: 20,
    formatValue: (v) => `24h降温≥${v}℃且最低温≤4℃`,
    shortLabel: (v) => `24h降温≥${v}℃且最低温≤4℃`,
  },
  {
    key: "rainstorm",
    kind: "warning",
    name: "暴雨预警",
    short: "暴雨",
    desc: "气象部门发布暴雨预警时自动触发",
    tip: "默认黄/橙/红预警触发,蓝色预警不报警",
    icon: CloudRain,
    colorVar: "--cat-7",
    defaultLevels: ["yellow", "orange", "red"],
    formatValue: fmtLevels,
    shortLabel: (l) => `暴雨 · ${l.length} 级预警`,
  },
  {
    key: "snowstorm",
    kind: "warning",
    name: "暴雪预警",
    short: "暴雪",
    desc: "气象部门发布暴雪预警时自动触发",
    tip: "默认黄/橙/红预警触发,蓝色预警不报警",
    icon: CloudSnow,
    colorVar: "--cat-2",
    defaultLevels: ["yellow", "orange", "red"],
    formatValue: fmtLevels,
    shortLabel: (l) => `暴雪 · ${l.length} 级预警`,
  },
  {
    key: "typhoon",
    kind: "warning",
    name: "台风预警",
    short: "台风",
    desc: "气象部门发布台风预警时自动触发",
    tip: "台风影响范围广,建议蓝/黄/橙/红全部启用",
    icon: Wind,
    colorVar: "--cat-4",
    defaultLevels: ["blue", "yellow", "orange", "red"],
    formatValue: fmtLevels,
    shortLabel: (l) => `台风 · ${l.length} 级预警`,
  },
  {
    key: "sandstorm",
    kind: "warning",
    name: "沙尘暴",
    short: "沙尘",
    desc: "气象部门发布沙尘暴预警时自动触发",
    tip: "默认黄/橙/红预警触发",
    icon: CloudFog,
    colorVar: "--cat-1",
    defaultLevels: ["yellow", "orange", "red"],
    formatValue: fmtLevels,
    shortLabel: (l) => `沙尘 · ${l.length} 级预警`,
  },
  {
    key: "haze",
    kind: "threshold",
    name: "霾 / 重污染",
    short: "霾",
    desc: "空气质量指数 AQI 达到阈值时触发",
    tip: "AQI ≥ 200 即重度污染,建议减少户外活动",
    icon: Cloudy,
    colorVar: "--cat-2",
    unit: "AQI",
    compare: "gte",
    presets: [150, 200, 250, 300],
    defaultValue: 200,
    min: 100,
    max: 500,
    step: 10,
    formatValue: (v) => `AQI ≥ ${v}`,
    shortLabel: (v) => `霾 AQI ≥ ${v}`,
  },
];

export type WeatherTriggerState = {
  enabled: Partial<Record<WeatherTriggerKey, boolean>>;
  thresholds: Partial<Record<WeatherTriggerKey, number>>;
  levels: Partial<Record<WeatherTriggerKey, WarningLevel[]>>;
};

export const defaultWeatherTrigger: WeatherTriggerState = {
  enabled: weatherTriggerCategories.reduce(
    (acc, c) => {
      acc[c.key] = true;
      return acc;
    },
    {} as Record<WeatherTriggerKey, boolean>,
  ),
  thresholds: weatherTriggerCategories.reduce(
    (acc, c) => {
      if (c.kind === "threshold") acc[c.key] = c.defaultValue;
      return acc;
    },
    {} as Record<WeatherTriggerKey, number>,
  ),
  levels: weatherTriggerCategories.reduce(
    (acc, c) => {
      if (c.kind === "warning") acc[c.key] = [...c.defaultLevels];
      return acc;
    },
    {} as Record<WeatherTriggerKey, WarningLevel[]>,
  ),
};

export const summarizeWeather = (
  state: WeatherTriggerState,
): { text: string; sub: string } => {
  const parts: string[] = [];
  for (const cat of weatherTriggerCategories) {
    if (!state.enabled[cat.key]) continue;
    if (cat.kind === "threshold") {
      const v = state.thresholds[cat.key] ?? cat.defaultValue;
      parts.push(cat.shortLabel(v));
    } else {
      const l = state.levels[cat.key] ?? cat.defaultLevels;
      if (l.length > 0) parts.push(cat.shortLabel(l));
    }
  }
  if (parts.length === 0) {
    return { text: "未启用任何触发条件", sub: "请至少开启一种天气条件" };
  }
  const enabledCount = parts.length;
  return {
    text: parts.slice(0, 2).join(" · ") + (parts.length > 2 ? ` 等 ${enabledCount} 项` : ""),
    sub: `共启用 ${enabledCount} 项天气触发 · 满足即触达`,
  };
};
