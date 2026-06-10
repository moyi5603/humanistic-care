import {
  careModules,
  type CareRule,
  type CareType,
} from "@/data/humanityCare";
import { getCareRulesSnapshot } from "@/data/careRulesStore";

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

export type ManageIntent = "delete" | "modify" | "query" | "enable" | "disable";

export type PendingSession =
  | { kind: "pick_manage_target"; intent: ManageIntent }
  | {
      kind: "pick_manage_rule";
      intent: ManageIntent;
      candidates: CareRule[];
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
    .replace(/创建|新增|添加|建立|配置一条|配一个|加一个/g, "新建")
    .replace(/移除|删掉|作废|去掉|不要了|干掉|清除/g, "删除")
    .replace(/编辑|调整|改动|更新|变更|改一下|改下|设置一下|设置下/g, "修改")
    .replace(/开启|上线|打开生效|恢复|开起来|重新开|重新启用/g, "启用")
    .replace(/关闭|下线|暂停|失效|停掉|停了|关停|先停|先关/g, "停用")
    .replace(/查一查|看一看|瞅一眼|了解下|介绍一下|告诉我|什么情况|怎么样/g, "查看")
    .replace(/查一下|查查|查询一下/g, "查询")
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
  if (m?.[1]) return m[1];
  const named = q.match(
    /(?:名叫|叫做|名为|方案名(?:称)?[是为:：]?|名称[是为:：]?|叫)([^\s,，。！？!?]+)/,
  );
  return named?.[1];
};

const MANAGE_SCOPE_RE =
  /关怀|规则|方案|配置|策略|计划|那条|这条|这个|该项|那一项/;

const isStatsLikeQuery = (q: string) =>
  /触达情况|触达了多少|触达了多少人|触达人次|本月.*触达|本周.*触达|今年.*触达|发送了多少|发了多少|多少条.*消息|消息.*多少|发送统计|积分发放|积分总量|覆盖.*人|占比|排名|人均|消费引导|点击率|还没收到|未收到/.test(
    q,
  );

const parseManageIntent = (q: string): ManageIntent | undefined => {
  if (/删除/.test(q)) return "delete";
  if (/修改/.test(q)) return "modify";
  if (/停用/.test(q)) return "disable";
  if (/启用/.test(q)) return "enable";
  if (
    /查询|查看|详情|资料|信息|内容|是什么|有哪些|有什么|配置情况/.test(q) &&
    !isStatsLikeQuery(q)
  ) {
    return "query";
  }
  return undefined;
};

const stripForNameMatch = (q: string) => {
  let s = q;
  s = s.replace(
    /帮我|请|麻烦|能不能|可不可以|可以|想要|我想|我要|把|将|给|先|一下|一下子/g,
    "",
  );
  s = s.replace(
    /删除|修改|启用|停用|查看|查询|详情|批量|一下|一下子|看看|了解|介绍|告诉|什么|怎么样|情况|资料|信息|内容|配置|策略|计划|那条|这条|这个/g,
    "",
  );
  s = s.replace(/规则|方案|关怀|配置|策略|计划/g, "");
  for (const label of Object.values(careTypeLabel)) {
    s = s.replace(new RegExp(label, "g"), "");
  }
  for (const mod of Object.values(careModules)) {
    s = s.replace(new RegExp(mod.short, "g"), "");
  }
  return s.replace(/[的了吗呢啊吧嘛,，。！？!?\s]+/g, "").trim();
};

const fuzzyNameMatch = (ruleName: string, hint: string) => {
  const h = hint.trim();
  if (!h || h.length < 2) return false;
  if (ruleName === h || ruleName.includes(h) || h.includes(ruleName)) return true;
  return false;
};

const findRulesByNameHint = (q: string, pool: CareRule[]): CareRule[] => {
  const quoted = extractQuoted(q);
  if (quoted) {
    const matched = pool.filter((r) => fuzzyNameMatch(r.name, quoted));
    if (matched.length) return matched;
  }

  const direct = pool.filter((r) => q.includes(r.name));
  if (direct.length) return direct;

  const cleaned = stripForNameMatch(q);
  if (cleaned.length >= 2) {
    const byCleaned = pool.filter((r) => fuzzyNameMatch(r.name, cleaned));
    if (byCleaned.length) return byCleaned;
  }

  const partial: CareRule[] = [];
  for (const rule of pool) {
    for (let len = Math.min(rule.name.length, 8); len >= 2; len--) {
      for (let i = 0; i <= rule.name.length - len; i++) {
        const sub = rule.name.slice(i, i + len);
        if (q.includes(sub)) {
          partial.push(rule);
          break;
        }
      }
      if (partial.includes(rule)) break;
    }
  }
  return partial;
};

const matchesManageScope = (q: string, rules: CareRule[]) => {
  if (MANAGE_SCOPE_RE.test(q)) return true;
  if (parseCareType(q)) return true;
  if (extractQuoted(q)) return true;
  if (findRulesByNameHint(q, rules).length > 0) return true;
  return false;
};

const extractPoints = (q: string) => {
  const m = q.match(/(\d+)\s*分/);
  return m ? Number(m[1]) : undefined;
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

const askClarify = (field: string, examples: string, extra?: string): HumanityCareAgentReply => ({
  summary: `请先明确${field}。`,
  list: [`可回复：${examples}`, ...(extra ? [extra] : [])],
});

const withNavigateActions = (
  text: string,
  actions: AgentAction[],
): HumanityCareAgentReply => ({
  summary: actions.length ? `${text}请点击下方按钮继续。` : text,
  actions,
});

const manageVerb: Record<ManageIntent, string> = {
  delete: "删除",
  modify: "修改",
  query: "查看",
  enable: "启用",
  disable: "停用",
};

const manageTargetField: Record<ManageIntent, string> = {
  delete: "要删除的关怀类型或方案名称",
  modify: "要修改的关怀类型或方案名称",
  query: "要查看的关怀类型或方案名称",
  enable: "要启用的关怀类型或方案名称",
  disable: "要停用的关怀类型或方案名称",
};

const askManageTarget = (intent: ManageIntent): HumanityCareAgentReply =>
  askClarify(manageTargetField[intent], "生日关怀、全员生日祝福、ABC");

const usesDetailPage = (intent: ManageIntent) =>
  intent === "modify" || intent === "query";

type ManageTarget =
  | { kind: "type"; careType: CareType }
  | { kind: "rule"; careType: CareType; ruleName: string }
  | { kind: "ambiguous"; candidates: CareRule[] };

const resolveManageTarget = (q: string, rules: CareRule[]): ManageTarget | undefined => {
  const careType = parseCareType(q);
  const scopedPool =
    careType && careType !== "all"
      ? rules.filter((r) => r.type === careType)
      : rules;

  const scopedMatches = findRulesByNameHint(q, scopedPool);
  if (scopedMatches.length === 1) {
    return {
      kind: "rule",
      careType: scopedMatches[0].type,
      ruleName: scopedMatches[0].name,
    };
  }
  if (scopedMatches.length > 1) {
    return { kind: "ambiguous", candidates: scopedMatches };
  }

  if (careType && careType !== "all") return { kind: "type", careType };

  const globalMatches = findRulesByNameHint(q, rules);
  if (globalMatches.length === 1) {
    return {
      kind: "rule",
      careType: globalMatches[0].type,
      ruleName: globalMatches[0].name,
    };
  }
  if (globalMatches.length > 1) {
    return { kind: "ambiguous", candidates: globalMatches };
  }

  return undefined;
};

const buildManageNavigateReply = (
  intent: ManageIntent,
  careType: CareType,
  rule?: CareRule,
): HumanityCareAgentReply => {
  const verb = manageVerb[intent];

  if (rule && usesDetailPage(intent)) {
    return withNavigateActions(
      `已定位方案「${rule.name}」，请前往详情页${verb}。`,
      [{ label: "打开规则详情", type: "navigate", payload: ruleEditPath(rule) }],
    );
  }

  const path = moduleListPath(careType);
  const text = rule
    ? `已定位方案「${rule.name}」，请前往${careTypeLabel[careType]}列表完成${verb}。`
    : `请前往${careTypeLabel[careType]}列表选择要${verb}的方案。`;
  return withNavigateActions(text, [
    { label: `打开${careTypeLabel[careType]}列表`, type: "navigate", payload: path },
  ]);
};

const buildQueryRuleReply = (rule: CareRule): HumanityCareAgentReply => {
  const detail = buildRuleDetailReply(rule);
  return {
    ...detail,
    summary: `${detail.summary}请点击下方按钮查看详情。`,
    actions: [{ label: "打开规则详情", type: "navigate", payload: ruleEditPath(rule) }],
  };
};

const ambiguousManageSummary = (intent: ManageIntent) =>
  `匹配到多个方案，请先明确要${manageVerb[intent]}的方案（可回复序号或名称）。`;

const managePickTable = (intent: ManageIntent, candidates: CareRule[]): AgentTable => {
  if (intent === "enable" || intent === "disable") {
    return {
      headers: ["序号", "方案名称", "状态"],
      rows: candidates.map((r, i) => [
        String(i + 1),
        r.name,
        r.enabled ? "已启用" : "已停用",
      ]),
    };
  }
  return {
    headers: ["序号", "方案名称", "关怀类型"],
    rows: candidates.map((r, i) => [
      String(i + 1),
      r.name,
      careTypeLabel[r.type],
    ]),
  };
};

const replyManageTarget = (
  q: string,
  rules: CareRule[],
  intent: ManageIntent,
): { reply: HumanityCareAgentReply; pending: PendingSession | null } => {
  const resolved = resolveManageTarget(q, rules);
  if (!resolved) {
    return {
      reply: askManageTarget(intent),
      pending: { kind: "pick_manage_target", intent },
    };
  }
  if (resolved.kind === "ambiguous") {
    return {
      reply: {
        summary: ambiguousManageSummary(intent),
        table: managePickTable(intent, resolved.candidates),
      },
      pending: {
        kind: "pick_manage_rule",
        intent,
        candidates: resolved.candidates,
      },
    };
  }
  if (resolved.kind === "rule") {
    const rule = rules.find(
      (r) => r.type === resolved.careType && r.name === resolved.ruleName,
    );
    if (intent === "query" && rule) {
      return { reply: buildQueryRuleReply(rule), pending: null };
    }
    return {
      reply: buildManageNavigateReply(intent, resolved.careType, rule),
      pending: null,
    };
  }
  return {
    reply: buildManageNavigateReply(intent, resolved.careType),
    pending: null,
  };
};

const replyPickedManageRule = (
  picked: CareRule,
  intent: ManageIntent,
): { reply: HumanityCareAgentReply; pending: null } => {
  if (intent === "query") {
    return { reply: buildQueryRuleReply(picked), pending: null };
  }
  return {
    reply: buildManageNavigateReply(intent, picked.type, picked),
    pending: null,
  };
};

const tryDispatchManage = (
  q: string,
  rules: CareRule[],
): { reply: HumanityCareAgentReply; pending: PendingSession | null } | null => {
  const intent = parseManageIntent(q);
  if (!intent || !matchesManageScope(q, rules)) return null;
  return replyManageTarget(q, rules, intent);
};

const moduleNewPath = (type: CareType, qs?: URLSearchParams) =>
  `/agents/humanity-care/${type}/new${qs?.toString() ? `?${qs}` : ""}`;

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

const buildRuleCountTable = (
  rules: CareRule[],
  careType: CareType | "all" = "all",
): AgentTable => {
  const types =
    careType === "all"
      ? (Object.keys(careTypeLabel) as CareType[])
      : [careType];
  return {
    headers: ["关怀类型", "总数", "启用中", "已停用"],
    rows: types.map((t) => {
      const typed = rules.filter((r) => r.type === t);
      const enabled = typed.filter((r) => r.enabled).length;
      return [
        careTypeLabel[t],
        String(typed.length),
        String(enabled),
        String(typed.length - enabled),
      ];
    }),
  };
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
      ? `目前已有 ${pool.length} 个关怀方案，启用 ${enabled} 个，停用 ${disabled} 个，明细如下：`
      : `目前共有 ${pool.length} 个${careTypeLabel[careType]}方案，启用 ${enabled} 个，停用 ${disabled} 个，明细如下：`;
  return {
    summary,
    table: buildRuleCountTable(rules, careType),
  };
};

const buildSchemeStatsTable = (pool: CareRule[], range: TimeRangeKey): AgentTable => {
  let totalPoints = 0;
  let totalReached = 0;
  const rows = pool.map((r) => {
    const points = scaleByTime(
      r.points * Math.max(1, Math.round(r.reached * 0.08)),
      range,
    );
    const reached = scaleByTime(r.reached, range);
    totalPoints += points;
    totalReached += reached;
    return [careTypeLabel[r.type], r.name, String(points), String(reached)];
  });
  rows.push(["合计", "—", String(totalPoints), String(totalReached)]);
  return {
    headers: ["关怀类型", "方案名称", "累计发放积分", "触达人次"],
    rows,
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
    table: buildSchemeStatsTable(filtered, range),
  };
};

const buildMessagesCountReply = (
  rules: CareRule[],
  range: TimeRangeKey,
  scope: StatsScope,
): HumanityCareAgentReply => {
  const pool = resolveRulesByScope(rules, scope);
  const label = statsScopeLabel(scope);
  const table = buildSchemeStatsTable(pool, range);
  const totalRow = table.rows[table.rows.length - 1];
  const total = totalRow[3];
  const summary =
    scope.kind === "all"
      ? range === "month"
        ? `${timeRangeLabel[range]}一共发送 ${total} 条消息，明细如下：`
        : `${timeRangeLabel[range]}共发送 ${total} 条消息，明细如下：`
      : `${timeRangeLabel[range]}${label}共发送 ${total} 条消息，明细如下：`;
  return { summary, table };
};

const buildPointsTotalReply = (
  rules: CareRule[],
  range: TimeRangeKey,
  scope: StatsScope,
): HumanityCareAgentReply => {
  const pool = resolveRulesByScope(rules, scope);
  const label = statsScopeLabel(scope);
  const table = buildSchemeStatsTable(pool, range);
  const totalRow = table.rows[table.rows.length - 1];
  const total = totalRow[2];
  const summary =
    scope.kind === "all"
      ? `${timeRangeLabel[range]}一共发放 ${total} 积分，明细如下：`
      : `${timeRangeLabel[range]}${label}一共发放 ${total} 积分，明细如下：`;
  return { summary, table };
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

const askTimeRange = (_intent: StatsIntent, careType?: CareType | "all"): HumanityCareAgentReply =>
  askClarify(
    "统计时间范围",
    "今日、本周、本月、上月、今年",
    careType === undefined ? "也可一并说明关怀类型，如「本月生日关怀」" : undefined,
  );

const askCareType = (opts?: { allowAll?: boolean }): HumanityCareAgentReply =>
  askClarify(
    "关怀类型",
    opts?.allowAll
      ? "全部、生日关怀、节日关怀、天气关怀、工作强度关怀"
      : "生日关怀、节日关怀、天气关怀、工作强度关怀",
  );

const askSendStatsCareType = (): HumanityCareAgentReply => askCareType({ allowAll: false });

const askStatsScope = (): HumanityCareAgentReply =>
  askClarify("统计范围", "全部、生日关怀、全员生日祝福");

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

const isPeriodMessagesTotalQuery = (q: string) =>
  /(今日|本周|本月)\s*发送\s*消息\s*总数/.test(q);

const isMessagesCountQuery = (q: string) =>
  isPeriodMessagesTotalQuery(q) ||
  /发送\s*消息\s*总数/.test(q) ||
  (/(一共发送|发送了多少|多少条.*消息|消息总数|共发送)/.test(q) &&
    /(关怀|消息)/.test(q));

const shouldDefaultMessagesScopeAll = (q: string, rules: CareRule[]) => {
  if (isPeriodMessagesTotalQuery(q)) return true;
  const compact = q.replace(/[？?。.!！\s]/g, "");
  return (
    !!parseTimeRange(compact) &&
    parseStatsScope(compact, rules) === undefined &&
    /^(今日|本周|本月|上月|今年|今天|这周|这个月)$/.test(compact)
  );
};

const isRuleCountQuery = (q: string) =>
  /(多少|几个|数量|总数)/.test(q) &&
  /(关怀|方案|规则)/.test(q) &&
  /(启用|停用|方案|规则|几个|多少|数量|总数)/.test(q) &&
  !/(发送|消息|积分|覆盖|占比|排名|触达)/.test(q);

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

const askBatchToggleCareType = (enable: boolean): HumanityCareAgentReply =>
  askClarify(
    `要${enable ? "启用" : "停用"}的关怀类型`,
    "全部、生日关怀、节日关怀、天气关怀、工作强度关怀",
  );

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
          summary: "未识别所选方案，请先明确方案名称（可回复序号或名称）。",
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
        summary: "匹配到多个方案，请先明确方案名称（可回复序号或名称）。",
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
  let parsed = parseStatsScope(q, rules);
  if (parsed === undefined) {
    if (intent === "messages_count" && shouldDefaultMessagesScopeAll(q, rules)) {
      parsed = { kind: "all" };
    } else {
      return {
        reply: askStatsScope(),
        pending: { kind: "pick_stats_scope", intent, timeRange: range },
      };
    }
  }
  if (Array.isArray(parsed)) {
    return {
      reply: {
        summary: "匹配到多个方案，请先明确方案名称（可回复序号或名称）。",
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
): { reply: HumanityCareAgentReply; pending: PendingSession | null } => {
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
    const enable = pending.enable ?? true;
    const intent: ManageIntent = enable ? "enable" : "disable";
    if (careType === "all") {
      return {
        reply: withNavigateActions(
          `请前往各关怀类型列表批量${manageVerb[intent]}方案。`,
          (Object.keys(careModules) as CareType[]).map((t) => ({
            label: `打开${careTypeLabel[t]}列表`,
            type: "navigate" as const,
            payload: moduleListPath(t),
          })),
        ),
        pending: null,
      };
    }
    return {
      reply: buildManageNavigateReply(intent, careType),
      pending: null,
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
): { reply: HumanityCareAgentReply; pending: PendingSession | null } => {
  const q = normalizeQuery(query.trim());
  const rules = getCareRulesSnapshot();

  if (pending?.kind === "pick_manage_target") {
    return replyManageTarget(q, rules, pending.intent);
  }

  if (pending?.kind === "pick_manage_rule") {
    const idx = Number(q.replace(/\D/g, "")) - 1;
    const nameHits = findRulesByNameHint(q, pending.candidates);
    const picked =
      idx >= 0 && idx < pending.candidates.length
        ? pending.candidates[idx]
        : nameHits.length === 1
          ? nameHits[0]
          : pending.candidates.find(
              (r) => r.name.includes(q) || q.includes(r.name) || fuzzyNameMatch(r.name, q),
            );
    if (!picked) {
      return {
        reply: {
          summary: "未识别所选方案，请先明确方案名称（可回复序号或名称）。",
          table: managePickTable(pending.intent, pending.candidates),
        },
        pending,
      };
    }
    return replyPickedManageRule(picked, pending.intent);
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

  // --- 新建关怀 ---
  if (/新建/.test(q) && /关怀|规则|方案/.test(q)) {
    const careType = parseCareType(q);
    if (!careType || careType === "all") {
      return {
        reply: withNavigateActions(
          "请先明确要新建的关怀类型。",
          (Object.keys(careModules) as CareType[]).map((t) => ({
            label: `新建${careTypeLabel[t]}`,
            type: "navigate" as const,
            payload: moduleNewPath(t),
          })),
        ),
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
      reply: withNavigateActions(
        `已识别${careTypeLabel[careType]}，请前往创建页完成配置。`,
        [{ label: `新建${careTypeLabel[careType]}`, type: "navigate", payload: path }],
      ),
      pending: null,
    };
  }

  // --- 批量启用 / 停用 ---
  if (/批量|一键|统统|全部(启用|停用)/.test(q) && /(启用|停用)/.test(q)) {
    const enable = /启用/.test(q);
    const careType = parseCareType(q);
    if (!careType) {
      return {
        reply: askBatchToggleCareType(enable),
        pending: { kind: "pick_care_type", intent: "batch_toggle", enable },
      };
    }
    const intent: ManageIntent = enable ? "enable" : "disable";
    if (careType === "all") {
      return {
        reply: withNavigateActions(
          `请前往各关怀类型列表批量${manageVerb[intent]}方案。`,
          (Object.keys(careModules) as CareType[]).map((t) => ({
            label: `打开${careTypeLabel[t]}列表`,
            type: "navigate" as const,
            payload: moduleListPath(t),
          })),
        ),
        pending: null,
      };
    }
    return { reply: buildManageNavigateReply(intent, careType), pending: null };
  }

  // --- 规则管理：删除 / 修改 / 启用 / 停用 / 查询 ---
  const manageResult = tryDispatchManage(q, rules);
  if (manageResult) return manageResult;

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
        "我可以帮你管理关怀规则、查询统计数据。试试：\n· 帮我把全员生日祝福停了\n· 中秋节关怀想删了\n· 看看高温预警关怀怎么样\n· 本月一共发送了多少条关怀消息？\n· 哪些员工还没收到生日关怀",
      list: [
        "规则管理支持口语表达，不必拘泥固定句式",
        "删除、启用、停用将引导至对应关怀类型列表页操作",
        "修改、查询明确方案名称后，可点击按钮进入方案详情页",
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
