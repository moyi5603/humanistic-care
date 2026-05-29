import {
  careModules,
  type CareRule,
  type CareType,
} from "@/data/humanityCare";
import {
  deleteCareRule,
  getCareRulesSnapshot,
  upsertCareRule,
} from "@/data/careRulesStore";

export type AgentTable = {
  headers: string[];
  rows: string[][];
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
  actions?: AgentAction[];
};

export type PendingSession =
  | { kind: "delete_confirm"; ruleId: string; ruleName: string }
  | {
      kind: "pick_rule";
      intent: "modify" | "delete" | "detail";
      candidates: CareRule[];
      modifyDraft?: { points?: number; triggerTime?: string };
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

/** 演示：部门生日关怀触达 */
const deptBirthdayStats = [
  { dept: "研发中心", count: 86 },
  { dept: "产品中心", count: 62 },
  { dept: "市场中心", count: 48 },
  { dept: "运营中心", count: 41 },
  { dept: "人力行政", count: 28 },
];

/** 演示：积分发放 Top 10 */
const pointsTopEmployees = [
  { rank: 1, name: "王小明", dept: "研发中心", points: 520 },
  { rank: 2, name: "李芳", dept: "产品中心", points: 480 },
  { rank: 3, name: "张伟", dept: "研发中心", points: 450 },
  { rank: 4, name: "刘洋", dept: "市场中心", points: 420 },
  { rank: 5, name: "陈静", dept: "运营中心", points: 390 },
  { rank: 6, name: "赵磊", dept: "研发中心", points: 360 },
  { rank: 7, name: "孙婷", dept: "产品中心", points: 340 },
  { rank: 8, name: "周杰", dept: "人力行政", points: 310 },
  { rank: 9, name: "吴敏", dept: "市场中心", points: 290 },
  { rank: 10, name: "郑浩", dept: "研发中心", points: 275 },
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

const extractQuoted = (q: string) => {
  const m = q.match(/[「『"']([^」』"']+)[」』"']/);
  return m?.[1];
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

const matchBirthdayRules = (q: string, rules: CareRule[]) => {
  const birthday = rules.filter((r) => r.type === "birthday");
  const quoted = extractQuoted(q);
  if (quoted) {
    const matched = birthday.filter((r) => r.name.includes(quoted));
    if (matched.length) return matched;
  }
  if (/所有|全部/.test(q)) return birthday;
  const byName = birthday.filter((r) => q.includes(r.name));
  if (byName.length) return byName;
  return birthday;
};

const buildOverviewReply = (rules: CareRule[]): HumanityCareAgentReply => {
  const enabled = rules.filter((r) => r.enabled).length;
  const disabled = rules.length - enabled;
  const byType = (["birthday", "festival", "weather", "workload"] as CareType[]).map(
    (t) => ({
      type: careTypeLabel[t],
      count: rules.filter((r) => r.type === t).length,
      reached: rules.filter((r) => r.type === t).reduce((a, r) => a + r.reached, 0),
    }),
  );

  return {
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
  };
};

export const dispatchHumanityCareAgent = (
  query: string,
  pending: PendingSession | null,
): { reply: HumanityCareAgentReply; pending: PendingSession | null; navigate?: string } => {
  const q = query.trim();
  const rules = getCareRulesSnapshot();

  if (pending?.kind === "delete_confirm") {
    if (/确认|确定|是|删除/.test(q) && !/不|取消/.test(q)) {
      deleteCareRule(pending.ruleId);
      return {
        reply: {
          summary: `已删除规则「${pending.ruleName}」。删除后将停止发送，已发送消息不受影响。`,
        },
        pending: null,
      };
    }
    if (/取消|不/.test(q)) {
      return {
        reply: { summary: "已取消删除操作。" },
        pending: null,
      };
    }
    return {
      reply: {
        summary: `请确认是否删除「${pending.ruleName}」？回复「确认删除」继续，或回复「取消」。`,
        list: ["删除后将停止发送，已发送消息不受影响"],
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
        reply: {
          summary: `已更新「${pending.ruleName}」：${parts.join("、")}。`,
        },
        pending: null,
      };
    }
    if (/取消|不/.test(q)) {
      return { reply: { summary: "已取消修改。" }, pending: null };
    }
    return {
      reply: {
        summary: `请确认修改「${pending.ruleName}」，回复「确认」保存，或「取消」。`,
      },
      pending,
    };
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

    if (pending.intent === "detail") {
      return {
        reply: buildRuleDetailReply(picked),
        pending: null,
      };
    }

    if (pending.intent === "delete") {
      return {
        reply: {
          summary: `即将删除规则「${picked.name}」，请确认：`,
          list: ["删除后将停止发送，已发送消息不受影响"],
        },
        pending: { kind: "delete_confirm", ruleId: picked.id, ruleName: picked.name },
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
          }。回复「确认」保存。`,
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

  // --- 全局统计 ---
  if (/本月|这个月/.test(q) && /生日/.test(q) && /(触达|情况|统计)/.test(q)) {
    const reached = rules
      .filter((r) => r.type === "birthday")
      .reduce((a, r) => a + r.reached, 0);
    const monthShare = Math.round(reached * 0.35);
    return {
      reply: {
        summary: `本月生日关怀共触达 ${monthShare} 人次：`,
        table: {
          headers: ["规则名称", "状态", "本月触达"],
          rows: rules
            .filter((r) => r.type === "birthday")
            .map((r) => [
              r.name,
              r.enabled ? "已启用" : "已停用",
              String(Math.round(r.reached * 0.35)),
            ]),
        },
      },
      pending: null,
    };
  }

  if (/本月|这个月/.test(q) && /(多少|几条|发出|关怀消息|触达|统计)/.test(q)) {
    const rows = (["birthday", "festival", "weather", "workload"] as CareType[]).map(
      (t) => {
        const reached = rules
          .filter((r) => r.type === t)
          .reduce((a, r) => a + r.reached, 0);
        const monthShare = Math.round(reached * 0.35);
        return [careTypeLabel[t], String(monthShare)];
      },
    );
    return {
      reply: {
        summary: `本月共发出 ${globalStatsDemo.month.toLocaleString()} 条关怀消息，分类如下：`,
        table: { headers: ["关怀类型", "本月触达"], rows },
      },
      pending: null,
    };
  }

  if (/哪个部门|哪一部门|部门.*最多/.test(q) && /生日/.test(q)) {
    return {
      reply: {
        summary: "各部门生日关怀触达排名如下：",
        table: {
          headers: ["排名", "部门", "触达人次"],
          rows: deptBirthdayStats.map((d, i) => [
            String(i + 1),
            d.dept,
            String(d.count),
          ]),
        },
      },
      pending: null,
    };
  }

  if (/积分/.test(q) && /(排名|前\s*10|前十|top)/i.test(q)) {
    return {
      reply: {
        summary: "积分发放排名前 10 的员工：",
        table: {
          headers: ["排名", "姓名", "部门", "积分"],
          rows: pointsTopEmployees.map((e) => [
            String(e.rank),
            e.name,
            e.dept,
            String(e.points),
          ]),
        },
      },
      pending: null,
    };
  }

  if (
    /整体|全局|概览|数据概览|统计概览/.test(q) ||
    (/统计/.test(q) && /规则|方案|覆盖|积分/.test(q))
  ) {
    const r = buildOverviewReply(rules);
    return { reply: r, pending: null };
  }

  // --- 生日关怀规则 ---
  if (/(新建|创建|新增).*(生日|生日关怀)/.test(q) || /帮我.*生日关怀规则/.test(q)) {
    const audience = /研发/.test(q)
      ? "研发中心"
      : /全员|全公司/.test(q)
        ? "全公司员工"
        : undefined;
    const points = extractPoints(q);
    const trigger = /09:00|当天/.test(q) ? "生日当天 09:00" : undefined;
    const qs = new URLSearchParams();
    if (audience) qs.set("audience", audience);
    if (points) qs.set("points", String(points));
    if (trigger) qs.set("trigger", trigger);
    const path = `/agents/humanity-care/birthday/new${qs.toString() ? `?${qs}` : ""}`;
    if (audience || points || trigger) {
      return {
        reply: {
          summary: "已从你的描述中提取配置，正在打开新建页面…",
          list: [
            audience ? `关怀对象：${audience}` : "",
            trigger ? `触达时间：${trigger}` : "",
            points ? `积分：${points} 分` : "",
          ].filter(Boolean),
          actions: [{ label: "打开新建页面", type: "navigate", payload: path }],
        },
        pending: null,
        navigate: path,
      };
    }
    return {
      reply: {
        summary:
          "可以帮你新建生日关怀规则。请补充关怀对象、触达时间或积分，也可以说「为研发部创建生日关怀」；也可直接进入新建流程。",
        actions: [
          { label: "新建生日关怀", type: "navigate", payload: "/agents/humanity-care/birthday/new" },
        ],
      },
      pending: null,
    };
  }

  if (/删除/.test(q) && /生日/.test(q)) {
    const matched = matchBirthdayRules(q, rules);
    if (!matched.length) {
      return { reply: { summary: "未找到可删除的生日关怀规则。" }, pending: null };
    }
    if (matched.length === 1) {
      return {
        reply: {
          summary: `即将删除「${matched[0].name}」，请确认：`,
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
        summary: "找到多条生日关怀规则，请选择要删除的规则（回复序号）：",
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

  if (/(修改|改成|调整|改为)/.test(q) && /生日/.test(q)) {
    const points = extractPoints(q);
    const triggerTime = extractTriggerTime(q);
    const matched = matchBirthdayRules(q, rules);
    if (!matched.length) {
      return { reply: { summary: "未找到匹配的生日关怀规则。" }, pending: null };
    }
    const draft = { points, triggerTime };
    if (!points && !triggerTime) {
      return {
        reply: {
          summary: "请说明要修改的内容，例如「把全员生日祝福的积分改为 50 分」。",
        },
        pending: null,
      };
    }
    if (matched.length === 1) {
      return {
        reply: {
          summary: `将修改「${matched[0].name}」，回复「确认」保存：`,
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
        summary: "找到多条规则，请选择要修改的规则（回复序号）：",
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

  if (
    /(查询|查看|列表)/.test(q) &&
    /生日.*规则|规则.*生日/.test(q)
  ) {
    const birthday = rules.filter((r) => r.type === "birthday");
    if (!birthday.length) {
      return { reply: { summary: "当前没有生日关怀规则。" }, pending: null };
    }
    return {
      reply: {
        summary: `共 ${birthday.length} 条生日关怀规则：`,
        table: {
          headers: ["规则名称", "状态", "覆盖对象", "下次触达"],
          rows: birthday.map((r) => [
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

  const quoted = extractQuoted(q);
  if (quoted || (/详情|详细/.test(q) && /生日/.test(q))) {
    const name = quoted ?? "";
    const birthday = rules.filter((r) => r.type === "birthday");
    const matched = name
      ? birthday.filter((r) => r.name.includes(name))
      : birthday;
    if (matched.length === 1) {
      return { reply: buildRuleDetailReply(matched[0]), pending: null };
    }
    if (matched.length > 1) {
      return {
        reply: {
          summary: "匹配到多条规则，请选择查看（回复序号）：",
          table: {
            headers: ["序号", "规则名称"],
            rows: matched.map((r, i) => [String(i + 1), r.name]),
          },
        },
        pending: { kind: "pick_rule", intent: "detail", candidates: matched },
      };
    }
  }

  if (/员工|同事/.test(q) && /(覆盖|关怀规则|生日)/.test(q)) {
    const empMatch = q.match(/([\u4e00-\u9fa5]{2,4})/);
    const name = empMatch?.[1] ?? "员工";
    const covered = rules.some((r) => r.type === "birthday" && r.enabled);
    return {
      reply: {
        summary: covered
          ? `「${name}」当前被以下生日关怀规则覆盖：`
          : `「${name}」暂未被生日关怀规则覆盖。`,
        table: covered
          ? {
              headers: ["规则名称", "触达时间", "状态"],
              rows: rules
                .filter((r) => r.type === "birthday" && r.enabled)
                .map((r) => [r.name, r.triggerTime, "已启用"]),
            }
          : undefined,
      },
      pending: null,
    };
  }

  return {
    reply: {
      summary:
        "我可以帮你查询全局统计、管理生日关怀规则。试试：\n· 本月一共发出了多少条关怀消息？\n· 哪个部门收到的生日关怀最多？\n· 积分发放排名前 10 的员工是谁？\n· 帮我新建一个生日关怀规则",
      list: [
        "支持追问与多轮对话，例如先查列表再选序号修改或删除",
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
