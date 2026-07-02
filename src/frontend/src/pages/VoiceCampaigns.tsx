import { AudienceSegment, LeadStatus } from "@/backend";
import type {
  CampaignStatus,
  TenantId,
  VoiceAgentConfig,
  VoiceCampaign,
} from "@/backend";
import type { CampaignId } from "@/backend";
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
import { useStrataFi, useStrataFiActor } from "@/hooks/useStrataFi";
import {
  bigToNum,
  formatInt,
  formatMinutes,
  nsToAgo,
  titleCase,
} from "@/types";
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  Plus,
  Rocket,
  X,
} from "lucide-react";
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

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: LeadStatus.newLead, label: "New Lead" },
  { value: LeadStatus.aiContacted, label: "AI Contacted" },
  { value: LeadStatus.apptBooked, label: "Appointment Booked" },
  { value: LeadStatus.liveTransferred, label: "Live Transferred" },
  { value: LeadStatus.sold, label: "Sold" },
];

export function VoiceCampaigns() {
  const {
    voiceCampaigns,
    loading,
    bootstrapping,
    activeTenant,
    activeTenantId,
    refreshAll,
    launchVoiceCampaign,
  } = useStrataFi();
  const { actor } = useStrataFiActor();
  const [showForm, setShowForm] = useState(false);
  const [launchingId, setLaunchingId] = useState<CampaignId | null>(null);

  async function handleLaunch(campaignId: CampaignId) {
    if (activeTenantId === null || launchingId !== null) return;
    const tenantId = activeTenantId;
    setLaunchingId(campaignId);
    try {
      const results = await launchVoiceCampaign(tenantId, campaignId);
      if (results === null) {
        toast.error("Failed to launch campaign", {
          description: "The backend rejected the launch request.",
        });
      } else {
        toast.success("Campaign launched", {
          description: `${results.length} call${results.length === 1 ? "" : "s"} placed.`,
        });
        await refreshAll(tenantId);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unexpected error during launch";
      toast.error("Failed to launch campaign", { description: msg });
    } finally {
      setLaunchingId(null);
    }
  }

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

  const totalCalls = voiceCampaigns.reduce(
    (s, c) => s + bigToNum(c.callsPlaced),
    0,
  );
  const totalTransfers = voiceCampaigns.reduce(
    (s, c) => s + bigToNum(c.qualifiedTransfers),
    0,
  );
  const totalMinutesSaved = voiceCampaigns.reduce(
    (s, c) => s + bigToNum(c.minutesSaved),
    0,
  );
  const transferRate =
    totalCalls > 0 ? Math.round((totalTransfers / totalCalls) * 1000) / 10 : 0;
  const running = voiceCampaigns.filter((c) => c.status === "running").length;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Voice Campaigns
          </h2>
          <p className="text-muted-foreground text-sm">
            {activeTenant?.agencyName ?? "—"} · AI voice dialer campaigns
          </p>
        </div>
        <Button
          data-ocid="voice_campaign.new_campaign_button"
          variant={showForm ? "outline" : "default"}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Campaign"}
        </Button>
      </div>

      {showForm && activeTenantId !== null && (
        <CreateVoiceCampaignForm
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
          value={String(voiceCampaigns.length)}
          sub="all statuses"
          icon={<Phone size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Calls Placed"
          value={formatInt(totalCalls)}
          sub="cumulative"
          icon={<PhoneCall size={18} className="text-secondary" />}
          accent="blue"
        />
        <MetricCard
          label="Qualified Transfers"
          value={formatInt(totalTransfers)}
          sub={`${transferRate}% transfer rate`}
          icon={<PhoneForwarded size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Minutes Saved"
          value={formatMinutes(totalMinutesSaved)}
          sub="by AI voice"
          icon={<PhoneCall size={18} className="text-secondary" />}
          accent="blue"
        />
      </div>

      <SectionCard
        title="All Voice Campaigns"
        action={
          running > 0 ? (
            <span className="text-[10px] text-primary font-mono uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              {running} running
            </span>
          ) : undefined
        }
      >
        {voiceCampaigns.length === 0 ? (
          <EmptyState
            message="No voice campaigns yet."
            hint="click 'New Campaign' to create one"
          />
        ) : (
          <div className="space-y-2">
            {voiceCampaigns
              .slice()
              .sort((a, b) => Number(b.createdAt - a.createdAt))
              .map((c, i) => (
                <VoiceCampaignRow
                  key={c.id.toString()}
                  campaign={c}
                  index={i + 1}
                  launching={launchingId === c.id}
                  canLaunch={activeTenantId !== null && launchingId === null}
                  onLaunch={() => handleLaunch(c.id)}
                />
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function CreateVoiceCampaignForm({
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
  const [targetStatus, setTargetStatus] = useState<LeadStatus>(
    LeadStatus.newLead,
  );
  const [agentName, setAgentName] = useState("");
  const [voiceProvider, setVoiceProvider] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [model, setModel] = useState("");
  const [voiceSettings, setVoiceSettings] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [transferPhoneNumber, setTransferPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValid = name.trim().length > 0;
  const agentNameValid = agentName.trim().length > 0;
  const providerValid = voiceProvider.trim().length > 0;
  const voiceIdValid = voiceId.trim().length > 0;
  const languageValid = language.trim().length > 0;
  const canSubmit =
    nameValid &&
    agentNameValid &&
    providerValid &&
    voiceIdValid &&
    languageValid &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) {
      setError("Backend not connected.");
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const voiceAgent: VoiceAgentConfig = {
      agentName: agentName.trim(),
      voiceProvider: voiceProvider.trim(),
      voiceId: voiceId.trim(),
      language: language.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      transferPhoneNumber: transferPhoneNumber.trim(),
      voiceSettings: voiceSettings.trim(),
    };
    try {
      await actor.createVoiceCampaign(
        tenantId,
        name.trim(),
        segment,
        targetStatus,
        voiceAgent,
      );
      toast.success("Voice campaign created", {
        description: `"${name.trim()}" with agent ${agentName.trim()}.`,
      });
      setName("");
      setSegment(AudienceSegment.allLeads);
      setTargetStatus(LeadStatus.newLead);
      setAgentName("");
      setVoiceProvider("");
      setVoiceId("");
      setLanguage("en-US");
      setModel("");
      setVoiceSettings("");
      setApiKey("");
      setTransferPhoneNumber("");
      await onCreated();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create campaign";
      setError(msg);
      toast.error("Failed to create voice campaign", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      data-ocid="voice_campaign.create_form"
      onSubmit={handleSubmit}
      className="crm-card p-5 space-y-4 fade-in"
    >
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Phone size={14} className="text-primary" />
        </span>
        <h3 className="font-display text-base font-semibold text-foreground">
          Create Voice Campaign
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="voice-campaign-name"
            className="text-xs text-muted-foreground"
          >
            Campaign Name
          </Label>
          <Input
            id="voice-campaign-name"
            data-ocid="voice_campaign.name.input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Solar Inbound Qualifier"
            className="crm-input h-9"
            maxLength={80}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="voice-segment"
            className="text-xs text-muted-foreground"
          >
            Target Lead Segment
          </Label>
          <Select
            value={segment}
            onValueChange={(v) => setSegment(v as AudienceSegment)}
            disabled={submitting}
          >
            <SelectTrigger
              data-ocid="voice_campaign.segment.select"
              id="voice-segment"
              className="w-full crm-input"
            >
              <SelectValue placeholder="Select segment" />
            </SelectTrigger>
            <SelectContent>
              {SEGMENT_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  data-ocid={`voice_campaign.segment.option.${opt.value}`}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="voice-target-status"
            className="text-xs text-muted-foreground"
          >
            Target Lead Status
          </Label>
          <Select
            value={targetStatus}
            onValueChange={(v) => setTargetStatus(v as LeadStatus)}
            disabled={submitting}
          >
            <SelectTrigger
              data-ocid="voice_campaign.target_status.select"
              id="voice-target-status"
              className="w-full crm-input"
            >
              <SelectValue placeholder="Select target status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  data-ocid={`voice_campaign.target_status.option.${opt.value}`}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-secondary font-mono uppercase tracking-wider">
            AI Voice Agent Config
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="voice-agent-name"
              className="text-xs text-muted-foreground"
            >
              Agent Name
            </Label>
            <Input
              id="voice-agent-name"
              data-ocid="voice_campaign.agent_name.input"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Solar Qualifier v2"
              className="crm-input h-9"
              maxLength={80}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="voice-provider"
              className="text-xs text-muted-foreground"
            >
              Voice Provider
            </Label>
            <Input
              id="voice-provider"
              data-ocid="voice_campaign.voice_provider.input"
              value={voiceProvider}
              onChange={(e) => setVoiceProvider(e.target.value)}
              placeholder="e.g. Vapi"
              className="crm-input h-9"
              maxLength={40}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="voice-id" className="text-xs text-muted-foreground">
              Voice ID
            </Label>
            <Input
              id="voice-id"
              data-ocid="voice_campaign.voice_id.input"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="e.g. elevenlabs-aria"
              className="crm-input h-9 font-mono text-xs"
              maxLength={80}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="voice-language"
              className="text-xs text-muted-foreground"
            >
              Language
            </Label>
            <Input
              id="voice-language"
              data-ocid="voice_campaign.language.input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. en-US"
              className="crm-input h-9 font-mono text-xs"
              maxLength={20}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="voice-model"
              className="text-xs text-muted-foreground"
            >
              Model
            </Label>
            <Input
              id="voice-model"
              data-ocid="voice_campaign.model.input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-realtime"
              className="crm-input h-9 font-mono text-xs"
              maxLength={80}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="voice-settings"
              className="text-xs text-muted-foreground"
            >
              Voice Settings
            </Label>
            <Input
              id="voice-settings"
              data-ocid="voice_campaign.voice_settings.input"
              value={voiceSettings}
              onChange={(e) => setVoiceSettings(e.target.value)}
              placeholder='e.g. {"stability":0.7,"speed":1.0}'
              className="crm-input h-9 font-mono text-xs"
              maxLength={200}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="voice-api-key"
              className="text-xs text-muted-foreground"
            >
              API Key
            </Label>
            <Input
              id="voice-api-key"
              data-ocid="voice_campaign.api_key.input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="provider API key"
              className="crm-input h-9 font-mono text-xs"
              maxLength={200}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="voice-transfer-phone"
              className="text-xs text-muted-foreground"
            >
              Transfer Phone Number
            </Label>
            <Input
              id="voice-transfer-phone"
              data-ocid="voice_campaign.transfer_phone.input"
              value={transferPhoneNumber}
              onChange={(e) => setTransferPhoneNumber(e.target.value)}
              placeholder="e.g. +18005551234"
              className="crm-input h-9 font-mono text-xs"
              maxLength={24}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {error && (
        <p
          data-ocid="voice_campaign.create_form.error_state"
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
          data-ocid="voice_campaign.create_form.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit}
          data-ocid="voice_campaign.create_form.submit_button"
        >
          {submitting ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <PhoneCall size={14} />
              Create Campaign
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function VoiceCampaignRow({
  campaign,
  index,
  launching,
  canLaunch,
  onLaunch,
}: {
  campaign: VoiceCampaign;
  index: number;
  launching: boolean;
  canLaunch: boolean;
  onLaunch: () => void;
}) {
  const calls = bigToNum(campaign.callsPlaced);
  const transfers = bigToNum(campaign.qualifiedTransfers);
  const rate = calls > 0 ? Math.round((transfers / calls) * 1000) / 10 : 0;
  const isRunning = campaign.status === "running";

  return (
    <div
      data-ocid={`voice_campaign.item.${index}`}
      className="px-4 py-3 rounded-md bg-accent/40 border border-border hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Phone size={14} className="text-primary" />
          </span>
          <span className="text-sm text-foreground font-medium truncate">
            {campaign.name}
          </span>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLOR[campaign.status]}`}
          >
            {titleCase(campaign.status)}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-muted-foreground font-mono">
            {nsToAgo(campaign.createdAt)}
          </span>
          <Button
            data-ocid={`voice_campaign.launch_button.${index}`}
            size="sm"
            variant={isRunning ? "outline" : "default"}
            disabled={!canLaunch || launching || isRunning}
            onClick={onLaunch}
            className="h-7 gap-1.5 text-xs"
          >
            {launching ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Launching…
              </>
            ) : (
              <>
                <Rocket size={12} />
                {isRunning ? "Running" : "Launch"}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <Stat
          label="Target"
          value={
            SEGMENT_LABEL[campaign.targetSegment] ??
            titleCase(campaign.targetSegment)
          }
          accent="blue"
        />
        <Stat label="Calls" value={formatInt(calls)} accent="neutral" />
        <Stat label="Transfers" value={formatInt(transfers)} accent="green" />
        <Stat label="Transfer Rate" value={`${rate}%`} accent="green" />
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
        <span>
          agent:{" "}
          <span className="text-secondary">
            {campaign.voiceAgent.agentName}
          </span>
        </span>
        <span>· {campaign.voiceAgent.voiceProvider}</span>
        <span>· {campaign.voiceAgent.language}</span>
        <span className="text-primary">
          {formatMinutes(campaign.minutesSaved)} saved
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "green" | "blue" | "neutral";
}) {
  const color =
    accent === "green"
      ? "text-primary"
      : accent === "blue"
        ? "text-secondary"
        : "text-foreground";
  return (
    <div className="px-2.5 py-1.5 rounded bg-accent/60 border border-border">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-sm font-mono font-medium ${color}`}>{value}</div>
    </div>
  );
}
