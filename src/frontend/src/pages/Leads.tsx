import type { Lead, LeadSource, LeadStatus, User, UserId } from "@/backend";
import { LeadSource as Source, LeadStatus as Status } from "@/backend";
import { ImportLeadsModal } from "@/components/ImportLeadsModal";
import { EmptyState, SectionCard } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { formatUsd, getInitials, nsToAgo, titleCase } from "@/types";
import { Filter, Plus, Search, Upload, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface NewLeadForm {
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  annualPremiumValue: string;
  status: LeadStatus;
  assignedAgentId: string; // "" = unassigned
}

const EMPTY_FORM: NewLeadForm = {
  name: "",
  phone: "",
  email: "",
  source: Source.webForm,
  annualPremiumValue: "",
  status: Status.newLead,
  assignedAgentId: "",
};

export function Leads() {
  const {
    leads,
    users,
    activeTenant,
    activeTenantId,
    loading,
    bootstrapping,
    createLead,
  } = useStrataFi();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all"); // "all" | "unassigned" | userId
  const [createOpen, setCreateOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState<NewLeadForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const agentMap = useMemo(() => {
    const m = new Map<UserId, User>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = leads;
    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }
    if (agentFilter === "unassigned") {
      list = list.filter(
        (l) => l.assignedAgentId === undefined || l.assignedAgentId === null,
      );
    } else if (agentFilter !== "all") {
      const uid = BigInt(agentFilter);
      list = list.filter((l) => l.assignedAgentId === uid);
    }
    return list.slice().sort((a, b) => Number(b.createdAt - a.createdAt));
  }, [leads, search, statusFilter, agentFilter]);

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function handleCreate() {
    if (!activeTenantId) {
      toast.error("No active tenant.");
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    setSubmitting(true);
    try {
      const premium = form.annualPremiumValue.trim()
        ? Number(form.annualPremiumValue)
        : 0;
      const assigned =
        form.assignedAgentId === "" ? null : BigInt(form.assignedAgentId);
      const created = await createLead(
        activeTenantId,
        form.name.trim(),
        form.phone.trim(),
        form.email.trim(),
        form.source,
        premium,
        assigned,
      );
      if (created) {
        toast.success(`Lead "${created.name}" created.`);
        setCreateOpen(false);
        resetForm();
      } else {
        toast.error("Failed to create lead.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (bootstrapping || loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="crm-card p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 bg-accent/60 rounded-md animate-pulse"
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
            Leads
          </h2>
          <p className="text-muted-foreground text-sm">
            {activeTenant?.agencyName ?? "—"} · {leads.length} total ·{" "}
            {filtered.length} shown
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              data-ocid="leads.import_csv.open_modal_button"
              onClick={() => setShowImportModal(true)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Upload size={14} />
              Import CSV
            </Button>
            <DialogTrigger asChild>
              <Button
                type="button"
                data-ocid="leads.new_lead.open_modal_button"
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green"
              >
                <Plus size={14} />
                New Lead
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent
            data-ocid="leads.new_lead.dialog"
            className="bg-card border-border text-foreground"
          >
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">
                Create New Lead
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label
                    htmlFor="lead-name"
                    className="text-foreground text-xs font-medium"
                  >
                    Full Name *
                  </Label>
                  <Input
                    id="lead-name"
                    data-ocid="leads.new_lead.name.input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Avery Thompson"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-phone"
                    className="text-foreground text-xs font-medium"
                  >
                    Phone *
                  </Label>
                  <Input
                    id="lead-phone"
                    data-ocid="leads.new_lead.phone.input"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+1 555 0142"
                    className="bg-input border-border text-foreground font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-email"
                    className="text-foreground text-xs font-medium"
                  >
                    Email
                  </Label>
                  <Input
                    id="lead-email"
                    data-ocid="leads.new_lead.email.input"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="avery@example.com"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">
                    Source
                  </Label>
                  <Select
                    value={form.source}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, source: v as LeadSource }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="leads.new_lead.source.select"
                      className="w-full bg-input border-border text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          data-ocid={`leads.new_lead.source.${s}.item`}
                        >
                          {SOURCE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">
                    Status
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, status: v as LeadStatus }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="leads.new_lead.status.select"
                      className="w-full bg-input border-border text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          data-ocid={`leads.new_lead.status.${s}.item`}
                        >
                          {LEAD_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-premium"
                    className="text-foreground text-xs font-medium"
                  >
                    Annual Premium (USD)
                  </Label>
                  <Input
                    id="lead-premium"
                    data-ocid="leads.new_lead.annual_premium.input"
                    type="number"
                    min={0}
                    value={form.annualPremiumValue}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        annualPremiumValue: e.target.value,
                      }))
                    }
                    placeholder="0"
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
                      setForm((f) => ({ ...f, assignedAgentId: v }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="leads.new_lead.assigned_agent.select"
                      className="w-full bg-input border-border text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem
                        value=""
                        data-ocid="leads.new_lead.assigned_agent.unassigned.item"
                      >
                        Unassigned
                      </SelectItem>
                      {users.map((u) => (
                        <SelectItem
                          key={u.id.toString()}
                          value={u.id.toString()}
                          data-ocid={`leads.new_lead.assigned_agent.${u.id}.item`}
                        >
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                data-ocid="leads.new_lead.cancel_button"
                onClick={() => {
                  setCreateOpen(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                data-ocid="leads.new_lead.confirm_button"
                onClick={handleCreate}
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? "Creating…" : "Create Lead"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            data-ocid="leads.search.input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or email…"
            className="crm-input w-full pl-9 pr-3 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}
          >
            <SelectTrigger
              data-ocid="leads.status_filter.select"
              className="h-9 w-44 bg-input border-border text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="all" data-ocid="leads.status_filter.all.item">
                All Statuses
              </SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  data-ocid={`leads.status_filter.${s}.item`}
                >
                  {LEAD_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger
              data-ocid="leads.agent_filter.select"
              className="h-9 w-44 bg-input border-border text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="all" data-ocid="leads.agent_filter.all.item">
                All Agents
              </SelectItem>
              <SelectItem
                value="unassigned"
                data-ocid="leads.agent_filter.unassigned.item"
              >
                Unassigned
              </SelectItem>
              {users.map((u) => (
                <SelectItem
                  key={u.id.toString()}
                  value={u.id.toString()}
                  data-ocid={`leads.agent_filter.${u.id}.item`}
                >
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <SectionCard
        title={`Leads (${filtered.length})`}
        action={
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            {filtered.length} of {leads.length}
          </span>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            message="No leads match the current filters."
            hint="try adjusting search or filters"
          />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Phone</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Source</th>
                  <th className="px-2 py-2 font-medium text-right">Premium</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Agent</th>
                  <th className="px-2 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, idx) => (
                  <LeadRow
                    key={lead.id.toString()}
                    lead={lead}
                    agent={
                      lead.assignedAgentId !== undefined &&
                      lead.assignedAgentId !== null
                        ? agentMap.get(lead.assignedAgentId)
                        : undefined
                    }
                    index={idx + 1}
                    onClick={() => navigate(`/leads/${lead.id.toString()}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ImportLeadsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}

function LeadRow({
  lead,
  agent,
  index,
  onClick,
}: {
  lead: Lead;
  agent?: User;
  index: number;
  onClick: () => void;
}) {
  const col = leadStatusColumn(lead.status);
  return (
    <tr
      data-ocid={`leads.item.${index}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      className="border-b border-border/60 hover:bg-accent/40 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset"
    >
      <td className="px-2 py-2.5">
        <span className="text-foreground font-medium truncate block max-w-[180px]">
          {lead.name}
        </span>
      </td>
      <td className="px-2 py-2.5 font-mono text-xs text-muted-foreground">
        {lead.phone}
      </td>
      <td className="px-2 py-2.5 text-muted-foreground truncate max-w-[200px]">
        {lead.email || "—"}
      </td>
      <td className="px-2 py-2.5 text-muted-foreground text-xs">
        {SOURCE_LABEL[lead.source]}
      </td>
      <td className="px-2 py-2.5 text-right font-mono text-xs text-foreground">
        {formatUsd(lead.annualPremiumValue)}
      </td>
      <td className="px-2 py-2.5">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border ${col.accent} ${col.tint}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
          {col.label}
        </span>
      </td>
      <td className="px-2 py-2.5">
        {agent ? (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary font-mono">
              {getInitials(agent.name)}
            </span>
            <span className="text-xs text-foreground truncate max-w-[120px]">
              {agent.name}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCircle size={14} />
            Unassigned
          </span>
        )}
      </td>
      <td className="px-2 py-2.5 text-xs text-muted-foreground font-mono">
        {nsToAgo(lead.createdAt)}
      </td>
    </tr>
  );
}
