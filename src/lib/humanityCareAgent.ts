import {
  careModules,
  type CareRule,
  type CareType,
} from "@/data/humanityCare";
import {
  deleteCareRule,
  getCareRulesSnapshot,
  setCareRuleEnabled,
  upsertCareRule,
} from "@/data/careRulesStore";

export type AgentTable = {
  headers: string[];
  rows: string[][];
};

export type AgentPieSlice = {
  name: string;
  value: number;
};

export type AgentPieChart = {
  slices: AgentPieSlice[];
};

export type AgentAction = {
  label: string;
  type: "navigate" | "reply";
  payload?: string;
};

export type HumanityCareAgentReply = {
  summary: string;
  table?: AgentTable;
  table2?: AgentTable;
  list?: string[];
  pieChart?: AgentPieChart;
  actions?: AgentAction[];
};

export type TimeRangeKey = "today" | "week" | "month" | "last_month" | "year";

export type StatsScope =
  | { kind: "all" }
  | { kind: "type"; careType: CareType }
  | { kind: "rule"; rule: CareRule };

export type StatsIntent =
  | "send_stats"
  | "messages_count"
  | "points_total"
  | "points_avg"
  | "coverage"
  | "guide_ctr"
  | "type_share"
  | "dept_rank"
  | "points_rank";

export type PendingSession =
  | { kind: "delete_confirm"; ruleId: string; ruleName: string }
  | {
      kind: "toggle_confirm";
      ruleId: string;
      ruleName: string;
      enable: boolean;
    }
  | {
      kind: "batch_toggle_confirm";
      careType: CareType | "all";
      enable: boolean;
      count: number;
    }
  | {
      kind: "pick_rule";
      intent:
        | "modify"
        | "delete"
        | "detail"
        | "toggle"
        | "nav_modify"
        | "nav_detail";
      candidates: CareRule[];
      modifyDraft?: { points?: number; triggerTime?: string };
      enable?: boolean;
    }
  | {
      kind: "pick_care_type";
      intent: "batch_toggle" | StatsIntent;
      enable?: boolean;
      timeRange?: TimeRangeKey;
    }
  | {
      kind: "pick_time_range";
      intent: StatsIntent;
      careType?: CareType | "all";
    }
  | {
      kind: "pick_stats_scope";
      intent: "messages_count" | "points_total";
      timeRange: TimeRangeKey;
      candidates?: CareRule[];
    }
  | {
      kind: "modify_confirm";
      ruleId: string;
      ruleName: string;
      changes: { points?: number; triggerTime?: string };
    };

const careTypeLabel: Record<CareType, string> = {
  birthday: "生日关怀",
  festival: "节日关怀",
  weather: "天气关怀",
  workload: "工作强度关怀",
};

const careTypeSynonyms: Record<CareType, RegExp> = {
  birthday: /生日关怀|生日提醒|生日活动|生日福利|生日/,
  festival: /节日关怀|节日提醒|节日活动|节日福利|节日/,
  weather: /天气关怀|天气提醒|天气预警|天气/,
  workload: /工作强度关怀|工作关怀|加班关怀|工作福利|加班福利|工作强度|加班/,
};

const timeRangeLabel: Record<TimeRangeKey, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
  last_month: "上月",
  year: "今年",
};

const timeRangeScale: Record<TimeRangeKey, number> = {
  today: 0.025,
  week: 0.17,
  month: 0.35,
  last_month: 0.32,
  year: 1,
};

const deptBirthdayStats = [
  { dept: "研发中心", count: 86 },
  { dept: "产品中心", count: 62 },
  { dept: "市场中心", count: 48 },
  { dept: "运营中心", count: 41 },
  { dept: "人力行政", count: 28 },
];

const pointsTopEmployees = [
  { name: "王小明", points: 520 },
  { name: "李芳", points: 480 },
  { name: "张伟", points: 450 },
  { name: "刘洋", points: 420 },
  { name: "陈静", points: 390 },
  { name: "赵磊", points: 360 },
  { name: "孙婷", points: 340 },
  { name: "周杰", points: 310 },
  { name: "吴敏", points: 290 },
  { name: "郑浩", points: 275 },
];

const unpaidBirthdayEmployees = [
  "张三",
  "李四",
  "王五",
  "赵六",
  "钱七",
  "孙八",
  "周九",
  "吴十",
];

const globalStatsDemo = {
  today: 42,
  week: 286,
  month: 1684,
  covered: 1286,
  pointsTotal: 32510,
  pointsAvg: 25.3,
  guideClicks: 892,
  guideCtr: "12.4%",
};

/** 口语同义词归一，便于意图匹配 */
const normalizeQuery = (q: string) =>
  q
    .replace(/创建|新增|添加|建立|配置一条/g, "新建")
    .replace(/移除|删掉|作废|去掉/g, "删除")
    .replace(/编辑|调整|改动|更新/g, "修改")
    .replace(/开启|上线|打开生效/g, "启用")
    .replace(/关闭|下线|暂停|失效/g, "停用")
    .replace(/查一查|看一看|计算/g, "查看")
    .replace(/合计|总共|一共多少/g, "总量")
    .replace(/平均每人|单个人均值/g, "人均")
    .replace(/TOP|榜单前|最多的/g, "排名前")
    .replace(/末尾|垫底|后\s*(\d+)\s*名|最少的/g, "倒数")
    .replace(/比重|份额|分布/g, "占比")
    .replace(/今天|当日/g, "今日")
    .replace(/这周/g, "本周")
    .replace(/这个月|当月/g, "本月")
    .replace(/上个月|上个自然月/g, "上月")
    .replace(/全年|本年度/g, "今年");

const extractQuoted = (q: string) => {
  const m = q.match(/[「『"']([^」』"']+)[」』"']/);
  return m?.[1];
};

const extractRuleName = (q: string) => {
  const quoted = extractQuoted(q);
  if (quoted) return quoted;
  const rules = getCareRulesSnapshot();
  const byName = rules.find((r) => q.includes(r.name));
  return byName?.name;
};

const extractPoints = (q: string) => {
  const m = q.match(/(\d+)\s*分/);
  return m ? Number(m[1]) : undefined;
};

const extractTriggerTime = (q: string) => {
  if (/生日当天\s*09:00|当天\s*09:00/.test(q)) return "生日当天 09:00";
  if (/生日前\s*1\s*天|前\s*1\s*天\s*18:00/.test(q)) return "生日前 1 天 18:00";
  const m = q.match(/改为\s*(.+触达|生日.+?\d{2}:\d{2})/);
  return m?.[1];
};

const parseCareType = (q: string): CareType | "all" | undefined => {
  if (/全部|所有|整体|四种|各类/.test(q)) return "all";
  for (const t of Object.keys(careTypeSynonyms) as CareType[]) {
    if (careTypeSynonyms[t].test(q)) return t;
  }
  return undefined;
};

const parseTimeRange = (q: string): TimeRangeKey | undefined => {
  if (/今日|今天/.test(q)) return "today";
  if (/本周|这周/.test(q)) return "week";
  if (/本月|这个月/.test(q)) return "month";
  if (/上月|上个月/.test(q)) return "last_month";
  if (/今年|全年|全部时间|所有时间/.test(q)) return "year";
  const recent = q.match(/近\s*(\d+)\s*天|最近\s*(\d+)\s*天|这\s*(\d+)\s*天/);
  if (recent) {
    const days = Number(recent[1] ?? recent[2] ?? recent[3]);
    if (days <= 1) return "today";
    if (days <= 7) return "week";
    if (days <= 31) return "month";
    return "year";
  }
  return undefined;
};

const ruleEditPath = (rule: CareRule) =>
  `/agents/humanity-care/${rule.type}/new?ruleId=${rule.id}`;

const moduleListPath = (type: CareType) => `/agents/humanity-care/${type}`;

const moduleNewPath = (type: CareType, qs?: URLSearchParams) =>
  `/agents/humanity-care/${type}/new${qs?.toString() ? `?${qs}` : ""}`;

const matchRules = (
  q: string,
  rules: CareRule[],
  careType?: CareType,
): CareRule[] => {
  let pool = careType ? rules.filter((r) => r.type === careType) : rules;
  const quoted = extractQuoted(q);
  if (quoted) {
    const matched = pool.filter((r) => r.name.includes(quoted));
    if (matched.length) return matched;
  }
  const name = extractRuleName(q);
  if (name) {
    const matched = pool.filter((r) => r.name.includes(name));
    if (matched.length) return matched;
  }
  if (/所有|全部/.test(q) && careType) return pool;
  const byPartial = pool.filter((r) => q.includes(r.name));
  if (byPartial.length) return byPartial;
  return pool;
};

const scaleByTime = (base: number, range: TimeRangeKey) =>
  Math.max(1, Math.round(base * timeRangeScale[range]));

const filterRulesByType = (rules: CareRule[], careType?: CareType | "all") =>
  careType && careType !== "all" ? rules.filter((r) => r.type === careType) : rules;

const resolveRulesByScope = (rules: CareRule[], scope: StatsScope): CareRule[] => {
  if (scope.kind === "all") return rules;
  if (scope.kind === "type") return rules.filter((r) => r.type === scope.careType);
  return [scope.rule];
};

const statsScopeLabel = (scope: StatsScope) => {
  if (scope.kind === "all") return "全部";
  if (scope.kind === "type") return careTypeLabel[scope.careType];
  return `「${scope.rule.name}」`;
};

const calcPointsForRules = (rules: CareRule[], range: TimeRangeKey) =>
  scaleByTime(
    rules.reduce((a, r) => a + r.points * Math.max(1, Math.round(r.reached * 0.08)), 0),
    range,
  );

const parseStatsScope = (
  q: string,
  rules: CareRule[],
): StatsScope | "ambiguous" | CareRule[] | undefined => {
  if (/全部|所有|全部数据/.test(q)) return { kind: "all" };

  const quoted = extractQuoted(q);
  if (quoted) {
    const matched = rules.filter((r) => r.name.includes(quoted));
    if (matched.length === 1) return { kind: "rule", rule: matched[0] };
    if (matched.length > 1) return matched;
  }

  const byName = rules.filter((r) => q.includes(r.name));
  if (byName.length === 1) return { kind: "rule", rule: byName[0] };
  if (byName.length > 1) return byName;

  const careType = parseCareType(q);
  if (careType && careType !== "all") return { kind: "type", careType };

  return undefined;
};

const buildRuleCountReply = (
  rules: CareRule[],
  careType: CareType | "all" = "all",
): HumanityCareAgentReply => {
  const pool =
    careType === "all" ? rules : rules.filter((r) => r.type === careType);
  const enabled = pool.filter((r) => r.enabled).length;
  const disabled = pool.length - enabled;
  const summary =
    careType === "all"
      ? `目前已有 ${pool.length} 个关怀方案，启用 ${enabled} 个，停用 ${disabled} 个。`
      : `目前共有 ${pool.length} 个${careTypeLabel[careType]}方案，启用 ${enabled} 个，停用 ${disabled} 个。`;
  return {
    summary,
    table:
      careType === "all"
        ? {
            headers: ["关怀类型", "总数", "启用中", "已停用"],
            rows: (Object.keys(careTypeLabel) as CareType[]).map((t) => {
              const typed = rules.filter((r) => r.type === t);
              const en = typed.filter((r) => r.enabled).length;
              return [
                careTypeLabel[t],
                String(typed.length),
                String(en),
                String(typed.length - en),
              ];
            }),
          }
        : undefined,
  };
};

const buildSendStatsReply = (
  rules: CareRule[],
  careType: CareType | "all",
  range: TimeRangeKey,
): HumanityCareAgentReply => {
  const filtered = filterRulesByType(rules, careType);
  const label = careType === "all" ? "全部关怀" : careTypeLabel[careType];
  return {
    summary: `${timeRangeLabel[range]}${label}发送统计如下：`,
    table: {
      headers: ["方案名称", "累计发放积分", "触达人次"],
      rows: filtered.map((r) => [
        r.name,
        String(scaleByTime(r.points * Math.max(1, Math.round(r.reached * 0.08)), range)),
        String(scaleByTime(r.reached, range)),
      ]),
    },
  };
};

const buildMessagesCountReply = (
  rules: CareRule[],
  range: TimeRangeKey,
  scope: StatsScope,
): HumanityCareAgentReply => {
  const pool = resolveRulesByScope(rules, scope);
  const total = pool.reduce((a, r) => a + scaleByTime(r.reached, range), 0);
  const label = statsScopeLabel(scope);
  const summary =
    scope.kind === "all"
      ? range === "month"
        ? `${timeRangeLabel[range]}一共发送 ${total.toLocaleString()} 条消息。`
        : `${timeRangeLabel[range]}共发送 ${total.toLocaleString()} 条消息。`
      : `${timeRangeLabel[range]}${label}共发送 ${total.toLocaleString()} 条消息。`;
  return { summary };
};

const buildPointsTotalReply = (
  rules: CareRule[],
  range: TimeRangeKey,
  scope: StatsScope,
): HumanityCareAgentReply => {
  const pool = resolveRulesByScope(rules, scope);
  const total = calcPointsForRules(pool, range);
  const label = statsScopeLabel(scope);
  const summary =
    scope.kind === "all"
      ? `一共发放了 ${total.toLocaleString()} 个积分。`
      : `${label}一共发放了 ${total.toLocaleString()} 个积分。`;
  return { summary };
};

const buildPointsAvgReply = (
  rules: CareRule[],
  careType: CareType | "all",
  range: TimeRangeKey,
): HumanityCareAgentReply => {
  const filtered = filterRulesByType(rules, careType);
  const total = scaleByTime(
    filtered.reduce((a, r) => a + r.points * Math.max(1, Math.round(r.reached * 0.08)), 0),
    range,
  );
  const avg = (total / Math.max(globalStatsDemo.covered, 1)).toFixed(1);
  return {
    summary: `共发放 ${total.toLocaleString()} 积分，人均 ${avg} 积分。`,
  };
};

const buildCoverageReply = (
  _rules: CareRule[],
  careType: CareType | "all",
  _range: TimeRangeKey,
): HumanityCareAgentReply => {
  const base =
    careType === "all"
      ? globalStatsDemo.covered
      : Math.round(globalStatsDemo.covered * 0.28);
  return {
    summary: `共覆盖 ${base.toLocaleString()} 人。`,
  };
};

const buildGuideCtrReply = (
  careType: CareType | "all",
  range: TimeRangeKey,
): HumanityCareAgentReply => {
  const clicks = scaleByTime(globalStatsDemo.guideClicks, range);
  const label = careType === "all" ? "" : careTypeLabel[careType];
  return {
    summary: `${label}点击 ${clicks.toLocaleString()} 次 点击率 ${globalStatsDemo.guideCtr}。`,
  };
};

const buildTypeShareReply = (rules: CareRule[], range: TimeRangeKey): HumanityCareAgentReply => {
  const types = Object.keys(careTypeLabel) as CareType[];
  const raw = types.map((t) =>
    rules.filter((r) => r.type === t).reduce((a, r) => a + scaleByTime(r.reached, range), 0),
  );
  const sum = raw.reduce((a, n) => a + n, 0) || 1;
  const pcts = raw.slice(0, 3).map((n) => Math.round((n / sum) * 100));
  const last = 100 - pcts.reduce((a, n) => a + n, 0);
  const allPcts = [...pcts, last];
  return {
    summary: `${timeRangeLabel[range]}各关怀类型触达占比：`,
    pieChart: {
      slices: types.map((t, i) => ({
        name: careTypeLabel[t],
        value: allPcts[i],
      })),
    },
  };
};

const buildDeptRankReply = (
  careType: CareType,
  range: TimeRangeKey,
): HumanityCareAgentReply => ({
  summary: `${timeRangeLabel[range]}${careTypeLabel[careType]}触达最多的部门（Top 5）：`,
  table: {
    headers: ["部门名称", "触达次数"],
    rows: deptBirthdayStats.map((d) => [
      d.dept,
      String(scaleByTime(d.count, range)),
    ]),
  },
});

const buildPointsRankReply = (
  careType: CareType | "all",
  range: TimeRangeKey,
  topN = 10,
): HumanityCareAgentReply => {
  const label = careType === "all" ? "" : careTypeLabel[careType];
  return {
    summary: `${timeRangeLabel[range]}${label}积分发放排名前 ${topN} 的员工：`,
    table: {
      headers: ["姓名", "总积分"],
      rows: pointsTopEmployees.slice(0, topN).map((e) => [
        e.name,
        String(scaleByTime(e.points, range)),
      ]),
    },
  };
};

const buildUnpaidBirthdayReply = (): HumanityCareAgentReply => {
  const top5 = unpaidBirthdayEmployees.slice(0, 5).join("、");
  const total = unpaidBirthdayEmployees.length;
  return {
    summary: `今年还有 ${top5} 等 ${total} 名员工未收到生日关怀。`,
  };
};

const askTimeRange = (intent: StatsIntent, careType?: CareType | "all"): HumanityCareAgentReply => ({
  summary: "请先说明统计时间范围，例如：今日、本周、本月、上月或今年。",
  list: [
    careType === undefined ? "若涉及具体关怀类型，也可一并说明，如「本月生日关怀」" : undefined,
    "也可直接说「本月」「本周」等",
  ].filter(Boolean) as string[],
});

const askCareType = (opts?: { allowAll?: boolean }): HumanityCareAgentReply => ({
  summary: opts?.allowAll
    ? "请先说明关怀类型：全部、生日、节日、天气、工作强度。"
    : "请先说明关怀类型：生日、节日、天气、工作强度。",
  list: [opts?.allowAll ? "回复例如「生日关怀」或「全部」" : "回复例如「生日关怀」"],
});

const askSendStatsCareType = (): HumanityCareAgentReply => askCareType({ allowAll: false });

const askStatsScope = (): HumanityCareAgentReply => ({
  summary: "请说明统计范围：全部数据、某一关怀类型，或具体关怀方案名称。",
  list: ["例如「全部」「生日关怀」「全员生日祝福」"],
});

const statsIntentsNeedingScope = new Set<StatsIntent>(["messages_count", "points_total"]);

const statsIntentsNeedingCareType = new Set<StatsIntent>([
  "coverage",
  "guide_ctr",
  "points_avg",
  "dept_rank",
  "points_rank",
]);

const needsCareTypeAsk = (
  intent: StatsIntent,
  careType?: CareType | "all",
): boolean => {
  if (intent === "send_stats") return !careType || careType === "all";
  if (intent === "dept_rank") return !careType || careType === "all";
  return statsIntentsNeedingCareType.has(intent) && !careType;
};

const isSendStatsQuery = (q: string) =>
  /(发送统计|触达统计|查看.+关怀.+统计)/.test(q) ||
  (/(查看|统计)/.test(q) &&
    /(发送|触达).*(统计|情况)/.test(q) &&
    /关怀/.test(q) &&
    !/一共|几条|多少条|消息总数|共发送/.test(q));

const isMessagesCountQuery = (q: string) =>
  /(一共发送|发送了多少|多少条.*消息|消息总数|共发送)/.test(q) &&
  /(关怀|消息)/.test(q);

const isRuleCountQuery = (q: string) =>
  /(多少|几个|数量|总数)/.test(q) &&
  /(关怀|方案|规则)/.test(q) &&
  /(启用|停用|方案|规则)/.test(q);

const isPointsTotalQuery = (q: string) =>
  /积分/.test(q) && /(总量|一共|总共|合计|发放总量)/.test(q) && !/人均|排名/.test(q);

const isPointsAvgQuery = (q: string) =>
  /积分/.test(q) && /人均/.test(q);

const isCoverageQuery = (q: string) =>
  /覆盖/.test(q) && /(员工|人数|人)/.test(q);

const isGuideCtrQuery = (q: string) =>
  /(消费引导|点击率)/.test(q) || (/点击/.test(q) && /关怀/.test(q));

const isTypeShareQuery = (q: string) =>
  /占比|分布|份额/.test(q) && /(关怀|类型)/.test(q);

const isDeptRankQuery = (q: string) =>
  /(哪个部门|哪一部门|部门.*最多|部门.*排名)/.test(q);

const isPointsRankQuery = (q: string) =>
  /积分/.test(q) && /(排名|前\s*10|前十|top)/i.test(q);

const askBatchToggleCareType = (enable: boolean): HumanityCareAgentReply => ({
  summary: `请先说明要${enable ? "启用" : "停用"}哪种关怀类型：生日、节日、天气、工作强度，或全部。`,
  list: ["回复例如「生日关怀」或「全部」"],
});

const batchToggleTargetLabel = (careType: CareType | "all") =>
  careType === "all" ? "全部" : careTypeLabel[careType];

const buildBatchToggleSuccess = (
  enable: boolean,
  count: number,
  careType: CareType | "all",
) => {
  const verb = enable ? "已启用成功" : "已停用成功";
  return careType === "all"
    ? `${verb}，共 ${count} 条。`
    : `${verb}，共 ${count} 条${careTypeLabel[careType]}。`;
};

const buildStatsReply = (
  rules: CareRule[],
  intent: StatsIntent,
  range: TimeRangeKey,
  careType: CareType | "all" = "all",
  scope: StatsScope = { kind: "all" },
): HumanityCareAgentReply => {
  switch (intent) {
    case "send_stats":
      return buildSendStatsReply(rules, careType, range);
    case "messages_count":
      return buildMessagesCountReply(rules, range, scope);
    case "points_total":
      return buildPointsTotalReply(rules, range, scope);
    case "points_avg":
      return buildPointsAvgReply(rules, careType, range);
    case "coverage":
      return buildCoverageReply(rules, careType, range);
    case "guide_ctr":
      return buildGuideCtrReply(careType, range);
    case "type_share":
      return buildTypeShareReply(rules, range);
    case "dept_rank":
      return buildDeptRankReply(careType === "all" ? "birthday" : careType, range);
    case "points_rank":
      return buildPointsRankReply(careType, range);
    default:
      return { summary: "暂不支持该统计查询。" };
  }
};

const handlePickStatsScope = (
  q: string,
  pending: Extract<PendingSession, { kind: "pick_stats_scope" }>,
  rules: CareRule[],
): { reply: HumanityCareAgentReply; pending: PendingSession | null } => {
  if (pending.candidates?.length) {
    const idx = Number(q.replace(/\D/g, "")) - 1;
    const picked =
      idx >= 0 && idx < pending.candidates.length
        ? pending.candidates[idx]
        : pending.candidates.find((r) => r.name.includes(q) || q.includes(r.name));
    if (!picked) {
      return {
        reply: {
          summary: "未识别所选方案，请回复序号（如 1）或方案名称。",
          table: {
            headers: ["序号", "方案名称"],
            rows: pending.candidates.map((r, i) => [String(i + 1), r.name]),
          },
        },
        pending,
      };
    }
    const scope: StatsScope = { kind: "rule", rule: picked };
    return {
      reply: buildStatsReply(rules, pending.intent, pending.timeRange, "all", scope),
      pending: null,
    };
  }

  const parsed = parseStatsScope(q, rules);
  if (parsed === undefined) {
    return { reply: askStatsScope(), pending };
  }
  if (Array.isArray(parsed)) {
    return {
      reply: {
        summary: "匹配到多个关怀方案，请选择（回复序号）：",
        table: {
          headers: ["序号", "方案名称"],
          rows: parsed.map((r, i) => [String(i + 1), r.name]),
        },
      },
      pending: { ...pending, candidates: parsed },
    };
  }
  return {
    reply: buildStatsReply(rules, pending.intent, pending.timeRange, "all", parsed),
    pending: null,
  };
};

const resolveScopedStats = (
  rules: CareRule[],
  intent: "messages_count" | "points_total",
  range: TimeRangeKey,
  q: string,
):
  | { reply: HumanityCareAgentReply; pending: PendingSession | null }
  | { reply: HumanityCareAgentReply; pending: null; scope: StatsScope } => {
  const parsed = parseStatsScope(q, rules);
  if (parsed === undefined) {
    return {
      reply: askStatsScope(),
      pending: { kind: "pick_stats_scope", intent, timeRange: range },
    };
  }
  if (Array.isArray(parsed)) {
    return {
      reply: {
        summary: "匹配到多个关怀方案，请选择（回复序号）：",
        table: {
          headers: ["序号", "方案名称"],
          rows: parsed.map((r, i) => [String(i + 1), r.name]),
        },
      },
      pending: { kind: "pick_stats_scope", intent, timeRange: range, candidates: parsed },
    };
  }
  return {
    reply: buildStatsReply(rules, intent, range, "all", parsed),
    pending: null,
    scope: parsed,
  };
};

const handlePickCareType = (
  q: string,
  pending: Extract<PendingSession, { kind: "pick_care_type" }>,
  rules: CareRule[],
): { reply: HumanityCareAgentReply; pending: PendingSession | null; navigate?: string } => {
  const careType = parseCareType(q);
  if (!careType) {
    if (pending.intent === "batch_toggle") {
      return {
        reply: askBatchToggleCareType(pending.enable ?? true),
        pending,
      };
    }
    if (pending.intent === "send_stats") {
      return { reply: askSendStatsCareType(), pending };
    }
    if (pending.intent === "dept_rank") {
      return { reply: askCareType({ allowAll: false }), pending };
    }
    return {
      reply: askCareType({
        allowAll: pending.intent === "coverage" || pending.intent === "points_avg",
      }),
      pending,
    };
  }

  if (pending.intent === "batch_toggle") {
    const pool = careType === "all" ? rules : rules.filter((r) => r.type === careType);
    const enable = pending.enable ?? true;
    return {
      reply: {
        summary: `将${enable ? "启用" : "停用"}${batchToggleTargetLabel(careType)}共 ${pool.length} 条规则，是否确认？回复「确认」继续，回复「取消」放弃。`,
      },
      pending: {
        kind: "batch_toggle_confirm",
        careType,
        enable,
        count: pool.length,
      },
    };
  }

  if (pending.intent === "coverage") {
    return {
      reply: buildStatsReply(rules, "coverage", pending.timeRange ?? "month", careType),
      pending: null,
    };
  }

  const range = pending.timeRange ?? parseTimeRange(q);
  if (!range) {
    return {
      reply: askTimeRange(pending.intent),
      pending,
    };
  }
  if (needsCareTypeAsk(pending.intent, careType)) {
    if (pending.intent === "send_stats") {
      return {
        reply: askSendStatsCareType(),
        pending: { ...pending, timeRange: range },
      };
    }
    return {
      reply: askCareType({
        allowAll:
          pending.intent === "coverage" ||
          pending.intent === "points_avg" ||
          pending.intent === "points_rank",
      }),
      pending: { ...pending, timeRange: range },
    };
  }
  return {
    reply: buildStatsReply(rules, pending.intent, range, careType ?? "all"),
    pending: null,
  };
};

const handlePickTimeRange = (
  q: string,
  pending: Extract<PendingSession, { kind: "pick_time_range" }>,
  rules: CareRule[],
): { reply: HumanityCareAgentReply; pending: PendingSession | null } => {
  const range = parseTimeRange(q);
  if (!range) {
    return { reply: askTimeRange(pending.intent, pending.careType), pending };
  }
  const careType = pending.careType ?? parseCareType(q);
  if (statsIntentsNeedingScope.has(pending.intent)) {
    const result = resolveScopedStats(rules, pending.intent, range, q);
    if (result.pending) {
      return { reply: result.reply, pending: result.pending };
    }
    return { reply: result.reply, pending: null };
  }
  if (needsCareTypeAsk(pending.intent, careType)) {
    if (pending.intent === "send_stats") {
      return {
        reply: askSendStatsCareType(),
        pending: {
          kind: "pick_care_type",
          intent: "send_stats",
          timeRange: range,
        },
      };
    }
    return {
      reply: askCareType({
        allowAll:
          pending.intent === "coverage" ||
          pending.intent === "points_avg" ||
          pending.intent === "points_rank",
      }),
      pending: {
        kind: "pick_care_type",
        intent: pending.intent,
        timeRange: range,
      },
    };
  }
  return {
    reply: buildStatsReply(rules, pending.intent, range, careType ?? "all"),
    pending: null,
  };
};

export const dispatchHumanityCareAgent = (
  query: string,
  pending: PendingSession | null,
): { reply: HumanityCareAgentReply; pending: PendingSession | null; navigate?: string } => {
  const q = normalizeQuery(query.trim());
  const rules = getCareRulesSnapshot();

  if (pending?.kind === "delete_confirm") {
    if (/确认|确定|是/.test(q) && !/不|取消/.test(q)) {
      deleteCareRule(pending.ruleId);
      return {
        reply: { summary: `已删除成功。「${pending.ruleName}」将不再发送，已发送消息不受影响。` },
        pending: null,
      };
    }
    if (/取消|不/.test(q)) {
      return { reply: { summary: "已取消删除操作。" }, pending: null };
    }
    return {
      reply: {
        summary: `是否确认删除「${pending.ruleName}」？回复「确认」继续，回复「取消」放弃。`,
        list: ["删除后将停止发送，已发送消息不受影响"],
      },
      pending,
    };
  }

  if (pending?.kind === "toggle_confirm") {
    if (/确认|确定|是/.test(q) && !/不|取消/.test(q)) {
      setCareRuleEnabled(pending.ruleId, pending.enable);
      return {
        reply: {
          summary: pending.enable
            ? `已启用成功。「${pending.ruleName}」已恢复发送。`
            : `已停用成功。「${pending.ruleName}」已暂停发送。`,
        },
        pending: null,
      };
    }
    if (/取消|不/.test(q)) {
      return {
        reply: { summary: `已取消${pending.enable ? "启用" : "停用"}操作。` },
        pending: null,
      };
    }
    return {
      reply: {
        summary: `是否确认${pending.enable ? "启用" : "停用"}「${pending.ruleName}」？回复「确认」继续，回复「取消」放弃。`,
      },
      pending,
    };
  }

  if (pending?.kind === "batch_toggle_confirm") {
    if (/确认|确定|是/.test(q) && !/不|取消/.test(q)) {
      const pool =
        pending.careType === "all"
          ? rules
          : rules.filter((r) => r.type === pending.careType);
      pool.forEach((r) => setCareRuleEnabled(r.id, pending.enable));
      return {
        reply: {
          summary: buildBatchToggleSuccess(
            pending.enable,
            pending.count,
            pending.careType,
          ),
        },
        pending: null,
      };
    }
    if (/取消|不/.test(q)) {
      return { reply: { summary: "已取消批量操作。" }, pending: null };
    }
    return {
      reply: {
        summary: `是否确认批量${pending.enable ? "启用" : "停用"}${batchToggleTargetLabel(pending.careType)}？回复「确认」继续，回复「取消」放弃。`,
      },
      pending,
    };
  }

  if (pending?.kind === "modify_confirm") {
    if (/确认|确定|是/.test(q) && !/不|取消/.test(q)) {
      const rule = rules.find((r) => r.id === pending.ruleId);
      if (!rule) {
        return { reply: { summary: "规则不存在或已被删除。" }, pending: null };
      }
      upsertCareRule({
        ...rule,
        points: pending.changes.points ?? rule.points,
        triggerTime: pending.changes.triggerTime ?? rule.triggerTime,
      });
      const parts: string[] = [];
      if (pending.changes.points !== undefined) parts.push(`积分 ${pending.changes.points} 分`);
      if (pending.changes.triggerTime) parts.push(`触达时间 ${pending.changes.triggerTime}`);
      return {
        reply: { summary: `已更新「${pending.ruleName}」：${parts.join("、")}。` },
        pending: null,
      };
    }
    if (/取消|不/.test(q)) {
      return { reply: { summary: "已取消修改。" }, pending: null };
    }
    return {
      reply: {
        summary: `请确认修改「${pending.ruleName}」，回复「确认」继续，回复「取消」放弃。`,
      },
      pending,
    };
  }

  if (pending?.kind === "pick_care_type") {
    return handlePickCareType(q, pending, rules);
  }

  if (pending?.kind === "pick_stats_scope") {
    return handlePickStatsScope(q, pending, rules);
  }

  if (pending?.kind === "pick_time_range") {
    return handlePickTimeRange(q, pending, rules);
  }

  if (pending?.kind === "pick_rule") {
    const idx = Number(q.replace(/\D/g, "")) - 1;
    const picked =
      idx >= 0 && idx < pending.candidates.length
        ? pending.candidates[idx]
        : pending.candidates.find((r) => r.name.includes(q) || q.includes(r.name));

    if (!picked) {
      return {
        reply: {
          summary: "未识别所选规则，请回复序号（如 1）或规则名称。",
          table: {
            headers: ["序号", "规则名称", "状态"],
            rows: pending.candidates.map((r, i) => [
              String(i + 1),
              r.name,
              r.enabled ? "已启用" : "已停用",
            ]),
          },
        },
        pending,
      };
    }

    if (pending.intent === "detail" || pending.intent === "nav_detail") {
      return {
        reply: {
          ...buildRuleDetailReply(picked),
          actions: [{ label: "查看规则详情", type: "navigate", payload: ruleEditPath(picked) }],
        },
        pending: null,
        navigate: ruleEditPath(picked),
      };
    }

    if (pending.intent === "delete") {
      return {
        reply: {
          summary: `是否确认删除「${picked.name}」？回复「确认」继续，回复「取消」放弃。`,
          list: ["删除后将停止发送，已发送消息不受影响"],
        },
        pending: { kind: "delete_confirm", ruleId: picked.id, ruleName: picked.name },
      };
    }

    if (pending.intent === "toggle") {
      const enable = pending.enable ?? true;
      return {
        reply: {
          summary: `是否确认${enable ? "启用" : "停用"}「${picked.name}」？回复「确认」继续，回复「取消」放弃。`,
        },
        pending: {
          kind: "toggle_confirm",
          ruleId: picked.id,
          ruleName: picked.name,
          enable,
        },
      };
    }

    if (pending.intent === "nav_modify") {
      const path = moduleListPath(picked.type);
      return {
        reply: {
          summary: `请在列表中选择要修改的方案，或打开「${picked.name}」进行编辑。`,
          actions: [
            { label: `打开${careTypeLabel[picked.type]}列表`, type: "navigate", payload: path },
            { label: "编辑该规则", type: "navigate", payload: ruleEditPath(picked) },
          ],
        },
        pending: null,
        navigate: ruleEditPath(picked),
      };
    }

    if (pending.intent === "modify" && pending.modifyDraft) {
      return {
        reply: {
          summary: `将修改「${picked.name}」：${
            pending.modifyDraft.points !== undefined
              ? `积分 → ${pending.modifyDraft.points} 分`
              : ""
          }${
            pending.modifyDraft.triggerTime
              ? `触达时间 → ${pending.modifyDraft.triggerTime}`
              : ""
          }。回复「确认」继续，回复「取消」放弃。`,
        },
        pending: {
          kind: "modify_confirm",
          ruleId: picked.id,
          ruleName: picked.name,
          changes: pending.modifyDraft,
        },
      };
    }
  }

  // --- 新建关怀 ---
  if (/新建/.test(q) && /关怀|规则|方案/.test(q)) {
    const careType = parseCareType(q);
    if (!careType || careType === "all") {
      return {
        reply: {
          summary: "要新建哪种关怀？可选择：生日、节日、天气或工作强度关怀。",
          actions: (Object.keys(careModules) as CareType[]).map((t) => ({
            label: `新建${careTypeLabel[t]}`,
            type: "navigate" as const,
            payload: moduleNewPath(t),
          })),
        },
        pending: null,
      };
    }
    const qs = new URLSearchParams();
    if (/研发/.test(q)) qs.set("audience", "研发中心");
    if (/全员|全公司/.test(q)) qs.set("audience", "全公司员工");
    const points = extractPoints(q);
    if (points) qs.set("points", String(points));
    if (/09:00|当天/.test(q)) qs.set("trigger", "生日当天 09:00");
    const path = moduleNewPath(careType, qs);
    return {
      reply: {
        summary: `正在为你打开${careTypeLabel[careType]}创建页…`,
        actions: [{ label: `新建${careTypeLabel[careType]}`, type: "navigate", payload: path }],
      },
      pending: null,
      navigate: path,
    };
  }

  // --- 删除 ---
  if (/删除/.test(q) && /关怀|规则|方案/.test(q)) {
    const careType = parseCareType(q);
    const matched = matchRules(q, rules, careType === "all" ? undefined : careType);
    if (!matched.length) {
      return { reply: { summary: "未找到可删除的关怀规则。" }, pending: null };
    }
    if (matched.length === 1) {
      return {
        reply: {
          summary: `是否确认删除「${matched[0].name}」？回复「确认」继续，回复「取消」放弃。`,
          list: ["删除后将停止发送，已发送消息不受影响"],
        },
        pending: {
          kind: "delete_confirm",
          ruleId: matched[0].id,
          ruleName: matched[0].name,
        },
      };
    }
    return {
      reply: {
        summary: "找到多条规则，请选择要删除的方案（回复序号）：",
        table: {
          headers: ["序号", "规则名称", "状态"],
          rows: matched.map((r, i) => [
            String(i + 1),
            r.name,
            r.enabled ? "已启用" : "已停用",
          ]),
        },
      },
      pending: { kind: "pick_rule", intent: "delete", candidates: matched },
    };
  }

  // --- 启用 / 停用 ---
  if (/批量/.test(q) && /(启用|停用)/.test(q)) {
    const enable = /启用/.test(q);
    const careType = parseCareType(q);
    if (!careType) {
      return {
        reply: askBatchToggleCareType(enable),
        pending: { kind: "pick_care_type", intent: "batch_toggle", enable },
      };
    }
    const pool =
      careType === "all" ? rules : rules.filter((r) => r.type === careType);
    return {
      reply: {
        summary: `将${enable ? "启用" : "停用"}${batchToggleTargetLabel(careType)}共 ${pool.length} 条规则，是否确认？回复「确认」继续，回复「取消」放弃。`,
      },
      pending: {
        kind: "batch_toggle_confirm",
        careType,
        enable,
        count: pool.length,
      },
    };
  }

  if (/(启用|停用)/.test(q) && /关怀|规则|方案/.test(q)) {
    const enable = /启用/.test(q);
    const careType = parseCareType(q);
    const matched = matchRules(q, rules, careType === "all" ? undefined : careType);
    if (!matched.length) {
      return { reply: { summary: "未找到匹配的关怀规则。" }, pending: null };
    }
    if (matched.length === 1) {
      return {
        reply: {
          summary: `是否确认${enable ? "启用" : "停用"}「${matched[0].name}」？回复「确认」继续，回复「取消」放弃。`,
        },
        pending: {
          kind: "toggle_confirm",
          ruleId: matched[0].id,
          ruleName: matched[0].name,
          enable,
        },
      };
    }
    return {
      reply: {
        summary: `找到多条规则，请选择要${enable ? "启用" : "停用"}的方案（回复序号）：`,
        table: {
          headers: ["序号", "规则名称", "状态"],
          rows: matched.map((r, i) => [
            String(i + 1),
            r.name,
            r.enabled ? "已启用" : "已停用",
          ]),
        },
      },
      pending: {
        kind: "pick_rule",
        intent: "toggle",
        candidates: matched,
        enable,
      },
    };
  }

  // --- 修改（跳转） ---
  if (/修改/.test(q) && /关怀|规则|方案/.test(q)) {
    const careType = parseCareType(q);
    const matched = matchRules(q, rules, careType === "all" ? undefined : careType);
    const points = extractPoints(q);
    const triggerTime = extractTriggerTime(q);

    if (points || triggerTime) {
      if (!matched.length) {
        return { reply: { summary: "未找到匹配的关怀规则。" }, pending: null };
      }
      const draft = { points, triggerTime };
      if (matched.length === 1) {
        return {
          reply: {
            summary: `将修改「${matched[0].name}」，回复「确认」继续，回复「取消」放弃：`,
            list: [
              points !== undefined ? `积分 → ${points} 分` : "",
              triggerTime ? `触达时间 → ${triggerTime}` : "",
            ].filter(Boolean),
          },
          pending: {
            kind: "modify_confirm",
            ruleId: matched[0].id,
            ruleName: matched[0].name,
            changes: draft,
          },
        };
      }
      return {
        reply: {
          summary: "找到多条规则，请选择要修改的方案（回复序号）：",
          table: {
            headers: ["序号", "规则名称", "当前积分"],
            rows: matched.map((r, i) => [String(i + 1), r.name, String(r.points)]),
          },
        },
        pending: {
          kind: "pick_rule",
          intent: "modify",
          candidates: matched,
          modifyDraft: draft,
        },
      };
    }

    if (matched.length === 1) {
      const path = ruleEditPath(matched[0]);
      return {
        reply: {
          summary: `正在打开「${matched[0].name}」详情页，可在此修改配置。`,
          actions: [{ label: "打开规则详情", type: "navigate", payload: path }],
        },
        pending: null,
        navigate: path,
      };
    }

    const type = careType && careType !== "all" ? careType : matched[0]?.type ?? "birthday";
    const path = moduleListPath(type);
    if (matched.length > 1) {
      return {
        reply: {
          summary: "匹配到多条规则，请选择要修改的方案（回复序号），或前往列表页：",
          table: {
            headers: ["序号", "规则名称"],
            rows: matched.map((r, i) => [String(i + 1), r.name]),
          },
          actions: [{ label: `打开${careTypeLabel[type]}列表`, type: "navigate", payload: path }],
        },
        pending: { kind: "pick_rule", intent: "nav_modify", candidates: matched },
      };
    }
    return {
      reply: {
        summary: `请先在${careTypeLabel[type]}列表中选择要修改的方案。`,
        actions: [{ label: `打开${careTypeLabel[type]}列表`, type: "navigate", payload: path }],
      },
      pending: null,
      navigate: path,
    };
  }

  // --- 查询规则详情 ---
  if (/(查询|查看)/.test(q) && /详情/.test(q) && /关怀|规则|方案/.test(q)) {
    const careType = parseCareType(q);
    const matched = matchRules(q, rules, careType === "all" ? undefined : careType);
    if (matched.length === 1) {
      const path = ruleEditPath(matched[0]);
      return {
        reply: {
          ...buildRuleDetailReply(matched[0]),
          actions: [{ label: "打开规则详情", type: "navigate", payload: path }],
        },
        pending: null,
        navigate: path,
      };
    }
    if (matched.length > 1) {
      return {
        reply: {
          summary: "匹配到多条规则，请选择要查看的方案（回复序号）：",
          table: {
            headers: ["序号", "规则名称"],
            rows: matched.map((r, i) => [String(i + 1), r.name]),
          },
        },
        pending: { kind: "pick_rule", intent: "nav_detail", candidates: matched },
      };
    }
    return { reply: { summary: "请先说明要查看哪条规则，例如规则名称。" }, pending: null };
  }

  // --- 规则列表 ---
  if (/(查询|查看)/.test(q) && /规则|方案/.test(q) && !/详情|统计|发送|积分|覆盖/.test(q)) {
    const careType = parseCareType(q) ?? "birthday";
    if (careType === "all") {
      return { reply: buildRuleCountReply(rules), pending: null };
    }
    const typed = rules.filter((r) => r.type === careType);
    if (!typed.length) {
      return { reply: { summary: `当前没有${careTypeLabel[careType]}规则。` }, pending: null };
    }
    return {
      reply: {
        summary: `共 ${typed.length} 条${careTypeLabel[careType]}规则：`,
        table: {
          headers: ["规则名称", "状态", "覆盖对象", "下次触达"],
          rows: typed.map((r) => [
            r.name,
            r.enabled ? "已启用" : "已停用",
            r.audience,
            r.triggerTime,
          ]),
        },
      },
      pending: null,
    };
  }

  // --- 规则数量 ---
  if (isRuleCountQuery(q)) {
    const careType = parseCareType(q) ?? "all";
    return { reply: buildRuleCountReply(rules, careType), pending: null };
  }

  // --- 未收到生日关怀 ---
  if (/还没收到|未收到|没有收到/.test(q) && /生日/.test(q)) {
    return { reply: buildUnpaidBirthdayReply(), pending: null };
  }

  // --- 消息发送总数 ---
  if (isMessagesCountQuery(q)) {
    const range = parseTimeRange(q);
    if (!range) {
      return {
        reply: askTimeRange("messages_count"),
        pending: { kind: "pick_time_range", intent: "messages_count" },
      };
    }
    const result = resolveScopedStats(rules, "messages_count", range, q);
    if (result.pending) {
      return { reply: result.reply, pending: result.pending };
    }
    return { reply: result.reply, pending: null };
  }

  // --- 积分发放总量 ---
  if (isPointsTotalQuery(q)) {
    const range = parseTimeRange(q);
    if (!range) {
      return {
        reply: askTimeRange("points_total"),
        pending: { kind: "pick_time_range", intent: "points_total" },
      };
    }
    const result = resolveScopedStats(rules, "points_total", range, q);
    if (result.pending) {
      return { reply: result.reply, pending: result.pending };
    }
    return { reply: result.reply, pending: null };
  }

  // --- 积分 + 人均 ---
  if (isPointsAvgQuery(q)) {
    const range = parseTimeRange(q);
    const careType = parseCareType(q);
    if (!range) {
      return {
        reply: askTimeRange("points_avg", careType),
        pending: {
          kind: "pick_time_range",
          intent: "points_avg",
          careType: careType ?? undefined,
        },
      };
    }
    if (!careType) {
      return {
        reply: askCareType({ allowAll: true }),
        pending: { kind: "pick_care_type", intent: "points_avg", timeRange: range },
      };
    }
    return {
      reply: buildStatsReply(rules, "points_avg", range, careType),
      pending: null,
    };
  }

  // --- 覆盖员工 ---
  if (isCoverageQuery(q)) {
    const careType = parseCareType(q);
    if (!careType) {
      return {
        reply: askCareType({ allowAll: true }),
        pending: { kind: "pick_care_type", intent: "coverage" },
      };
    }
    return {
      reply: buildStatsReply(rules, "coverage", "month", careType),
      pending: null,
    };
  }

  // --- 消费引导 ---
  if (isGuideCtrQuery(q)) {
    const range = parseTimeRange(q);
    const careType = parseCareType(q);
    if (!range) {
      return {
        reply: askTimeRange("guide_ctr", careType),
        pending: {
          kind: "pick_time_range",
          intent: "guide_ctr",
          careType: careType ?? undefined,
        },
      };
    }
    if (!careType) {
      return {
        reply: askCareType({ allowAll: true }),
        pending: { kind: "pick_care_type", intent: "guide_ctr", timeRange: range },
      };
    }
    return {
      reply: buildStatsReply(rules, "guide_ctr", range, careType),
      pending: null,
    };
  }

  // --- 类型占比 ---
  if (isTypeShareQuery(q)) {
    const range = parseTimeRange(q);
    if (!range) {
      return {
        reply: askTimeRange("type_share"),
        pending: { kind: "pick_time_range", intent: "type_share" },
      };
    }
    return { reply: buildStatsReply(rules, "type_share", range), pending: null };
  }

  // --- 部门排名 ---
  if (isDeptRankQuery(q)) {
    const range = parseTimeRange(q);
    const careType = parseCareType(q);
    if (!range) {
      return {
        reply: askTimeRange("dept_rank", careType),
        pending: {
          kind: "pick_time_range",
          intent: "dept_rank",
          careType: careType && careType !== "all" ? careType : undefined,
        },
      };
    }
    if (!careType || careType === "all") {
      return {
        reply: askCareType({ allowAll: false }),
        pending: { kind: "pick_care_type", intent: "dept_rank", timeRange: range },
      };
    }
    return {
      reply: buildStatsReply(rules, "dept_rank", range, careType),
      pending: null,
    };
  }

  // --- 积分排名 ---
  if (isPointsRankQuery(q)) {
    const range = parseTimeRange(q);
    const careType = parseCareType(q);
    const topM = q.match(/前\s*(\d+)/);
    const topN = topM ? Number(topM[1]) : 10;
    if (!range) {
      return {
        reply: {
          ...askTimeRange("points_rank", careType),
          list: ["可回复「今年」或「全部时间」"],
        },
        pending: {
          kind: "pick_time_range",
          intent: "points_rank",
          careType: careType ?? undefined,
        },
      };
    }
    if (!careType) {
      return {
        reply: askCareType({ allowAll: true }),
        pending: { kind: "pick_care_type", intent: "points_rank", timeRange: range },
      };
    }
    return {
      reply: buildPointsRankReply(careType, range, topN),
      pending: null,
    };
  }

  // --- 统计：发送统计表（按方案） ---
  if (isSendStatsQuery(q)) {
    const range = parseTimeRange(q);
    const careType = parseCareType(q);
    if (!range) {
      return {
        reply: askTimeRange("send_stats", careType),
        pending: {
          kind: "pick_time_range",
          intent: "send_stats",
          careType: careType && careType !== "all" ? careType : undefined,
        },
      };
    }
    if (!careType || careType === "all") {
      return {
        reply: askSendStatsCareType(),
        pending: { kind: "pick_care_type", intent: "send_stats", timeRange: range },
      };
    }
    return {
      reply: buildStatsReply(rules, "send_stats", range, careType),
      pending: null,
    };
  }

  // --- 全局概览 ---
  if (
    /整体|全局|概览|数据概览|统计概览/.test(q) ||
    (/统计/.test(q) && /规则|方案|覆盖|积分/.test(q))
  ) {
    const enabled = rules.filter((r) => r.enabled).length;
    const disabled = rules.length - enabled;
    const byType = (Object.keys(careTypeLabel) as CareType[]).map((t) => ({
      type: careTypeLabel[t],
      count: rules.filter((r) => r.type === t).length,
      reached: rules.filter((r) => r.type === t).reduce((a, r) => a + r.reached, 0),
    }));
    return {
      reply: {
        summary: "已为你汇总全局关怀统计数据：",
        table: {
          headers: ["指标", "数值"],
          rows: [
            ["关怀规则总数", String(rules.length)],
            ["已启用", String(enabled)],
            ["已停用", String(disabled)],
            ["今日触达", String(globalStatsDemo.today)],
            ["本周触达", String(globalStatsDemo.week)],
            ["本月触达", String(globalStatsDemo.month)],
            ["覆盖员工（去重）", globalStatsDemo.covered.toLocaleString()],
            ["积分发放合计", globalStatsDemo.pointsTotal.toLocaleString()],
            ["人均积分", String(globalStatsDemo.pointsAvg)],
            ["消费引导点击", String(globalStatsDemo.guideClicks)],
            ["消费引导点击率", globalStatsDemo.guideCtr],
          ],
        },
        table2: {
          headers: ["关怀类型", "规则数", "触达人次"],
          rows: byType.map((x) => [x.type, String(x.count), String(x.reached)]),
        },
      },
      pending: null,
    };
  }

  return {
    reply: {
      summary:
        "我可以帮你管理关怀规则、查询统计数据。试试：\n· 帮我新建一个节日关怀\n· 停用全员生日祝福规则\n· 本月一共发送了多少条关怀消息？\n· 哪些员工还没收到生日关怀\n· 查看积分发放总量",
      list: [
        "支持多轮对话：例如先查列表，再回复序号进行删除、启用或查看详情",
        "二次确认请回复「确认」继续，或回复「取消」放弃",
      ],
    },
    pending: null,
  };
};

function buildRuleDetailReply(rule: CareRule): HumanityCareAgentReply {
  return {
    summary: `「${rule.name}」规则详情：`,
    table: {
      headers: ["字段", "内容"],
      rows: [
        ["类型", careTypeLabel[rule.type]],
        ["状态", rule.enabled ? "已启用" : "已停用"],
        ["关怀对象", rule.audience],
        ["触达时间", rule.triggerTime],
        ["积分", `${rule.points} 分`],
        ["累计触达", `${rule.reached} 人次`],
        ["文案模板", rule.template.slice(0, 24) + (rule.template.length > 24 ? "…" : "")],
      ],
    },
  };
}
