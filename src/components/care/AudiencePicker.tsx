import { useMemo, useState } from "react";
import {
  Users,
  ChevronRight,
  Search,
  X,
  Check,
  Building2,
  UserRound,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  departments as ALL_DEPTS,
  employees as ALL_EMP,
  flattenDepts,
  type Department,
  type Employee,
} from "@/data/contacts";

export type AudienceSelection = {
  /** 是否选择了"全公司员工" */
  all: boolean;
  deptIds: string[];
  empIds: string[];
  /** 扩展条件 tag, 如「入职 ≥ 3 个月」「岗位:研发」 */
  tags: string[];
};

export const emptyAudience: AudienceSelection = {
  all: true,
  deptIds: [],
  empIds: [],
  tags: [],
};

type Props = {
  value: AudienceSelection;
  onChange: (v: AudienceSelection) => void;
  /** 可扩展的标签条件,后续接入真实条件配置 */
  extensionTags?: string[];
  /** 自定义触发器节点(asChild),不传则使用默认按钮 */
  trigger?: React.ReactNode;
  /** 是否在触发器下方展示已选标签 */
  showSelectedPreview?: boolean;
};

const tenureOptions = ["≥ 3 个月", "≥ 1 年", "≥ 3 年"];
const positionOptions = ["研发岗", "销售岗", "管理岗", "外派/户外岗"];
const genderOptions = ["男", "女"];
const TENURE_CUSTOM_PREFIX = "入职 ≥ ";
const isTenureTag = (t: string) =>
  t.startsWith("入职 ≥ ") || tenureOptions.includes(t);

const flatDepts = flattenDepts(ALL_DEPTS);

export const AudiencePicker = ({
  value,
  onChange,
  trigger,
  showSelectedPreview = true,
}: Props) => {
  const [open, setOpen] = useState(false);

  // 临时草稿(打开时复制 value, 确认后写回)
  const [draft, setDraft] = useState<AudienceSelection>(value);
  const [tab, setTab] = useState<"contacts" | "rules">("contacts");
  const [stack, setStack] = useState<Department[]>([]); // 部门面包屑
  const [keyword, setKeyword] = useState("");

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setDraft(value);
      setStack([]);
      setKeyword("");
      setTab("contacts");
    }
  };

  const currentDepts = stack.length
    ? stack[stack.length - 1].children ?? []
    : ALL_DEPTS;

  const currentEmps = useMemo(() => {
    if (!stack.length) return [];
    const deptId = stack[stack.length - 1].id;
    // 当前部门 + 子部门下的员工
    const wantedDeptIds = new Set<string>([deptId]);
    flatDepts
      .filter((d) => d.parentId === deptId)
      .forEach((d) => wantedDeptIds.add(d.id));
    return ALL_EMP.filter((e) => wantedDeptIds.has(e.deptId));
  }, [stack]);

  const searchResults = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return null;
    return {
      depts: flatDepts.filter((d) => d.name.toLowerCase().includes(k)),
      emps: ALL_EMP.filter(
        (e) =>
          e.name.toLowerCase().includes(k) ||
          e.position.toLowerCase().includes(k),
      ),
    };
  }, [keyword]);

  const toggleDept = (id: string) => {
    setDraft((d) => ({
      ...d,
      all: false,
      deptIds: d.deptIds.includes(id)
        ? d.deptIds.filter((x) => x !== id)
        : [...d.deptIds, id],
    }));
  };
  const toggleEmp = (id: string) => {
    setDraft((d) => ({
      ...d,
      all: false,
      empIds: d.empIds.includes(id)
        ? d.empIds.filter((x) => x !== id)
        : [...d.empIds, id],
    }));
  };
  const toggleTag = (t: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t],
    }));
  };
  const setAll = () => {
    setDraft({ all: true, deptIds: [], empIds: [], tags: draft.tags });
  };

  const totalSelected =
    (draft.all ? 1 : 0) + draft.deptIds.length + draft.empIds.length;

  const handleConfirm = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <div>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {trigger ?? (
            <button className="flex w-full items-center justify-between rounded-xl bg-secondary px-3 py-2.5 text-left text-sm text-foreground transition-base active:scale-[0.99]">
              <span className="flex items-center gap-1.5 truncate">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{summarize(value)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )}
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="flex h-[88vh] flex-col rounded-t-3xl p-0"
        >
          <SheetHeader className="px-4 pb-2 pt-4">
            <SheetTitle className="text-left text-base">
              选择关怀对象
            </SheetTitle>
          </SheetHeader>

          {/* tabs */}
          <div className="flex gap-1 border-b border-border px-4">
            {[
              { k: "contacts", label: "通讯录" },
              { k: "rules", label: "规则条件" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as typeof tab)}
                className={`relative px-3 py-2 text-xs font-medium transition-base ${
                  tab === t.k
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {t.label}
                {tab === t.k && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {tab === "contacts" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* 全公司 + 搜索 */}
              <div className="space-y-2 px-4 pb-2 pt-3">
                <button
                  onClick={setAll}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-base ${
                    draft.all
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> 全公司员工
                  </span>
                  {draft.all && <Check className="h-4 w-4" />}
                </button>
                <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索部门或姓名"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {keyword && (
                    <button onClick={() => setKeyword("")}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* 面包屑 */}
              {!searchResults && stack.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto px-4 py-1.5 text-[11px] text-muted-foreground scrollbar-hide">
                  <button
                    onClick={() => setStack([])}
                    className="shrink-0 text-foreground"
                  >
                    通讯录
                  </button>
                  {stack.map((d, i) => (
                    <span key={d.id} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" />
                      <button
                        onClick={() => setStack(stack.slice(0, i + 1))}
                        className={
                          i === stack.length - 1
                            ? "shrink-0 text-foreground"
                            : "shrink-0"
                        }
                      >
                        {d.name}
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setStack(stack.slice(0, -1))}
                    className="ml-auto flex shrink-0 items-center gap-0.5 text-primary"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    返回
                  </button>
                </div>
              )}

              {/* 列表 */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hide">
                {searchResults ? (
                  <SearchResults
                    keyword={keyword}
                    depts={searchResults.depts}
                    emps={searchResults.emps}
                    draft={draft}
                    onToggleDept={toggleDept}
                    onToggleEmp={toggleEmp}
                  />
                ) : (
                  <ul className="space-y-0.5">
                    {currentDepts.map((d) => (
                      <DeptRow
                        key={d.id}
                        dept={d}
                        checked={draft.deptIds.includes(d.id)}
                        onToggle={() => toggleDept(d.id)}
                        onEnter={
                          d.children?.length ? () => setStack([...stack, d]) : undefined
                        }
                      />
                    ))}
                    {currentEmps.map((e) => (
                      <EmpRow
                        key={e.id}
                        emp={e}
                        checked={draft.empIds.includes(e.id)}
                        onToggle={() => toggleEmp(e.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "rules" && (
            <div className="flex-1 overflow-y-auto px-4 pb-2 pt-3 scrollbar-hide">
              <div className="rounded-xl border border-dashed border-primary/30 bg-accent/40 p-2.5">
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-accent-foreground">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                  在通讯录基础上叠加规则,精准圈选目标人群。
                </p>
              </div>

              <TenureGroup
                selected={draft.tags}
                onToggle={toggleTag}
                onSetCustom={(years) =>
                  setDraft((d) => ({
                    ...d,
                    tags: [
                      ...d.tags.filter(
                        (t) => !t.startsWith(TENURE_CUSTOM_PREFIX),
                      ),
                      ...(years > 0 ? [`${TENURE_CUSTOM_PREFIX}${years} 年`] : []),
                    ],
                  }))
                }
              />
              <RuleGroup title="性别" options={genderOptions}
                selected={draft.tags} onToggle={toggleTag} />
              <RuleGroup title="岗位类型" options={positionOptions}
                selected={draft.tags} onToggle={toggleTag} />

              <div className="mt-4 rounded-xl bg-secondary/60 p-3">
                <div className="text-[11px] font-medium text-muted-foreground">
                  更多扩展条件
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["生日月份", "司龄段", "城市", "Level 等级"].map((x) => (
                    <span
                      key={x}
                      className="rounded-md border border-dashed border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {x} · 即将上线
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 底部确认栏 */}
          <div className="border-t border-border bg-background/95 p-3 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                已选 <span className="font-semibold text-foreground">{totalSelected}</span> 项
                {draft.tags.length > 0 && (
                  <span className="ml-1">· {draft.tags.length} 个规则</span>
                )}
              </span>
              <button
                onClick={() =>
                  setDraft({ all: false, deptIds: [], empIds: [], tags: [] })
                }
                className="text-muted-foreground"
              >
                清空
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-base active:scale-95"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={totalSelected === 0}
                className="flex-[2] rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-base active:scale-95 disabled:opacity-40"
              >
                确认选择
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {showSelectedPreview && <SelectedPreview value={value} />}
    </div>
  );
};

/* ---------- 摘要 / 显示 ---------- */

export const summarize = (v: AudienceSelection): string => {
  if (v.all) return "全公司员工";
  const parts: string[] = [];
  if (v.deptIds.length) {
    const names = v.deptIds
      .map((id) => flatDepts.find((d) => d.id === id)?.name)
      .filter(Boolean) as string[];
    parts.push(...names);
  }
  if (v.empIds.length) {
    const names = v.empIds
      .map((id) => ALL_EMP.find((e) => e.id === id)?.name)
      .filter(Boolean) as string[];
    parts.push(...names);
  }
  if (!parts.length) return "请选择关怀对象";
  if (parts.length <= 2) return parts.join("、");
  return `${parts.slice(0, 2).join("、")} 等 ${parts.length} 项`;
};

const SelectedPreview = ({ value }: { value: AudienceSelection }) => {
  const deptNames = value.deptIds
    .map((id) => flatDepts.find((d) => d.id === id))
    .filter(Boolean) as Department[];
  const empNames = value.empIds
    .map((id) => ALL_EMP.find((e) => e.id === id))
    .filter(Boolean) as Employee[];

  const chips: { key: string; label: string; type: "all" | "dept" | "emp" | "tag" }[] = [];
  if (value.all) chips.push({ key: "all", label: "全公司员工", type: "all" });
  deptNames.forEach((d) =>
    chips.push({ key: `d-${d.id}`, label: d.name, type: "dept" }),
  );
  empNames.forEach((e) =>
    chips.push({ key: `e-${e.id}`, label: e.name, type: "emp" }),
  );

  if (!chips.length && !value.tags.length) return null;

  const MAX = 4;
  const visible = chips.slice(0, MAX);
  const overflow = chips.length - visible.length;

  return (
    <div className="mt-2 space-y-1.5">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visible.map((c) => (
            <span
              key={c.key}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${
                c.type === "all"
                  ? "bg-primary/10 text-primary"
                  : c.type === "dept"
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {c.type === "dept" && <Building2 className="h-2.5 w-2.5" />}
              {c.type === "emp" && <UserRound className="h-2.5 w-2.5" />}
              {c.label}
            </span>
          ))}
          {overflow > 0 && (
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
              +{overflow}
            </span>
          )}
        </div>
      )}
      {value.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.tags.map((t) => (
            <span
              key={t}
              className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- 子部件 ---------- */

const DeptRow = ({
  dept,
  checked,
  onToggle,
  onEnter,
}: {
  dept: Department;
  checked: boolean;
  onToggle: () => void;
  onEnter?: () => void;
}) => (
  <li className="flex items-center gap-1 rounded-xl px-2 py-2 active:bg-secondary/60">
    <button
      onClick={onToggle}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background"
      }`}
      aria-label="选择部门"
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
    <button
      onClick={onEnter ?? onToggle}
      className="ml-1 flex flex-1 items-center justify-between text-left"
    >
      <span className="flex items-center gap-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{dept.name}</span>
        <span className="text-[11px] text-muted-foreground">
          {dept.count} 人
        </span>
      </span>
      {onEnter && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  </li>
);

const EmpRow = ({
  emp,
  checked,
  onToggle,
}: {
  emp: Employee;
  checked: boolean;
  onToggle: () => void;
}) => (
  <li>
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left active:bg-secondary/60"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        }`}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-foreground">
        {emp.name.slice(-2)}
      </span>
      <span className="flex-1">
        <span className="block text-sm text-foreground">{emp.name}</span>
        <span className="block text-[11px] text-muted-foreground">
          {emp.position}
        </span>
      </span>
    </button>
  </li>
);

const SearchResults = ({
  keyword,
  depts,
  emps,
  draft,
  onToggleDept,
  onToggleEmp,
}: {
  keyword: string;
  depts: Department[];
  emps: Employee[];
  draft: AudienceSelection;
  onToggleDept: (id: string) => void;
  onToggleEmp: (id: string) => void;
}) => {
  if (!depts.length && !emps.length) {
    return (
      <div className="px-4 py-12 text-center text-xs text-muted-foreground">
        没有匹配「{keyword}」的部门或员工
      </div>
    );
  }
  return (
    <div className="space-y-3 pt-2">
      {depts.length > 0 && (
        <div>
          <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            部门 · {depts.length}
          </div>
          <ul className="space-y-0.5">
            {depts.map((d) => (
              <DeptRow
                key={d.id}
                dept={d}
                checked={draft.deptIds.includes(d.id)}
                onToggle={() => onToggleDept(d.id)}
              />
            ))}
          </ul>
        </div>
      )}
      {emps.length > 0 && (
        <div>
          <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            员工 · {emps.length}
          </div>
          <ul className="space-y-0.5">
            {emps.map((e) => (
              <EmpRow
                key={e.id}
                emp={e}
                checked={draft.empIds.includes(e.id)}
                onToggle={() => onToggleEmp(e.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const RuleGroup = ({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (t: string) => void;
}) => (
  <div className="mt-4">
    <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
      {title}
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-3 py-1 text-xs transition-base ${
              on
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-background text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

const TenureGroup = ({
  selected,
  onToggle,
  onSetCustom,
}: {
  selected: string[];
  onToggle: (t: string) => void;
  onSetCustom: (years: number) => void;
}) => {
  const customTag = selected.find((t) => t.startsWith(TENURE_CUSTOM_PREFIX));
  const customYears = customTag
    ? customTag.replace(TENURE_CUSTOM_PREFIX, "").replace(" 年", "")
    : "";
  const [val, setVal] = useState(customYears);

  const commit = () => {
    const n = Math.max(0, Math.min(50, Number(val) || 0));
    setVal(n ? String(n) : "");
    onSetCustom(n);
  };

  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
        入职年限
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tenureOptions.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`rounded-full border px-3 py-1 text-xs transition-base ${
                on
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
        <div
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-base ${
            customTag
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-dashed border-border bg-background text-muted-foreground"
          }`}
        >
          <span>≥</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="自定义"
            className="w-12 bg-transparent text-center text-xs text-foreground placeholder:text-muted-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span>年</span>
        </div>
      </div>
    </div>
  );
};

