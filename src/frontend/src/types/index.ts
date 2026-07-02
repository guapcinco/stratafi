// StrataFi type re-exports + bigint/format helpers.
// All entity types come from the generated backend bindings.
export type {
  TenantId,
  UserId,
  LeadId,
  InteractionId,
  CampaignId,
  BillingId,
  Timestamp,
  Tenant,
  User,
  Lead,
  AiInteraction,
  SmsCampaign,
  VoiceCampaign,
  VoiceAgentConfig,
  Billing,
  InvoiceRecord,
  DashboardSummary,
  ColumnChartMetric,
  LiveEvent,
} from "@/backend";

export {
  PlanTier,
  Role,
  UserStatus,
  UserRole,
  LeadSource,
  LeadStatus,
  AudienceSegment,
  CampaignStatus,
  InteractionType,
  InteractionOutcome,
  LiveEventSource,
} from "@/backend";

// ---- bigint helpers -------------------------------------------------------

/** Coerce any bigint | number | string into a bigint. */
export function toBigInt(v: bigint | number | string): bigint {
  return BigInt(v);
}

/** Safe bigint -> number for sorting / math. Use only for small counts. */
export function bigToNum(v: bigint): number {
  return Number(v);
}

/** Format a bigint ns timestamp as a localized date string. */
export function nsToDate(ns: bigint): Date {
  return new Date(Number(ns / 1_000_000n));
}

/** Format a bigint ns timestamp as a relative "x ago" string. */
export function nsToAgo(ns: bigint): string {
  const diff = Date.now() - Number(ns / 1_000_000n);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Format a bigint ns timestamp as HH:MM:SS. */
export function nsToClock(ns: bigint): string {
  return nsToDate(ns).toLocaleTimeString("en-US", { hour12: false });
}

/** Format a USD currency value from a bigint of cents. */
export function formatUsd(cents: bigint): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(cents));
}

/** Format a plain integer with thousands separators. */
export function formatInt(v: bigint | number): string {
  return new Intl.NumberFormat("en-US").format(Number(v));
}

/** Format minutes as "Xh Ym". */
export function formatMinutes(min: bigint | number): string {
  const n = Number(min);
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format seconds as "Xm Ys". */
export function formatSeconds(sec: bigint | number): string {
  const n = Number(sec);
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** Initials from a full name. */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Title-case a snake/camel enum string. */
export function titleCase(v: string): string {
  return v
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
