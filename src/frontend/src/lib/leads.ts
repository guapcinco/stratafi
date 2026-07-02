import { LeadStatus } from "@/backend";

/**
 * Shared LeadStatus column metadata.
 *
 * Used by both the Leads list filters and the Pipeline board so the two
 * views stay in sync on labels, ordering, and accent colors.
 */
export interface LeadStatusColumn {
  status: LeadStatus;
  label: string;
  /** Tailwind text/border accent class for the column header + chips. */
  accent: string;
  /** Tailwind background tint for the column body. */
  tint: string;
  /** Dot color used in compact status indicators. */
  dot: string;
}

export const LEAD_STATUS_COLUMNS: LeadStatusColumn[] = [
  {
    status: LeadStatus.newLead,
    label: "New Lead",
    accent: "text-primary border-primary/40",
    tint: "bg-primary/5",
    dot: "bg-primary",
  },
  {
    status: LeadStatus.aiContacted,
    label: "AI Contacted",
    accent: "text-secondary border-secondary/40",
    tint: "bg-secondary/5",
    dot: "bg-secondary",
  },
  {
    status: LeadStatus.apptBooked,
    label: "Appointment Booked",
    accent: "text-primary border-primary/40",
    tint: "bg-primary/5",
    dot: "bg-primary",
  },
  {
    status: LeadStatus.liveTransferred,
    label: "Live Transferred",
    accent: "text-secondary border-secondary/40",
    tint: "bg-secondary/5",
    dot: "bg-secondary",
  },
  {
    status: LeadStatus.sold,
    label: "Sold",
    accent: "text-foreground border-border",
    tint: "bg-accent/40",
    dot: "bg-foreground",
  },
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = Object.fromEntries(
  LEAD_STATUS_COLUMNS.map((c) => [c.status, c.label]),
) as Record<LeadStatus, string>;

export const LEAD_STATUS_ORDER: LeadStatus[] = LEAD_STATUS_COLUMNS.map(
  (c) => c.status,
);

export function leadStatusColumn(status: LeadStatus): LeadStatusColumn {
  return (
    LEAD_STATUS_COLUMNS.find((c) => c.status === status) ??
    LEAD_STATUS_COLUMNS[0]
  );
}
