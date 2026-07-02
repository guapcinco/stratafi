import type { AiInteraction, InteractionOutcome, Lead, User } from "@/backend";
import { InteractionType, InteractionOutcome as Outcome } from "@/backend";
import { EmptyState, SectionCard } from "@/components/Primitives";
import { useStrataFi } from "@/hooks/useStrataFi";
import {
  bigToNum,
  formatMinutes,
  formatSeconds,
  getInitials,
  nsToAgo,
  titleCase,
} from "@/types";
import { Filter, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";

const TYPE_FILTERS: (InteractionType | "all")[] = [
  "all",
  InteractionType.voiceCall,
  InteractionType.textMessage,
  InteractionType.liveTransfer,
  InteractionType.appointmentBooking,
];

const OUTCOME_FILTERS: (InteractionOutcome | "all")[] = [
  "all",
  Outcome.sent,
  Outcome.delivered,
  Outcome.replied,
  Outcome.noAnswer,
  Outcome.qualified,
  Outcome.transferred,
  Outcome.booked,
  Outcome.failed,
];

export function Conversations() {
  const { aiInteractions, leads, users, loading, bootstrapping, activeTenant } =
    useStrataFi();
  const [filter, setFilter] = useState<InteractionType | "all">("all");
  const [outcomeFilter, setOutcomeFilter] = useState<
    InteractionOutcome | "all"
  >("all");

  const leadMap = useMemo(() => {
    const m = new Map<bigint, Lead>();
    for (const l of leads) m.set(l.id, l);
    return m;
  }, [leads]);

  const agentMap = useMemo(() => {
    const m = new Map<bigint, User>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    let list = aiInteractions;
    if (filter !== "all") {
      list = list.filter((i) => i.interactionType === filter);
    }
    if (outcomeFilter !== "all") {
      list = list.filter((i) => i.outcome === outcomeFilter);
    }
    return list.slice().sort((a, b) => Number(b.createdAt - a.createdAt));
  }, [aiInteractions, filter, outcomeFilter]);

  if (bootstrapping || loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="crm-card p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-accent/60 rounded-md animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Conversations
          </h2>
          <p className="text-muted-foreground text-sm">
            {activeTenant?.agencyName ?? "—"} · AI interaction log
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md bg-accent border border-border">
          <Filter size={12} className="text-muted-foreground ml-1.5" />
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              data-ocid={`conversations.filter.${f}.tab`}
              onClick={() => setFilter(f)}
              className={`px-2.5 h-7 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : titleCase(f)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md bg-accent border border-border">
          <Filter size={12} className="text-muted-foreground ml-1.5" />
          {OUTCOME_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              data-ocid={`conversations.outcome_filter.${f}.tab`}
              onClick={() => setOutcomeFilter(f)}
              className={`px-2.5 h-7 rounded text-xs font-medium transition-colors ${
                outcomeFilter === f
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All Outcomes" : titleCase(f)}
            </button>
          ))}
        </div>
      </div>

      <SectionCard
        title={`Interactions (${filtered.length})`}
        action={
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            {filtered.length} of {aiInteractions.length}
          </span>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            message="No conversations match this filter."
            hint="try a different interaction type"
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((i, idx) => (
              <ConversationRow
                key={i.id.toString()}
                interaction={i}
                lead={leadMap.get(i.leadId)}
                agent={
                  i.agentId !== undefined && i.agentId !== null
                    ? agentMap.get(i.agentId)
                    : undefined
                }
                index={idx + 1}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function ConversationRow({
  interaction,
  lead,
  agent,
  index,
}: {
  interaction: AiInteraction;
  lead?: Lead;
  agent?: User;
  index: number;
}) {
  const outcome = interaction.outcome;
  const isPositive =
    outcome === "qualified" ||
    outcome === "transferred" ||
    outcome === "booked" ||
    outcome === "replied";
  const isNegative = outcome === "failed" || outcome === "noAnswer";

  const outcomeColor = isPositive
    ? "text-primary border-primary/30 bg-primary/10"
    : isNegative
      ? "text-destructive border-destructive/30 bg-destructive/10"
      : "text-secondary border-secondary/30 bg-secondary/10";

  return (
    <div
      data-ocid={`conversation.item.${index}`}
      className="flex items-start gap-3 px-4 py-3 rounded-md bg-accent/40 border border-border hover:border-primary/40 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center text-xs font-bold text-secondary font-mono flex-shrink-0 mt-0.5">
        {lead ? getInitials(lead.name) : <MessageSquare size={14} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm text-foreground font-medium truncate">
            {lead?.name ?? `Lead #${interaction.leadId.toString()}`}
          </span>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${outcomeColor}`}
          >
            {titleCase(interaction.interactionType)}
          </span>
          {agent && (
            <span className="text-[10px] text-muted-foreground font-mono">
              · {agent.name}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground/80 line-clamp-2">
          {interaction.summary}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
          <span>{formatSeconds(interaction.durationSeconds)}</span>
          <span className="text-primary">
            {formatMinutes(bigToNum(interaction.minutesSaved))} saved
          </span>
          <span>· {nsToAgo(interaction.createdAt)}</span>
        </div>
      </div>
      <span
        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border ${outcomeColor} flex-shrink-0`}
      >
        {titleCase(outcome as InteractionOutcome)}
      </span>
    </div>
  );
}
