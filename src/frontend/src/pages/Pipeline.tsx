import { useStrataFiContext } from "@/AppContext";
import type { Lead, VoiceCallRequest } from "@/backend";
import { LeadStatus } from "@/backend";
import { EmptyState, SectionCard } from "@/components/Primitives";
import { LEAD_STATUS_COLUMNS, leadStatusColumn } from "@/lib/leads";
import { formatUsd, getInitials } from "@/types";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Pipeline board page.
 *
 * Drag-and-drop kanban across the 5 LeadStatus columns. Dragging across
 * columns updates the lead status (optimistic, with rollback on failure);
 * dragging within a column reorders the local array. Each card has a
 * "Place Call" action that fires placeVoiceCall from context.
 */

interface ColumnDroppableProps {
  status: LeadStatus;
  children: React.ReactNode;
}

function ColumnDroppable({ status, children }: ColumnDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
  const col = leadStatusColumn(status);
  return (
    <div
      ref={setNodeRef}
      data-ocid={`pipeline.column.${status}`}
      className={`flex flex-col rounded-lg border border-border/60 min-h-[420px] transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : col.tint
      }`}
    >
      {children}
    </div>
  );
}

interface LeadCardProps {
  lead: Lead;
  agentName: string;
  onPlaceCall: (lead: Lead) => void;
  overlay?: boolean;
}

function LeadCard({ lead, agentName, onPlaceCall, overlay }: LeadCardProps) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lead-${lead.id.toString()}`,
  });

  const handleClick = () => navigate(`/leads/${lead.id.toString()}`);
  const handlePlaceCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlaceCall(lead);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-ocid={`pipeline.card.${lead.id.toString()}`}
      onClick={handleClick}
      className={`crm-card p-3 cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging && !overlay ? "opacity-30" : "opacity-100"
      } ${overlay ? "rotate-2 shadow-lg" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold truncate">
            {lead.name}
          </p>
          <p className="text-muted-foreground text-xs font-mono truncate">
            {lead.phone}
          </p>
        </div>
        <span
          aria-label={agentName ? `Assigned to ${agentName}` : "Unassigned"}
          className="shrink-0 w-7 h-7 rounded-full bg-accent border border-border flex items-center justify-center text-[10px] font-mono font-bold text-foreground"
        >
          {agentName ? getInitials(agentName) : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-primary text-sm font-display font-bold">
          {formatUsd(lead.annualPremiumValue)}
        </span>
        <button
          type="button"
          data-ocid={`pipeline.place_call_button.${lead.id.toString()}`}
          onClick={handlePlaceCall}
          aria-label={`Place call to ${lead.name}`}
          className="inline-flex items-center gap-1 rounded-md border border-secondary/40 bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary transition-colors hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <Phone className="w-3 h-3" />
          Call
        </button>
      </div>
    </div>
  );
}

export function Pipeline() {
  const { leads, users, activeTenantId, updateLead, placeVoiceCall } =
    useStrataFiContext();
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Local ordering overlay so within-column drags reorder visually.
  const [order, setOrder] = useState<Record<string, string[]>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset local order overlay whenever the backend leads set changes
  useEffect(() => {
    // Reset local order whenever the leads set changes from the backend.
    setOrder({});
  }, [leads]);

  const userById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.id.toString(), u.name);
    return m;
  }, [users]);

  const grouped = useMemo(() => {
    const byStatus: Record<LeadStatus, Lead[]> = {
      [LeadStatus.newLead]: [],
      [LeadStatus.aiContacted]: [],
      [LeadStatus.apptBooked]: [],
      [LeadStatus.liveTransferred]: [],
      [LeadStatus.sold]: [],
    };
    for (const l of leads) byStatus[l.status].push(l);
    // Apply local ordering overlay if present.
    for (const status of Object.keys(byStatus) as LeadStatus[]) {
      const ids = order[status];
      if (!ids || ids.length === 0) continue;
      const map = new Map(byStatus[status].map((l) => [l.id.toString(), l]));
      const reordered: Lead[] = [];
      for (const id of ids) {
        const l = map.get(id);
        if (l) {
          reordered.push(l);
          map.delete(id);
        }
      }
      reordered.push(...map.values());
      byStatus[status] = reordered;
    }
    return byStatus;
  }, [leads, order]);

  const activeLead = useMemo(() => {
    if (!activeLeadId) return null;
    return leads.find((l) => l.id.toString() === activeLeadId) ?? null;
  }, [activeLeadId, leads]);

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string;
    setActiveLeadId(id.replace(/^lead-/, ""));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveLeadId(null);
    const activeId = e.active.id as string;
    const leadIdStr = activeId.replace(/^lead-/, "");
    const overId = e.over?.id as string | undefined;
    if (!overId) return;

    const fromStatus = (
      LEAD_STATUS_COLUMNS.find((c) =>
        grouped[c.status].some((l) => l.id.toString() === leadIdStr),
      ) ?? LEAD_STATUS_COLUMNS[0]
    ).status;
    const toStatus = (
      LEAD_STATUS_COLUMNS.find((c) => `column-${c.status}` === overId) ??
      LEAD_STATUS_COLUMNS.find((c) => c.status === fromStatus)
    )?.status;

    if (!toStatus) return;
    const lead = leads.find((l) => l.id.toString() === leadIdStr);
    if (!lead) return;

    // Within-column reorder: just update local ordering overlay.
    if (toStatus === fromStatus) {
      setOrder((prev) => {
        const col = grouped[fromStatus].map((l) => l.id.toString());
        const fromIdx = col.indexOf(leadIdStr);
        const overLeadId = overId.replace(/^lead-/, "");
        const toIdx = col.indexOf(overLeadId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
        const next = [...col];
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, leadIdStr);
        return { ...prev, [fromStatus]: next };
      });
      return;
    }

    // Cross-column: optimistic update + rollback.
    const prevLeads = leads;
    // Optimistically mutate via context's setLeads is not exposed; instead we
    // rely on updateLead to refresh. To keep UI snappy, we update local order
    // overlay so the card visually moves immediately.
    setOrder((prev) => ({
      ...prev,
      [toStatus]: [...(prev[toStatus] ?? []), leadIdStr],
      [fromStatus]: (prev[fromStatus] ?? []).filter((id) => id !== leadIdStr),
    }));

    const result = await updateLead(
      lead.id,
      lead.name,
      lead.phone,
      lead.email,
      lead.source,
      Number(lead.annualPremiumValue),
      toStatus,
      lead.assignedAgentId ?? null,
    );

    if (!result) {
      // Rollback overlay.
      setOrder((prev) => ({
        ...prev,
        [toStatus]: (prev[toStatus] ?? []).filter((id) => id !== leadIdStr),
        [fromStatus]: [...(prev[fromStatus] ?? []), leadIdStr],
      }));
      toast.error("Failed to move lead", {
        description: `Could not update ${lead.name} to ${leadStatusColumn(toStatus).label}. Reverting.`,
      });
    } else {
      toast.success("Lead moved", {
        description: `${lead.name} → ${leadStatusColumn(toStatus).label}`,
      });
    }
    void prevLeads;
  };

  const handlePlaceCall = async (lead: Lead) => {
    if (!activeTenantId) {
      toast.error("No active tenant", {
        description: "Select a tenant before placing a call.",
      });
      return;
    }
    const request: VoiceCallRequest = {
      tenantId: activeTenantId,
      leadId: lead.id,
      task: `Qualify and book an appointment for ${lead.name}.`,
      voiceId: "eleven-multilingual-v2",
      language: "en",
      transferPhoneNumber: lead.phone,
    };
    toast.loading("Placing call…", { id: `call-${lead.id.toString()}` });
    const result = await placeVoiceCall(request);
    if (result && result.status === "initiated") {
      toast.success("Call initiated", {
        id: `call-${lead.id.toString()}`,
        description: `Connecting ${lead.name} (${lead.phone}).`,
      });
    } else {
      toast.error("Call failed", {
        id: `call-${lead.id.toString()}`,
        description: result?.error ?? "Could not place the call.",
      });
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Pipeline
        </h2>
        <p className="text-muted-foreground text-sm">
          Drag-and-drop kanban across lead statuses
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLeadId(null)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {LEAD_STATUS_COLUMNS.map((col) => {
            const colLeads = grouped[col.status];
            const total = colLeads.reduce(
              (sum, l) => sum + l.annualPremiumValue,
              0n,
            );
            return (
              <ColumnDroppable key={col.status} status={col.status}>
                <div
                  className={`flex items-center justify-between px-3 py-2.5 border-b border-border/60 rounded-t-lg ${col.tint}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${col.dot}`}
                    />
                    <h3
                      className={`text-xs font-display font-semibold uppercase tracking-wide truncate ${col.accent.split(" ")[0]}`}
                    >
                      {col.label}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${col.accent}`}
                  >
                    {colLeads.length}
                  </span>
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-mono text-muted-foreground text-right">
                    {formatUsd(total)}
                  </p>
                </div>
                <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
                  {colLeads.length === 0 ? (
                    <EmptyState
                      message={`No leads in ${col.label}`}
                      hint="Drag a card here"
                    />
                  ) : (
                    colLeads.map((lead) => (
                      <LeadCard
                        key={lead.id.toString()}
                        lead={lead}
                        agentName={
                          lead.assignedAgentId
                            ? (userById.get(lead.assignedAgentId.toString()) ??
                              "")
                            : ""
                        }
                        onPlaceCall={handlePlaceCall}
                      />
                    ))
                  )}
                </div>
              </ColumnDroppable>
            );
          })}
        </div>

        <DragOverlay>
          {activeLead ? (
            <LeadCard
              lead={activeLead}
              agentName={
                activeLead.assignedAgentId
                  ? (userById.get(activeLead.assignedAgentId.toString()) ?? "")
                  : ""
              }
              onPlaceCall={handlePlaceCall}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <SectionCard title="Board Tips">
        <ul className="text-xs text-muted-foreground space-y-1 font-mono">
          <li>• Drag a card between columns to update its status.</li>
          <li>• Drag within a column to reorder visually.</li>
          <li>• Click a card to open the lead detail page.</li>
          <li>• Use the Call button to place a voice call.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
