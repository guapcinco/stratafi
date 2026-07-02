import type { AiInteraction, Role, User, UserStatus } from "@/backend";
import { Role as RoleEnum, UserStatus as UserStatusEnum } from "@/backend";
import {
  EmptyState,
  MetricCard,
  SectionCard,
  StatusDot,
} from "@/components/Primitives";
import { useStrataFi } from "@/hooks/useStrataFi";
import {
  bigToNum,
  formatMinutes,
  formatSeconds,
  getInitials,
  nsToAgo,
  titleCase,
} from "@/types";
import { Award, Clock, Phone, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

const ROLE_FILTERS: (Role | "all")[] = [
  "all",
  RoleEnum.agent,
  RoleEnum.manager,
  RoleEnum.admin,
];

const STATUS_FILTERS: (UserStatus | "all")[] = [
  "all",
  UserStatusEnum.online,
  UserStatusEnum.offline,
  UserStatusEnum.away,
];

export function AgentPerformance() {
  const { users, aiInteractions, loading, bootstrapping, activeTenant } =
    useStrataFi();
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, roleFilter, statusFilter]);

  if (bootstrapping || loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="crm-card p-5 space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="h-12 bg-accent/60 rounded-md animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Build per-agent stats from interactions.
  const agentMap = new Map<bigint, User>();
  for (const u of users) agentMap.set(u.id, u);

  const agentStats = filteredUsers
    .map((u) => {
      const interactions = aiInteractions.filter(
        (i) =>
          i.agentId !== undefined && i.agentId !== null && i.agentId === u.id,
      );
      const minutesSaved = interactions.reduce(
        (sum, i) => sum + bigToNum(i.minutesSaved),
        0,
      );
      const totalDuration = interactions.reduce(
        (sum, i) => sum + bigToNum(i.durationSeconds),
        0,
      );
      const qualified = interactions.filter(
        (i) =>
          i.outcome === "qualified" ||
          i.outcome === "transferred" ||
          i.outcome === "booked",
      ).length;
      return {
        user: u,
        interactions,
        minutesSaved,
        totalDuration,
        qualified,
      };
    })
    .filter((s) => s.interactions.length > 0)
    .sort((a, b) => b.minutesSaved - a.minutesSaved);

  const totalMinutesSaved = aiInteractions.reduce(
    (sum, i) => sum + bigToNum(i.minutesSaved),
    0,
  );
  const totalInteractions = aiInteractions.length;
  const avgDuration =
    totalInteractions > 0
      ? Math.round(
          aiInteractions.reduce((s, i) => s + bigToNum(i.durationSeconds), 0) /
            totalInteractions,
        )
      : 0;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Agent Performance
        </h2>
        <p className="text-muted-foreground text-sm">
          {activeTenant?.agencyName ?? "—"} · per-agent AI interaction metrics
        </p>
      </div>

      <div
        data-ocid="agent_performance.filter_bar"
        className="crm-card p-3 flex flex-wrap items-center gap-4"
      >
        <FilterGroup
          label="Role"
          filters={ROLE_FILTERS}
          value={roleFilter}
          onChange={setRoleFilter}
          ocidPrefix="agent_performance.role_filter"
        />
        <div className="h-6 w-px bg-border" />
        <FilterGroup
          label="Status"
          filters={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
          ocidPrefix="agent_performance.status_filter"
        />
        {(roleFilter !== "all" || statusFilter !== "all") && (
          <button
            type="button"
            data-ocid="agent_performance.clear_filters.button"
            onClick={() => {
              setRoleFilter("all");
              setStatusFilter("all");
            }}
            className="ml-auto text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total AI Interactions"
          value={String(totalInteractions)}
          sub="all agents"
          icon={<Phone size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Total Time Saved"
          value={formatMinutes(totalMinutesSaved)}
          sub="by AI"
          icon={<Clock size={18} className="text-secondary" />}
          accent="blue"
        />
        <MetricCard
          label="Avg Interaction"
          value={formatSeconds(avgDuration)}
          sub="duration"
          icon={<TrendingUp size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Active Agents"
          value={String(agentStats.length)}
          sub="with interactions"
          icon={<Award size={18} className="text-secondary" />}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Agent Leaderboard">
          {agentStats.length === 0 ? (
            <EmptyState
              message={
                roleFilter !== "all" || statusFilter !== "all"
                  ? "No agents match the selected filters."
                  : "No agent interactions yet."
              }
              hint={
                roleFilter !== "all" || statusFilter !== "all"
                  ? "try clearing the filters"
                  : undefined
              }
            />
          ) : (
            <div className="space-y-2">
              {agentStats.map((s, i) => (
                <div
                  key={s.user.id.toString()}
                  data-ocid={`agent_leaderboard.item.${i + 1}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-accent/40 border border-border"
                >
                  <span className="w-6 h-6 rounded bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="w-8 h-8 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center text-xs font-bold text-secondary font-mono flex-shrink-0">
                    {getInitials(s.user.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">
                      {s.user.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                      <StatusDot status={s.user.status} />
                      {titleCase(s.user.role)} · {s.interactions.length}{" "}
                      interactions
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-primary font-mono font-medium">
                      {formatMinutes(s.minutesSaved)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      saved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Interactions">
          {aiInteractions.length === 0 ? (
            <EmptyState message="No interactions recorded." />
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
              {aiInteractions
                .slice()
                .sort((a, b) => Number(b.createdAt - a.createdAt))
                .slice(0, 20)
                .map((i, idx) => (
                  <InteractionRow
                    key={i.id.toString()}
                    interaction={i}
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
    </div>
  );
}

function InteractionRow({
  interaction,
  agent,
  index,
}: {
  interaction: AiInteraction;
  agent?: User;
  index: number;
}) {
  const isGreen =
    interaction.outcome === "qualified" ||
    interaction.outcome === "transferred" ||
    interaction.outcome === "booked";
  return (
    <div
      data-ocid={`interaction.item.${index}`}
      className="px-3 py-2.5 rounded-md bg-accent/40 border border-border"
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[10px] font-mono uppercase tracking-wider ${
            isGreen ? "text-primary" : "text-secondary"
          }`}
        >
          {titleCase(interaction.interactionType)} ·{" "}
          {titleCase(interaction.outcome)}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {nsToAgo(interaction.createdAt)}
        </span>
      </div>
      <p className="text-xs text-foreground/90 line-clamp-2">
        {interaction.summary}
      </p>
      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
        <span>{formatSeconds(interaction.durationSeconds)}</span>
        <span className="text-primary">
          {formatMinutes(interaction.minutesSaved)} saved
        </span>
        {agent && <span>· {agent.name}</span>}
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  filters,
  value,
  onChange,
  ocidPrefix,
}: {
  label: string;
  filters: T[];
  value: T;
  onChange: (v: T) => void;
  ocidPrefix: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-1">
        {label}
      </span>
      <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-accent border border-border">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            data-ocid={`${ocidPrefix}.${f}.tab`}
            onClick={() => onChange(f)}
            className={`px-2.5 h-6 rounded text-xs font-medium transition-colors ${
              value === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : titleCase(f)}
          </button>
        ))}
      </div>
    </div>
  );
}
