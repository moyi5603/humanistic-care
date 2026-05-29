import { Bot } from "lucide-react";
import type {
  AgentAction,
  AgentTable,
  HumanityCareAgentReply,
} from "@/lib/humanityCareAgent";
import { cn } from "@/lib/utils";

export type CareChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reply?: HumanityCareAgentReply;
};

const AgentTableView = ({ table }: { table: AgentTable }) => (
  <div className="overflow-x-auto rounded-xl border border-border/60">
    <table className="w-full min-w-[240px] text-left text-[11px]">
      <thead>
        <tr className="border-b border-border/60 bg-secondary/50">
          {table.headers.map((h) => (
            <th key={h} className="px-2.5 py-2 font-semibold text-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, ri) => (
          <tr key={ri} className="border-b border-border/40 last:border-0">
            {row.map((cell, ci) => (
              <td key={ci} className="px-2.5 py-2 text-muted-foreground">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const UserBubble = ({ text }: { text: string }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-soft">
      {text}
    </div>
  </div>
);

const AssistantBubble = ({
  reply,
  onAction,
}: {
  reply: HumanityCareAgentReply;
  onAction?: (action: AgentAction) => void;
}) => {
  const extraTable = reply.table2;

  return (
    <div className="flex gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70">
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="min-w-0 max-w-[92%] space-y-2">
        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-card px-3.5 py-2.5 text-sm text-foreground shadow-soft">
          {reply.summary}
        </div>
        {reply.list && reply.list.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
            {reply.list.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-primary">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {reply.table && <AgentTableView table={reply.table} />}
        {extraTable && <AgentTableView table={extraTable} />}
        {reply.actions && reply.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reply.actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => onAction?.(a)}
                className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-foreground transition-base active:scale-95"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const HumanityCareAgentChat = ({
  messages,
  isTyping,
  onAction,
  className,
}: {
  messages: CareChatMessage[];
  isTyping?: boolean;
  onAction?: (action: AgentAction) => void;
  className?: string;
}) => (
  <div className={cn("space-y-3 px-1", className)}>
    {messages.map((msg) =>
      msg.role === "user" ? (
        <UserBubble key={msg.id} text={msg.content} />
      ) : (
        <AssistantBubble
          key={msg.id}
          reply={msg.reply ?? { summary: msg.content }}
          onAction={onAction}
        />
      ),
    )}
    {isTyping && (
      <div className="flex gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="rounded-2xl rounded-tl-md bg-card px-4 py-3 shadow-soft">
          <span className="inline-flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </div>
      </div>
    )}
  </div>
);
