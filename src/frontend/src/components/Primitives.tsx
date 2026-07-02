import type React from "react";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "green" | "blue" | "neutral";
  alert?: boolean;
}

const ACCENT_RING: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  green: "text-primary",
  blue: "text-secondary",
  neutral: "text-muted-foreground",
};

const ACCENT_BG: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  green: "bg-primary/10 border-primary/30",
  blue: "bg-secondary/10 border-secondary/30",
  neutral: "bg-accent border-border",
};

export function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = "neutral",
  alert,
}: MetricCardProps) {
  return (
    <div
      className={`crm-card p-5 transition-colors ${
        alert ? "border-destructive/50" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-md border flex items-center justify-center ${ACCENT_BG[accent]}`}
        >
          {icon ??
            (alert ? (
              <span className="text-destructive text-xs font-mono">!</span>
            ) : null)}
        </div>
      </div>
      <div
        className={`text-2xl font-bold font-display mb-1 ${
          alert ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-foreground text-sm font-medium">{label}</div>
      {sub && (
        <div className={`text-xs mt-0.5 ${ACCENT_RING[accent]}`}>{sub}</div>
      )}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <div className={`crm-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-foreground font-semibold text-sm font-display">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <div
      data-ocid="empty_state"
      className="flex flex-col items-center justify-center py-10 text-center"
    >
      <p className="text-muted-foreground text-sm">{message}</p>
      {hint && (
        <p className="text-muted-foreground text-xs mt-1 font-mono">{hint}</p>
      )}
    </div>
  );
}

interface StatusDotProps {
  status: "online" | "away" | "offline" | string;
}

export function StatusDot({ status }: StatusDotProps) {
  const color =
    status === "online"
      ? "bg-primary"
      : status === "away"
        ? "bg-secondary"
        : "bg-muted-foreground/50";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} ${
        status === "online" ? "shadow-[0_0_6px_oklch(var(--primary))]" : ""
      }`}
    />
  );
}
