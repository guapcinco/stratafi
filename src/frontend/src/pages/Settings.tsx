import {
  PlanTier,
  Role,
  UserStatus,
  Variant_initiated_failed,
} from "@/backend";
import type { User, VoiceAgentConfig } from "@/backend";
import { EmptyState, SectionCard, StatusDot } from "@/components/Primitives";
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
import { Switch } from "@/components/ui/switch";
import { useStrataFi, useStrataFiActor } from "@/hooks/useStrataFi";
import { getInitials, nsToDate, titleCase } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import {
  Bot,
  Building2,
  Eye,
  EyeOff,
  PhoneCall,
  Plus,
  Save,
  Sliders,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ROLE_OPTIONS: Role[] = [Role.agent, Role.manager, Role.admin];
const STATUS_OPTIONS: UserStatus[] = [
  UserStatus.online,
  UserStatus.offline,
  UserStatus.away,
];

interface AiConfigForm {
  voiceAgentName: string;
  textSetterName: string;
  voiceRouting: boolean;
  textBooking: boolean;
  voiceProvider: string;
  voiceId: string;
  language: string;
  apiKey: string;
  model: string;
  transferPhoneNumber: string;
  voiceSettings: string;
}

const DEFAULT_AI_CONFIG: AiConfigForm = {
  voiceAgentName: "StrataFi Voice Agent",
  textSetterName: "StrataFi Text Setter",
  voiceRouting: true,
  textBooking: true,
  voiceProvider: "Vapi",
  voiceId: "elevenlabs-aria",
  language: "en-US",
  apiKey: "",
  model: "gpt-4o-mini",
  transferPhoneNumber: "",
  voiceSettings: '{"stability":0.5,"similarity_boost":0.75}',
};

export function Settings() {
  const {
    activeTenant,
    tenants,
    switchTenant,
    users,
    loading,
    bootstrapping,
    refreshAll,
    placeVoiceCall,
  } = useStrataFi();
  const { actor } = useStrataFiActor();
  const [agencyName, setAgencyName] = useState(activeTenant?.agencyName ?? "");
  const [primaryContact, setPrimaryContact] = useState(
    activeTenant?.primaryContact ?? "",
  );
  const [planTier, setPlanTier] = useState<PlanTier>(
    activeTenant?.planTier ?? PlanTier.growth,
  );
  const [saving, setSaving] = useState(false);

  // AI Agent Configuration form state.
  const [aiConfig, setAiConfig] = useState<AiConfigForm>(DEFAULT_AI_CONFIG);
  const [savingAi, setSavingAi] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);

  // Add Team Member dialog state.
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>(Role.agent);
  const [adding, setAdding] = useState(false);

  // Re-sync local form when active tenant changes.
  if (activeTenant && (agencyName === "" || primaryContact === "") && !saving) {
    if (agencyName === "" && activeTenant.agencyName)
      setAgencyName(activeTenant.agencyName);
    if (primaryContact === "" && activeTenant.primaryContact)
      setPrimaryContact(activeTenant.primaryContact);
  }

  // Load the active tenant's voiceAgent config into the AI form whenever the
  // active tenant changes (mount or tenant switch). Falls back to defaults
  // only when the tenant has no saved config.
  useEffect(() => {
    if (!activeTenant) return;
    const va = activeTenant.voiceAgent;
    setAiConfig((prev) => ({
      ...prev,
      voiceAgentName: va.agentName || prev.voiceAgentName,
      voiceProvider: va.voiceProvider || prev.voiceProvider,
      voiceId: va.voiceId || prev.voiceId,
      language: va.language || prev.language,
      apiKey: va.apiKey || "",
      model: va.model || prev.model,
      transferPhoneNumber: va.transferPhoneNumber || "",
      voiceSettings: va.voiceSettings || prev.voiceSettings,
    }));
  }, [activeTenant]);

  async function handleSave() {
    if (!activeTenant || !actor) return;
    if (!agencyName.trim() || !primaryContact.trim()) {
      toast.error("Agency name and primary contact are required.");
      return;
    }
    setSaving(true);
    try {
      const voiceAgent: VoiceAgentConfig = {
        agentName: aiConfig.voiceAgentName.trim(),
        voiceProvider: aiConfig.voiceProvider.trim(),
        voiceId: aiConfig.voiceId.trim(),
        language: aiConfig.language.trim(),
        apiKey: aiConfig.apiKey.trim(),
        model: aiConfig.model.trim(),
        transferPhoneNumber: aiConfig.transferPhoneNumber.trim(),
        voiceSettings: aiConfig.voiceSettings.trim(),
      };
      const updated = await actor.updateTenant(
        activeTenant.id,
        agencyName.trim(),
        primaryContact.trim(),
        planTier,
        voiceAgent,
      );
      if (updated) {
        toast.success("Tenant settings saved.");
        await refreshAll(activeTenant.id);
      } else {
        toast.error("Failed to save settings.");
      }
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(user: User, role: Role) {
    if (!actor || !activeTenant) return;
    try {
      const updated = await actor.updateUser(
        user.id,
        user.name,
        user.email,
        role,
        user.status,
      );
      if (updated) {
        toast.success(`${user.name} role updated to ${titleCase(role)}.`);
        await refreshAll(activeTenant.id);
      } else {
        toast.error("Failed to update role.");
      }
    } catch {
      toast.error("Failed to update role.");
    }
  }

  async function handleStatusChange(user: User, status: UserStatus) {
    if (!actor || !activeTenant) return;
    try {
      const updated = await actor.updateUser(
        user.id,
        user.name,
        user.email,
        user.role,
        status,
      );
      if (updated) {
        toast.success(`${user.name} status set to ${titleCase(status)}.`);
        await refreshAll(activeTenant.id);
      } else {
        toast.error("Failed to update status.");
      }
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function handleAddMember() {
    if (!actor || !activeTenant) return;
    if (!newName.trim() || !newEmail.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setAdding(true);
    try {
      // Anonymous principal — backend assigns real identity on first login.
      await actor.createUser(
        activeTenant.id,
        Principal.anonymous(),
        newName.trim(),
        newEmail.trim(),
        newRole,
      );
      toast.success(`${newName.trim()} added to ${activeTenant.agencyName}.`);
      setNewName("");
      setNewEmail("");
      setNewRole(Role.agent);
      setAddOpen(false);
      await refreshAll(activeTenant.id);
    } catch {
      toast.error("Failed to add team member.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveAiConfig() {
    if (!activeTenant || !actor) return;
    if (!aiConfig.voiceAgentName.trim() || !aiConfig.textSetterName.trim()) {
      toast.error("AI agent names are required.");
      return;
    }
    if (!agencyName.trim() || !primaryContact.trim()) {
      toast.error("Agency name and primary contact are required.");
      return;
    }
    setSavingAi(true);
    try {
      const voiceAgent: VoiceAgentConfig = {
        agentName: aiConfig.voiceAgentName.trim(),
        voiceProvider: aiConfig.voiceProvider.trim(),
        voiceId: aiConfig.voiceId.trim(),
        language: aiConfig.language.trim(),
        apiKey: aiConfig.apiKey.trim(),
        model: aiConfig.model.trim(),
        transferPhoneNumber: aiConfig.transferPhoneNumber.trim(),
        voiceSettings: aiConfig.voiceSettings.trim(),
      };
      const updated = await actor.updateTenant(
        activeTenant.id,
        agencyName.trim(),
        primaryContact.trim(),
        planTier,
        voiceAgent,
      );
      if (updated) {
        toast.success("AI agent configuration saved.");
        await refreshAll(activeTenant.id);
      } else {
        toast.error("Failed to save AI configuration.");
      }
    } catch {
      toast.error("Failed to save AI configuration.");
    } finally {
      setSavingAi(false);
    }
  }

  async function handleTestConnection() {
    if (!activeTenant) {
      toast.error("No active tenant to test against.");
      return;
    }
    if (!aiConfig.apiKey.trim()) {
      toast.error("Provider API key is required to test the connection.");
      return;
    }
    setTesting(true);
    try {
      // Use a sentinel leadId of 0n for a connection probe — the backend
      // validates the API key + provider config before dialing.
      const result = await placeVoiceCall({
        tenantId: activeTenant.id,
        leadId: 0n,
        task: "This is a test call",
        voiceId: aiConfig.voiceId.trim(),
        language: aiConfig.language.trim(),
        transferPhoneNumber: aiConfig.transferPhoneNumber.trim(),
      });
      if (!result) {
        toast.error("Test connection failed.", {
          description: "No response from the voice provider.",
        });
        return;
      }
      if (result.status === Variant_initiated_failed.initiated) {
        toast.success("Test connection successful.", {
          description: `Voice provider accepted the call (callId: ${result.callId}).`,
        });
      } else {
        toast.error("Test connection failed.", {
          description: result.error ?? "Voice provider rejected the call.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error.";
      toast.error("Test connection failed.", { description: msg });
    } finally {
      setTesting(false);
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

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Settings
        </h2>
        <p className="text-muted-foreground text-sm">
          Tenant configuration & agency profile
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agency profile */}
        <SectionCard title="Agency Profile" className="lg:col-span-2">
          {!activeTenant ? (
            <p className="text-sm text-muted-foreground">
              No active tenant. Onboard an agency from the top-bar switcher.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <span className="w-12 h-12 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center text-base font-bold text-primary font-mono">
                  {getInitials(activeTenant.agencyName) || "—"}
                </span>
                <div>
                  <div className="text-foreground font-medium">
                    {activeTenant.agencyName}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    id: {activeTenant.id.toString()} · created{" "}
                    {nsToDate(activeTenant.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="agency-name"
                    className="text-foreground text-xs font-medium"
                  >
                    Agency Name
                  </Label>
                  <Input
                    id="agency-name"
                    data-ocid="settings.agency_name.input"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="primary-contact"
                    className="text-foreground text-xs font-medium"
                  >
                    Primary Contact
                  </Label>
                  <Input
                    id="primary-contact"
                    data-ocid="settings.primary_contact.input"
                    value={primaryContact}
                    onChange={(e) => setPrimaryContact(e.target.value)}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">
                    Plan Tier
                  </Label>
                  <Select
                    value={planTier}
                    onValueChange={(v) => setPlanTier(v as PlanTier)}
                  >
                    <SelectTrigger
                      data-ocid="settings.plan_tier.select"
                      className="w-full bg-input border-border text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {(Object.values(PlanTier) as PlanTier[]).map((p) => (
                        <SelectItem
                          key={p}
                          value={p}
                          data-ocid={`settings.plan_tier.${p}.item`}
                        >
                          {titleCase(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  data-ocid="settings.save_button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green"
                >
                  <Save size={14} />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Tenant switch list */}
        <SectionCard
          title="Switch Tenant"
          action={<Sliders size={14} className="text-muted-foreground" />}
        >
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants loaded.</p>
          ) : (
            <div className="space-y-2">
              {tenants.map((t, i) => {
                const isActive = activeTenant?.id === t.id;
                return (
                  <button
                    key={t.id.toString()}
                    type="button"
                    data-ocid={`settings.tenant.item.${i + 1}`}
                    onClick={() => void switchTenant(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left transition-colors ${
                      isActive
                        ? "bg-primary/10 border-primary/40"
                        : "bg-accent/40 border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="w-7 h-7 rounded bg-accent text-foreground flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
                      {getInitials(t.agencyName) || "?"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-foreground truncate">
                        {t.agencyName}
                      </span>
                      <span className="block text-[10px] text-muted-foreground font-mono truncate">
                        {titleCase(t.planTier)} · {t.primaryContact}
                      </span>
                    </span>
                    {isActive && (
                      <Building2
                        size={12}
                        className="text-primary flex-shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Team Members Management */}
      <SectionCard
        title="Team Members"
        action={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                data-ocid="settings.add_member.open_modal_button"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus size={13} />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent
              data-ocid="settings.add_member.dialog"
              className="bg-card border-border text-foreground"
            >
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">
                  Add Team Member
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-name"
                    className="text-foreground text-xs font-medium"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="new-name"
                    data-ocid="settings.add_member.name.input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Jordan Rivera"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-email"
                    className="text-foreground text-xs font-medium"
                  >
                    Email
                  </Label>
                  <Input
                    id="new-email"
                    data-ocid="settings.add_member.email.input"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jordan@agency.com"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">
                    Role
                  </Label>
                  <Select
                    value={newRole}
                    onValueChange={(v) => setNewRole(v as Role)}
                  >
                    <SelectTrigger
                      data-ocid="settings.add_member.role.select"
                      className="w-full bg-input border-border text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem
                          key={r}
                          value={r}
                          data-ocid={`settings.add_member.role.${r}.item`}
                        >
                          {titleCase(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  data-ocid="settings.add_member.cancel_button"
                  onClick={() => setAddOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  data-ocid="settings.add_member.confirm_button"
                  onClick={handleAddMember}
                  disabled={adding}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {adding ? "Adding…" : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {users.length === 0 ? (
          <EmptyState
            message="No team members yet."
            hint="add a member to get started"
          />
        ) : (
          <div className="space-y-2">
            {users.map((u, i) => (
              <div
                key={u.id.toString()}
                data-ocid={`settings.team_member.item.${i + 1}`}
                className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-3 py-3 rounded-md bg-accent/40 border border-border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-9 h-9 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary font-mono flex-shrink-0">
                    {getInitials(u.name) || "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground truncate">
                        {u.name}
                      </span>
                      <StatusDot status={u.status} />
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                      {u.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={u.role}
                    onValueChange={(v) => void handleRoleChange(u, v as Role)}
                  >
                    <SelectTrigger
                      data-ocid={`settings.team_member.${i + 1}.role.select`}
                      className="h-8 w-32 text-xs bg-input border-border text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem
                          key={r}
                          value={r}
                          data-ocid={`settings.team_member.${i + 1}.role.${r}.item`}
                        >
                          {titleCase(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={u.status}
                    onValueChange={(v) =>
                      void handleStatusChange(u, v as UserStatus)
                    }
                  >
                    <SelectTrigger
                      data-ocid={`settings.team_member.${i + 1}.status.select`}
                      className="h-8 w-32 text-xs bg-input border-border text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          data-ocid={`settings.team_member.${i + 1}.status.${s}.item`}
                        >
                          {titleCase(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* AI Agent Configuration */}
      <SectionCard
        title="AI Agent Configuration"
        action={<Bot size={14} className="text-secondary" />}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="ai-voice-agent-name"
                className="text-foreground text-xs font-medium"
              >
                AI Voice Agent Name
              </Label>
              <Input
                id="ai-voice-agent-name"
                data-ocid="settings.ai_voice_agent_name.input"
                value={aiConfig.voiceAgentName}
                onChange={(e) =>
                  setAiConfig((c) => ({ ...c, voiceAgentName: e.target.value }))
                }
                className="bg-input border-border text-foreground"
              />
              <p className="text-[10px] text-muted-foreground font-mono">
                inbound + outbound voice routing persona
              </p>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="ai-text-setter-name"
                className="text-foreground text-xs font-medium"
              >
                AI Text Setter Name
              </Label>
              <Input
                id="ai-text-setter-name"
                data-ocid="settings.ai_text_setter_name.input"
                value={aiConfig.textSetterName}
                onChange={(e) =>
                  setAiConfig((c) => ({ ...c, textSetterName: e.target.value }))
                }
                className="bg-input border-border text-foreground"
              />
              <p className="text-[10px] text-muted-foreground font-mono">
                SMS appointment booking persona
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="ai-voice-provider"
                  className="text-foreground text-xs font-medium"
                >
                  Voice Provider
                </Label>
                <Input
                  id="ai-voice-provider"
                  data-ocid="settings.ai_voice_provider.input"
                  value={aiConfig.voiceProvider}
                  onChange={(e) =>
                    setAiConfig((c) => ({
                      ...c,
                      voiceProvider: e.target.value,
                    }))
                  }
                  placeholder="e.g. Vapi"
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ai-voice-id"
                  className="text-foreground text-xs font-medium"
                >
                  Voice ID
                </Label>
                <Input
                  id="ai-voice-id"
                  data-ocid="settings.ai_voice_id.input"
                  value={aiConfig.voiceId}
                  onChange={(e) =>
                    setAiConfig((c) => ({ ...c, voiceId: e.target.value }))
                  }
                  placeholder="e.g. elevenlabs-aria"
                  className="bg-input border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ai-language"
                  className="text-foreground text-xs font-medium"
                >
                  Language
                </Label>
                <Input
                  id="ai-language"
                  data-ocid="settings.ai_language.input"
                  value={aiConfig.language}
                  onChange={(e) =>
                    setAiConfig((c) => ({ ...c, language: e.target.value }))
                  }
                  placeholder="e.g. en-US"
                  className="bg-input border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ai-model"
                  className="text-foreground text-xs font-medium"
                >
                  LLM Model
                </Label>
                <Input
                  id="ai-model"
                  data-ocid="settings.ai_model.input"
                  value={aiConfig.model}
                  onChange={(e) =>
                    setAiConfig((c) => ({ ...c, model: e.target.value }))
                  }
                  placeholder="e.g. gpt-4o-mini"
                  className="bg-input border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ai-api-key"
                  className="text-foreground text-xs font-medium"
                >
                  Provider API Key
                </Label>
                <div className="relative">
                  <Input
                    id="ai-api-key"
                    data-ocid="settings.ai_api_key.input"
                    type={showApiKey ? "text" : "password"}
                    value={aiConfig.apiKey}
                    onChange={(e) =>
                      setAiConfig((c) => ({ ...c, apiKey: e.target.value }))
                    }
                    placeholder="sk-…"
                    className="bg-input border-border text-foreground font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    data-ocid="settings.ai_api_key.toggle_visibility"
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  masked by default — click the eye to reveal
                </p>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ai-transfer-phone"
                  className="text-foreground text-xs font-medium"
                >
                  Transfer Phone Number
                </Label>
                <Input
                  id="ai-transfer-phone"
                  data-ocid="settings.ai_transfer_phone.input"
                  value={aiConfig.transferPhoneNumber}
                  onChange={(e) =>
                    setAiConfig((c) => ({
                      ...c,
                      transferPhoneNumber: e.target.value,
                    }))
                  }
                  placeholder="+1 555 0100"
                  className="bg-input border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label
                  htmlFor="ai-voice-settings"
                  className="text-foreground text-xs font-medium"
                >
                  Voice Settings (JSON)
                </Label>
                <Input
                  id="ai-voice-settings"
                  data-ocid="settings.ai_voice_settings.input"
                  value={aiConfig.voiceSettings}
                  onChange={(e) =>
                    setAiConfig((c) => ({
                      ...c,
                      voiceSettings: e.target.value,
                    }))
                  }
                  placeholder='{"stability":0.5,"similarity_boost":0.75}'
                  className="bg-input border-border text-foreground font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground font-mono">
                  provider-specific voice tuning payload
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0">
                <div className="text-sm text-foreground font-medium">
                  Voice Routing
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  route inbound calls to AI voice agent
                </div>
              </div>
              <Switch
                data-ocid="settings.voice_routing.toggle"
                checked={aiConfig.voiceRouting}
                onCheckedChange={(v) =>
                  setAiConfig((c) => ({ ...c, voiceRouting: v }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0">
                <div className="text-sm text-foreground font-medium">
                  Text Booking
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  AI text setter auto-books appointments
                </div>
              </div>
              <Switch
                data-ocid="settings.text_booking.toggle"
                checked={aiConfig.textBooking}
                onCheckedChange={(v) =>
                  setAiConfig((c) => ({ ...c, textBooking: v }))
                }
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              data-ocid="settings.ai_config.save_button"
              onClick={handleSaveAiConfig}
              disabled={savingAi}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-blue"
            >
              <Save size={14} />
              {savingAi ? "Saving…" : "Save AI Configuration"}
            </Button>
            <Button
              type="button"
              data-ocid="settings.ai_config.test_connection_button"
              onClick={handleTestConnection}
              disabled={testing || !activeTenant}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              {testing ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              {testing ? "Testing…" : "Test Connection"}
            </Button>
            <span className="text-[10px] text-muted-foreground font-mono">
              places a probe call to validate the API key
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
