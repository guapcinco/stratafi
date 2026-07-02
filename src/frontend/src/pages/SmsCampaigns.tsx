import { AudienceSegment } from "@/backend";
import type { CampaignStatus, SmsCampaign, TenantId } from "@/backend";
import { EmptyState, MetricCard, SectionCard } from "@/components/Primitives";
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
import { Textarea } from "@/components/ui/textarea";
import { useStrataFi, useStrataFiActor } from "@/hooks/useStrataFi";
import { bigToNum, formatInt, nsToAgo, titleCase } from "@/types";
import { MessageSquare, Plus, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLOR: Record<CampaignStatus, string> = {
  running: "text-primary border-primary/30 bg-primary/10",
  scheduled: "text-secondary border-secondary/30 bg-secondary/10",
  draft: "text-muted-foreground border-border bg-accent",
  completed: "text-foreground border-border bg-accent/60",
  paused: "text-secondary border-secondary/30 bg-secondary/10",
  archived: "text-muted-foreground border-border bg-accent/40",
};

const SEGMENT_OPTIONS: { value: AudienceSegment; label: string }[] = [
  { value: AudienceSegment.allLeads, label: "All Leads" },
  { value: AudienceSegment.newLeads, label: "New Leads" },
  { value: AudienceSegment.aiContacted, label: "AI Contacted" },
  { value: AudienceSegment.apptBooked, label: "Appointment Booked" },
  { value: AudienceSegment.liveTransferred, label: "Live Transferred" },
  { value: AudienceSegment.sold, label: "Sold" },
];

const SEGMENT_LABEL: Record<AudienceSegment, string> = Object.fromEntries(
  SEGMENT_OPTIONS.map((s) => [s.value, s.label]),
) as Record<AudienceSegment, string>;

export function SmsCampaigns() {
  const {
    smsCampaigns,
    loading,
    bootstrapping,
    activeTenant,
    activeTenantId,
    refreshAll,
  } = useStrataFi();
  const { actor } = useStrataFiActor();
  const [showForm, setShowForm] = useState(false);

  if (bootstrapping || loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="crm-card p-5 h-24 bg-accent/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const totalSent = smsCampaigns.reduce((s, c) => s + bigToNum(c.sentCount), 0);
  const totalResponses = smsCampaigns.reduce(
    (s, c) => s + bigToNum(c.responseCount),
    0,
  );
  const responseRate =
    totalSent > 0 ? Math.round((totalResponses / totalSent) * 1000) / 10 : 0;
  const running = smsCampaigns.filter((c) => c.status === "running").length;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            SMS Campaigns
          </h2>
          <p className="text-muted-foreground text-sm">
            {activeTenant?.agencyName ?? "—"} · outbound text message campaigns
          </p>
        </div>
        <Button
          data-ocid="sms_campaign.new_campaign_button"
          variant={showForm ? "outline" : "default"}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Campaign"}
        </Button>
      </div>

      {showForm && activeTenantId !== null && (
        <CreateSmsCampaignForm
          actor={actor}
          tenantId={activeTenantId}
          onCreated={async () => {
            await refreshAll(activeTenantId);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Campaigns"
          value={String(smsCampaigns.length)}
          sub="all statuses"
          icon={<MessageSquare size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Running Now"
          value={String(running)}
          sub="active"
          icon={<Send size={18} className="text-secondary" />}
          accent="blue"
        />
        <MetricCard
          label="Messages Sent"
          value={formatInt(totalSent)}
          sub="cumulative"
          icon={<Send size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Response Rate"
          value={`${responseRate}%`}
          sub={`${formatInt(totalResponses)} responses`}
          icon={<MessageSquare size={18} className="text-secondary" />}
          accent="blue"
        />
      </div>

      <SectionCard title="All Campaigns">
        {smsCampaigns.length === 0 ? (
          <EmptyState
            message="No SMS campaigns yet."
            hint="click 'New Campaign' to create one"
          />
        ) : (
          <div className="space-y-2">
            {smsCampaigns
              .slice()
              .sort((a, b) => Number(b.createdAt - a.createdAt))
              .map((c, i) => (
                <CampaignRow key={c.id.toString()} campaign={c} index={i + 1} />
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function CreateSmsCampaignForm({
  actor,
  tenantId,
  onCreated,
  onCancel,
}: {
  actor: ReturnType<typeof useStrataFiActor>["actor"];
  tenantId: TenantId;
  onCreated: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<AudienceSegment>(
    AudienceSegment.allLeads,
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValid = name.trim().length > 0;
  const messageValid = message.trim().length > 0;
  const canSubmit = nameValid && messageValid && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) {
      setError("Backend not connected.");
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await actor.createSmsCampaign(
        tenantId,
        name.trim(),
        segment,
        message.trim(),
      );
      toast.success("SMS campaign created", {
        description: `"${name.trim()}" targeting ${SEGMENT_LABEL[segment]}.`,
      });
      setName("");
      setSegment(AudienceSegment.allLeads);
      setMessage("");
      await onCreated();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create campaign";
      setError(msg);
      toast.error("Failed to create SMS campaign", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      data-ocid="sms_campaign.create_form"
      onSubmit={handleSubmit}
      className="crm-card p-5 space-y-4 fade-in"
    >
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
          <MessageSquare size={14} className="text-primary" />
        </span>
        <h3 className="font-display text-base font-semibold text-foreground">
          Create SMS Campaign
        </h3>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="sms-campaign-name"
          className="text-xs text-muted-foreground"
        >
          Campaign Name
        </Label>
        <Input
          id="sms-campaign-name"
          data-ocid="sms_campaign.name.input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q3 Solar Re-engagement"
          className="crm-input h-9"
          maxLength={80}
          disabled={submitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sms-segment" className="text-xs text-muted-foreground">
          Target Lead Segment
        </Label>
        <Select
          value={segment}
          onValueChange={(v) => setSegment(v as AudienceSegment)}
          disabled={submitting}
        >
          <SelectTrigger
            data-ocid="sms_campaign.segment.select"
            id="sms-segment"
            className="w-full crm-input"
          >
            <SelectValue placeholder="Select segment" />
          </SelectTrigger>
          <SelectContent>
            {SEGMENT_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                data-ocid={`sms_campaign.segment.option.${opt.value}`}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="sms-message-template"
          className="text-xs text-muted-foreground"
        >
          Message Template
        </Label>
        <Textarea
          id="sms-message-template"
          data-ocid="sms_campaign.message.textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi {{first_name}}, this is {{agency}}. Reply YES to learn more."
          className="crm-input min-h-[96px] font-mono text-xs"
          maxLength={320}
          disabled={submitting}
        />
        <p className="text-[10px] text-muted-foreground font-mono">
          {message.length}/320 · use {"{{first_name}}"} for personalization
        </p>
      </div>

      {error && (
        <p
          data-ocid="sms_campaign.create_form.error_state"
          className="text-xs text-destructive font-mono"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
          data-ocid="sms_campaign.create_form.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit}
          data-ocid="sms_campaign.create_form.submit_button"
        >
          {submitting ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Send size={14} />
              Create Campaign
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function CampaignRow({
  campaign,
  index,
}: {
  campaign: SmsCampaign;
  index: number;
}) {
  const sent = bigToNum(campaign.sentCount);
  const responses = bigToNum(campaign.responseCount);
  const rate = sent > 0 ? Math.round((responses / sent) * 1000) / 10 : 0;

  return (
    <div
      data-ocid={`sms_campaign.item.${index}`}
      className="px-4 py-3 rounded-md bg-accent/40 border border-border hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm text-foreground font-medium truncate">
            {campaign.name}
          </span>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLOR[campaign.status]}`}
          >
            {titleCase(campaign.status)}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {nsToAgo(campaign.createdAt)}
        </span>
      </div>
      <p className="text-xs text-foreground/70 line-clamp-1 mb-2 font-mono">
        “{campaign.messageTemplate}”
      </p>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
        <span>
          segment:{" "}
          <span className="text-secondary">
            {SEGMENT_LABEL[campaign.audienceSegment] ??
              titleCase(campaign.audienceSegment)}
          </span>
        </span>
        <span>
          sent: <span className="text-foreground">{formatInt(sent)}</span>
        </span>
        <span>
          responses:{" "}
          <span className="text-primary">{formatInt(responses)}</span>
        </span>
        <span>
          rate: <span className="text-primary">{rate}%</span>
        </span>
      </div>
    </div>
  );
}
