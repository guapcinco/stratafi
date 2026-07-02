import type { LiveEventSource } from "@/backend";
import {
  EmptyState,
  MetricCard,
  SectionCard,
  StatusDot,
} from "@/components/Primitives";
import { useStrataFi } from "@/hooks/useStrataFi";
import { useLiveEventStream } from "@/hooks/useStrataFi";
import {
  bigToNum,
  formatInt,
  formatMinutes,
  nsToAgo,
  nsToClock,
  titleCase,
} from "@/types";
import { Activity, Clock, Phone, Users } from "lucide-react";

const SOURCE_COLOR: Record<LiveEventSource, string> = {
  sys: "text-muted-foreground",
  aiVoiceRouter: "text-primary",
  voiceCampaign: "text-secondary",
  aiTextSetter: "text-primary",
  smsCampaign: "text-secondary",
  aiDialer: "text-primary",
};

export function TeamStats() {
  const {
    activeTenantId,
    activeTenant,
    dashboardSummary,
    columnChartMetrics,
    users,
    loading,
    bootstrapping,
  } = useStrataFi();
  const { events, lastUpdated } = useLiveEventStream(activeTenantId, 4000);

  if (bootstrapping || (loading && !dashboardSummary)) {
    return <TeamStatsSkeleton />;
  }

  const summary = dashboardSummary;
  const chart = columnChartMetrics;
  const onlineAgents = users.filter((u) => u.status === "online");
  const activePct = summary ? Math.round(summary.activeAgentsPercentage) : 0;

  const chartBars = chart
    ? [
        {
          label: "SMS Sent",
          value: bigToNum(chart.smsSent),
          color: "bg-secondary",
        },
        {
          label: "AI Calls",
          value: bigToNum(chart.callsAi),
          color: "bg-primary",
        },
        {
          label: "Appts Booked",
          value: bigToNum(chart.apptsBooked),
          color: "bg-primary/70",
        },
        {
          label: "Live Transfers",
          value: bigToNum(chart.liveTransfers),
          color: "bg-secondary/70",
        },
        {
          label: "Leads Sold",
          value: bigToNum(chart.leadsSold),
          color: "bg-primary/50",
        },
      ]
    : [];
  const maxBar = Math.max(1, ...chartBars.map((b) => b.value));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Team Stats
          </h2>
          <p className="text-muted-foreground text-sm">
            {activeTenant?.agencyName ?? "—"} · live operations overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          live · updated{" "}
          {lastUpdated
            ? nsToClock(BigInt(lastUpdated.getTime()) * 1_000_000n)
            : "—"}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Agents Online"
          value={summary ? formatInt(summary.activeAgentsOnline) : "—"}
          sub={`${activePct}% of ${summary ? formatInt(summary.totalAgents) : 0} agents`}
          icon={<Users size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Total Leads"
          value={summary ? formatInt(summary.totalLeads) : "—"}
          sub="all sources"
          icon={<Activity size={18} className="text-secondary" />}
          accent="blue"
        />
        <MetricCard
          label="Time Saved by AI"
          value={summary ? formatMinutes(summary.timeSavedByAiMinutes) : "—"}
          sub="cumulative"
          icon={<Clock size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Online Now"
          value={formatInt(onlineAgents.length)}
          sub={`${users.length} total users`}
          icon={<Phone size={18} className="text-secondary" />}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column chart */}
        <SectionCard title="Activity Breakdown" className="lg:col-span-2">
          {chartBars.length === 0 ? (
            <EmptyState message="No chart data yet." />
          ) : (
            <div className="space-y-4 pt-2">
              {chartBars.map((bar) => (
                <div key={bar.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{bar.label}</span>
                    <span className="text-foreground font-mono font-medium">
                      {formatInt(bar.value)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-accent overflow-hidden border border-border">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                      style={{ width: `${(bar.value / maxBar) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Live stream */}
        <SectionCard
          title="Live Stream"
          action={
            <span className="text-[10px] text-primary font-mono uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              streaming
            </span>
          }
        >
          <div
            data-ocid="live_stream.list"
            className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1"
          >
            {events.length === 0 ? (
              <EmptyState
                message="Waiting for events…"
                hint="polling every 4s"
              />
            ) : (
              events.map((ev, i) => (
                <div
                  key={ev.id.toString()}
                  data-ocid={`live_stream.item.${i + 1}`}
                  className="stream-fade-in flex items-start gap-2.5 px-3 py-2 rounded-md bg-accent/40 border border-border"
                >
                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5 flex-shrink-0">
                    {nsToClock(ev.createdAt)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider ${SOURCE_COLOR[ev.source]}`}
                      >
                        {titleCase(ev.source)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 truncate">
                      {ev.message}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                    {nsToAgo(ev.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Online agents strip */}
      <SectionCard title="Agents Online">
        {onlineAgents.length === 0 ? (
          <EmptyState message="No agents online right now." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {onlineAgents.map((u, i) => (
              <div
                key={u.id.toString()}
                data-ocid={`agent_online.item.${i + 1}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-accent/40 border border-border"
              >
                <StatusDot status={u.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">
                    {u.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    {titleCase(u.role)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function TeamStatsSkeleton() {
  return (
    <div className="space-y-6 fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="crm-card p-5">
            <div className="w-9 h-9 rounded-md bg-accent mb-3 animate-pulse" />
            <div className="h-7 w-20 bg-accent rounded mb-2 animate-pulse" />
            <div className="h-3 w-24 bg-accent/60 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 crm-card p-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-2.5 bg-accent rounded-full animate-pulse"
            />
          ))}
        </div>
        <div className="crm-card p-5 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 bg-accent/60 rounded-md animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
