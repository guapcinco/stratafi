import type {
  AiInteraction,
  InteractionOutcome,
  Lead,
  LeadSource,
  LeadStatus,
  User,
  UserId,
  VoiceCallRequest,
} from "@/backend";
import {
  InteractionType,
  LeadSource as Source,
  LeadStatus as Status,
} from "@/backend";
import { EmptyState, SectionCard, StatusDot } from "@/components/Primitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStrataFi } from "@/hooks/useStrataFi";
import {
  LEAD_STATUS_COLUMNS,
  LEAD_STATUS_LABEL,
  leadStatusColumn,
} from "@/lib/leads";
import {
  formatSeconds,
  formatUsd,
  getInitials,
  nsToAgo,
  nsToDate,
  titleCase,
} from "@/types";
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  PhoneCall,
  Save,
  Trash2,
  UserCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const SOURCE_OPTIONS: LeadSource[] = [
  Source.referral,
  Source.voiceCampaign,
  Source.webForm,
  Source.smsCampaign,
  Source.aiDialer,
  Source.csvImport,
  Source.inbound,
  Source.outbound,
];
const STATUS_OPTIONS: LeadStatus[] = LEAD_STATUS_COLUMNS.map((c) => c.status);
const SOURCE_LABEL: Record<LeadSource, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((s) => [s, titleCase(s)]),
) as Record<LeadSource, string>;

const TYPE_LABEL: Record<InteractionType, string> = {
  [InteractionType.voiceCall]: "Voice Call",
  [InteractionType.textMessage]: "Text Message",
  [InteractionType.liveTransfer]: "Live Transfer",
  [InteractionType.appointmentBooking]: "Appointment Booking",
};

interface EditForm {
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  annualPremiumValue: string;
  status: LeadStatus;
  assignedAgentId: string;
}

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    leads,
    users,
    aiInteractions,
    activeTenant,
    loading,
    bootstrapping,
    updateLead,
    deleteLead,
    placeVoiceCall,
  } = useStrataFi();

  const leadId = id ? BigInt(id) : null;
  const lead = useMemo(
    () =>
      leadId === null ? null : (leads.find((l) => l.id === leadId) ?? null),
    [leads, leadId],
  );

  const agentMap = useMemo(() => {
    const m = new Map<UserId, User>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const interactions = useMemo(() => {
    if (leadId === null) return [];
    return aiInteractions
      .filter((i) => i.leadId === leadId)
      .slice()
      .sort((a, b) => Number(b.createdAt - a.createdAt));
  }, [aiInteractions, leadId]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [calling, setCalling] = useState(false);

  function startEdit() {
    if (!lead) return;
    setForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      annualPremiumValue: String(lead.annualPremiumValue),
      status: lead.status,
      assignedAgentId:
        lead.assignedAgentId !== undefined && lead.assignedAgentId !== null
          ? lead.assignedAgentId.toString()
          : "",
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!lead || !form) return;
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    setSaving(true);
    try {
      const assigned =
        form.assignedAgentId === "" ? null : BigInt(form.assignedAgentId);
      const updated = await updateLead(
        lead.id,
        form.name.trim(),
        form.phone.trim(),
        form.email.trim(),
        form.source,
        Number(form.annualPremiumValue) || 0,
        form.status,
        assigned,
      );
      if (updated) {
        toast.success("Lead updated.");
        setEditing(false);
        setForm(null);
      } else {
        toast.error("Failed to update lead.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    setDeleting(true);
    try {
      const ok = await deleteLead(lead.id);
      if (ok) {
        toast.success("Lead deleted.");
        navigate("/leads");
      } else {
        toast.error("Failed to delete lead.");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handlePlaceCall() {
    if (!lead || !activeTenant) return;
    setCalling(true);
    try {
      const cfg = activeTenant.voiceAgent;
      const request: VoiceCallRequest = {
        tenantId: activeTenant.id,
        leadId: lead.id,
        task: `Contact ${lead.name} about their insurance inquiry and qualify for an appointment.`,
        voiceId: cfg.voiceId,
        language: cfg.language,
        transferPhoneNumber: cfg.transferPhoneNumber,
      };
      const result = await placeVoiceCall(request);
      if (result && result.status === "initiated") {
        toast.success(`Call placed · callId ${result.callId}`);
      } else {
        toast.error(`Call failed${result?.error ? `: ${result.error}` : ""}`);
      }
    } finally {
      setCalling(false);
    }
  }

  if (bootstrapping || loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="crm-card p-5 h-64 bg-accent/60 animate-pulse" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-6 fade-in">
        <BackHeader />
        <SectionCard title="Lead Not Found">
          <EmptyState
            message="This lead could not be found."
            hint="it may have been deleted or belong to another tenant"
          />
          <div className="pt-3">
            <Button
              type="button"
              data-ocid="lead_detail.back_to_leads.link"
              onClick={() => navigate("/leads")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ArrowLeft size={14} />
              Back to Leads
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  const col = leadStatusColumn(lead.status);
  const agent =
    lead.assignedAgentId !== undefined && lead.assignedAgentId !== null
      ? agentMap.get(lead.assignedAgentId)
      : undefined;

  return (
    <div className="space-y-6 fade-in">
      <BackHeader />

      {/* Header card */}
      <div className="crm-card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="w-14 h-14 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center text-lg font-bold text-primary font-mono flex-shrink-0">
              {getInitials(lead.name) || "—"}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-bold text-foreground truncate">
                  {lead.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border ${col.accent} ${col.tint}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                  {col.label}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">
                id: {lead.id.toString()} · created {nsToAgo(lead.createdAt)} ·
                updated {nsToAgo(lead.updatedAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              data-ocid="lead_detail.place_call.primary_button"
              onClick={handlePlaceCall}
              disabled={calling}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-blue"
            >
              <PhoneCall size={14} />
              {calling ? "Placing…" : "Place Call"}
            </Button>
            {!editing ? (
              <Button
                type="button"
                variant="outline"
                data-ocid="lead_detail.edit_button"
                onClick={startEdit}
                className="border-border text-foreground hover:bg-accent"
              >
                Edit
              </Button>
            ) : null}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  data-ocid="lead_detail.delete_button"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                data-ocid="lead_detail.delete.dialog"
                className="bg-card border-border text-foreground"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-foreground">
                    Delete Lead
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Permanently delete "{lead.name}"? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    data-ocid="lead_detail.delete.cancel_button"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="lead_detail.delete.confirm_button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile / Edit */}
        <SectionCard
          title={editing ? "Edit Lead" : "Lead Profile"}
          className="lg:col-span-2"
          action={
            editing ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-ocid="lead_detail.edit.cancel_button"
                  onClick={() => {
                    setEditing(false);
                    setForm(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  data-ocid="lead_detail.edit.save_button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save size={13} />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : null
          }
        >
          {editing && form ? (
            <EditFormView form={form} setForm={setForm} users={users} />
          ) : (
            <ProfileView lead={lead} agent={agent} />
          )}
        </SectionCard>

        {/* Quick facts */}
        <SectionCard title="Quick Facts">
          <dl className="space-y-3 text-sm">
            <FactRow
              label="Annual Premium"
              value={formatUsd(lead.annualPremiumValue)}
              mono
            />
            <FactRow label="Source" value={SOURCE_LABEL[lead.source]} />
            <FactRow label="Status" value={LEAD_STATUS_LABEL[lead.status]} />
            <FactRow
              label="Assigned Agent"
              value={agent ? agent.name : "Unassigned"}
            />
            <FactRow
              label="Created"
              value={nsToDate(lead.createdAt).toLocaleString()}
              mono
            />
            <FactRow
              label="Last Updated"
              value={nsToDate(lead.updatedAt).toLocaleString()}
              mono
            />
          </dl>
        </SectionCard>
      </div>

      {/* AI Interaction Timeline */}
      <SectionCard
        title={`AI Interactions (${interactions.length})`}
        action={<PhoneCall size={14} className="text-secondary" />}
      >
        {interactions.length === 0 ? (
          <EmptyState
            message="No AI interactions recorded for this lead yet."
            hint="place a call to start the conversation"
          />
        ) : (
          <ol className="relative space-y-4 pl-6 border-l border-border">
            {interactions.map((i, idx) => (
              <TimelineItem
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
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

function BackHeader() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      data-ocid="lead_detail.back_to_leads.link"
      onClick={() => navigate("/leads")}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft size={14} />
      Back to Leads
    </button>
  );
}

function ProfileView({ lead, agent }: { lead: Lead; agent?: User }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field icon={<UserCircle size={14} />} label="Name" value={lead.name} />
      <Field icon={<Phone size={14} />} label="Phone" value={lead.phone} mono />
      <Field
        icon={<Mail size={14} />}
        label="Email"
        value={lead.email || "—"}
      />
      <Field
        icon={<Calendar size={14} />}
        label="Source"
        value={SOURCE_LABEL[lead.source]}
      />
      <Field
        label="Annual Premium"
        value={formatUsd(lead.annualPremiumValue)}
        mono
      />
      <Field label="Status" value={LEAD_STATUS_LABEL[lead.status]} />
      <Field
        label="Assigned Agent"
        value={
          agent ? (
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary font-mono">
                {getInitials(agent.name)}
              </span>
              {agent.name}
            </span>
          ) : (
            "Unassigned"
          )
        }
      />
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {icon}
        {label}
      </div>
      <div
        className={`text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function FactRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </dt>
      <dd
        className={`text-sm text-foreground text-right ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EditFormView({
  form,
  setForm,
  users,
}: {
  form: EditForm;
  setForm: React.Dispatch<React.SetStateAction<EditForm | null>>;
  users: User[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5 md:col-span-2">
        <Label
          htmlFor="edit-name"
          className="text-foreground text-xs font-medium"
        >
          Full Name *
        </Label>
        <Input
          id="edit-name"
          data-ocid="lead_detail.edit.name.input"
          value={form.name}
          onChange={(e) =>
            setForm((f) => (f ? { ...f, name: e.target.value } : f))
          }
          className="bg-input border-border text-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="edit-phone"
          className="text-foreground text-xs font-medium"
        >
          Phone *
        </Label>
        <Input
          id="edit-phone"
          data-ocid="lead_detail.edit.phone.input"
          value={form.phone}
          onChange={(e) =>
            setForm((f) => (f ? { ...f, phone: e.target.value } : f))
          }
          className="bg-input border-border text-foreground font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="edit-email"
          className="text-foreground text-xs font-medium"
        >
          Email
        </Label>
        <Input
          id="edit-email"
          data-ocid="lead_detail.edit.email.input"
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm((f) => (f ? { ...f, email: e.target.value } : f))
          }
          className="bg-input border-border text-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-foreground text-xs font-medium">Source</Label>
        <Select
          value={form.source}
          onValueChange={(v) =>
            setForm((f) => (f ? { ...f, source: v as LeadSource } : f))
          }
        >
          <SelectTrigger
            data-ocid="lead_detail.edit.source.select"
            className="w-full bg-input border-border text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            {SOURCE_OPTIONS.map((s) => (
              <SelectItem
                key={s}
                value={s}
                data-ocid={`lead_detail.edit.source.${s}.item`}
              >
                {SOURCE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-foreground text-xs font-medium">Status</Label>
        <Select
          value={form.status}
          onValueChange={(v) =>
            setForm((f) => (f ? { ...f, status: v as LeadStatus } : f))
          }
        >
          <SelectTrigger
            data-ocid="lead_detail.edit.status.select"
            className="w-full bg-input border-border text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            {STATUS_OPTIONS.map((s) => (
              <SelectItem
                key={s}
                value={s}
                data-ocid={`lead_detail.edit.status.${s}.item`}
              >
                {LEAD_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="edit-premium"
          className="text-foreground text-xs font-medium"
        >
          Annual Premium (USD)
        </Label>
        <Input
          id="edit-premium"
          data-ocid="lead_detail.edit.annual_premium.input"
          type="number"
          min={0}
          value={form.annualPremiumValue}
          onChange={(e) =>
            setForm((f) =>
              f ? { ...f, annualPremiumValue: e.target.value } : f,
            )
          }
          className="bg-input border-border text-foreground font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-foreground text-xs font-medium">
          Assigned Agent
        </Label>
        <Select
          value={form.assignedAgentId}
          onValueChange={(v) =>
            setForm((f) => (f ? { ...f, assignedAgentId: v } : f))
          }
        >
          <SelectTrigger
            data-ocid="lead_detail.edit.assigned_agent.select"
            className="w-full bg-input border-border text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem
              value=""
              data-ocid="lead_detail.edit.assigned_agent.unassigned.item"
            >
              Unassigned
            </SelectItem>
            {users.map((u) => (
              <SelectItem
                key={u.id.toString()}
                value={u.id.toString()}
                data-ocid={`lead_detail.edit.assigned_agent.${u.id}.item`}
              >
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TimelineItem({
  interaction,
  agent,
  index,
}: {
  interaction: AiInteraction;
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
  const dotStatus = isPositive ? "online" : isNegative ? "offline" : "away";

  const outcomeColor = isPositive
    ? "text-primary border-primary/30 bg-primary/10"
    : isNegative
      ? "text-destructive border-destructive/30 bg-destructive/10"
      : "text-secondary border-secondary/30 bg-secondary/10";

  return (
    <li
      data-ocid={`lead_detail.interaction.item.${index}`}
      className="relative"
    >
      <span className="absolute -left-[27px] top-1.5">
        <StatusDot status={dotStatus} />
      </span>
      <div className="rounded-md bg-accent/40 border border-border px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-sm text-foreground font-medium">
            {TYPE_LABEL[interaction.interactionType]}
          </span>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${outcomeColor}`}
          >
            {titleCase(outcome as InteractionOutcome)}
          </span>
          {agent && (
            <span className="text-[10px] text-muted-foreground font-mono">
              · {agent.name}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground/80 line-clamp-3">
          {interaction.summary}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
          <span>{formatSeconds(interaction.durationSeconds)}</span>
          <span>· {nsToAgo(interaction.createdAt)}</span>
          <span>· {nsToDate(interaction.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </li>
  );
}
