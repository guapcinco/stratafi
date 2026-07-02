// Public API surface for the StrataFi core-types domain.
// The mixin receives the shared stable State record and delegates every
// operation to the stateless lib/core-types module.

import Principal "mo:core/Principal";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import CoreTypes "../types/core-types";
import CoreLib "../lib/core-types";

mixin (state : CoreLib.State, transform : OutCall.Transform) {
  // ---- Tenant CRUD ----

  public shared ({ caller }) func createTenant(agencyName : Text, primaryContact : Text, planTier : CoreTypes.PlanTier) : async CoreTypes.Tenant {
    ignore caller;
    CoreLib.createTenant(state, agencyName, primaryContact, planTier);
  };

  public query ({ caller }) func getTenant(id : CoreTypes.TenantId) : async ?CoreTypes.Tenant {
    ignore caller;
    CoreLib.getTenant(state, id);
  };

  // updateTenant now also persists the tenant's VoiceAgentConfig (apiKey,
  // model, transferPhoneNumber, voiceSettings, plus the original fields).
  public shared ({ caller }) func updateTenant(id : CoreTypes.TenantId, agencyName : Text, primaryContact : Text, planTier : CoreTypes.PlanTier, voiceAgent : CoreTypes.VoiceAgentConfig) : async ?CoreTypes.Tenant {
    ignore caller;
    CoreLib.updateTenant(state, id, agencyName, primaryContact, planTier, voiceAgent);
  };

  public shared ({ caller }) func deleteTenant(id : CoreTypes.TenantId) : async Bool {
    ignore caller;
    CoreLib.deleteTenant(state, id);
  };

  public query ({ caller }) func listTenants() : async [CoreTypes.Tenant] {
    ignore caller;
    CoreLib.listTenants(state);
  };

  // ---- User CRUD ----

  public shared ({ caller }) func createUser(tenantId : CoreTypes.TenantId, principal : Principal, name : Text, email : Text, role : CoreTypes.Role) : async CoreTypes.User {
    ignore caller;
    CoreLib.createUser(state, tenantId, principal, name, email, role);
  };

  public query ({ caller }) func getUser(id : CoreTypes.UserId) : async ?CoreTypes.User {
    ignore caller;
    CoreLib.getUser(state, id);
  };

  public shared ({ caller }) func updateUser(id : CoreTypes.UserId, name : Text, email : Text, role : CoreTypes.Role, status : CoreTypes.UserStatus) : async ?CoreTypes.User {
    ignore caller;
    CoreLib.updateUser(state, id, name, email, role, status);
  };

  public shared ({ caller }) func deleteUser(id : CoreTypes.UserId) : async Bool {
    ignore caller;
    CoreLib.deleteUser(state, id);
  };

  public query ({ caller }) func listUsersByTenant(tenantId : CoreTypes.TenantId) : async [CoreTypes.User] {
    ignore caller;
    CoreLib.listUsersByTenant(state, tenantId);
  };

  // ---- Lead CRUD ----

  public shared ({ caller }) func createLead(tenantId : CoreTypes.TenantId, name : Text, phone : Text, email : Text, source : CoreTypes.LeadSource, annualPremiumValue : Nat, assignedAgentId : ?CoreTypes.UserId) : async CoreTypes.Lead {
    ignore caller;
    CoreLib.createLead(state, tenantId, name, phone, email, source, annualPremiumValue, assignedAgentId);
  };

  public query ({ caller }) func getLead(id : CoreTypes.LeadId) : async ?CoreTypes.Lead {
    ignore caller;
    CoreLib.getLead(state, id);
  };

  public shared ({ caller }) func updateLead(id : CoreTypes.LeadId, name : Text, phone : Text, email : Text, source : CoreTypes.LeadSource, annualPremiumValue : Nat, status : CoreTypes.LeadStatus, assignedAgentId : ?CoreTypes.UserId) : async ?CoreTypes.Lead {
    ignore caller;
    CoreLib.updateLead(state, id, name, phone, email, source, annualPremiumValue, status, assignedAgentId);
  };

  public shared ({ caller }) func deleteLead(id : CoreTypes.LeadId) : async Bool {
    ignore caller;
    CoreLib.deleteLead(state, id);
  };

  public query ({ caller }) func listLeadsByTenant(tenantId : CoreTypes.TenantId) : async [CoreTypes.Lead] {
    ignore caller;
    CoreLib.listLeadsByTenant(state, tenantId);
  };

  public query ({ caller }) func listLeadsByStatus(tenantId : CoreTypes.TenantId, status : CoreTypes.LeadStatus) : async [CoreTypes.Lead] {
    ignore caller;
    CoreLib.listLeadsByStatus(state, tenantId, status);
  };

  // ---- Bulk lead import ----

  public shared ({ caller }) func bulkImportLeads(tenantId : CoreTypes.TenantId, inputs : [CoreTypes.BulkLeadInput]) : async CoreTypes.BulkImportResult {
    ignore (caller, tenantId, inputs);
    CoreLib.bulkImportLeads(state, tenantId, inputs);
  };

  // ---- AI Interaction CRUD ----

  public shared ({ caller }) func createAiInteraction(tenantId : CoreTypes.TenantId, leadId : CoreTypes.LeadId, agentId : ?CoreTypes.UserId, interactionType : CoreTypes.InteractionType, outcome : CoreTypes.InteractionOutcome, durationSeconds : Nat, summary : Text) : async CoreTypes.AiInteraction {
    ignore caller;
    CoreLib.createAiInteraction(state, tenantId, leadId, agentId, interactionType, outcome, durationSeconds, summary);
  };

  public query ({ caller }) func getAiInteraction(id : CoreTypes.InteractionId) : async ?CoreTypes.AiInteraction {
    ignore caller;
    CoreLib.getAiInteraction(state, id);
  };

  public shared ({ caller }) func updateAiInteraction(id : CoreTypes.InteractionId, outcome : CoreTypes.InteractionOutcome, durationSeconds : Nat, summary : Text) : async ?CoreTypes.AiInteraction {
    ignore caller;
    CoreLib.updateAiInteraction(state, id, outcome, durationSeconds, summary);
  };

  public shared ({ caller }) func deleteAiInteraction(id : CoreTypes.InteractionId) : async Bool {
    ignore caller;
    CoreLib.deleteAiInteraction(state, id);
  };

  public query ({ caller }) func listAiInteractionsByTenant(tenantId : CoreTypes.TenantId) : async [CoreTypes.AiInteraction] {
    ignore caller;
    CoreLib.listAiInteractionsByTenant(state, tenantId);
  };

  public query ({ caller }) func listAiInteractionsByLead(leadId : CoreTypes.LeadId) : async [CoreTypes.AiInteraction] {
    ignore caller;
    CoreLib.listAiInteractionsByLead(state, leadId);
  };

  // ---- SMS Campaign CRUD ----

  public shared ({ caller }) func createSmsCampaign(tenantId : CoreTypes.TenantId, name : Text, audienceSegment : CoreTypes.AudienceSegment, messageTemplate : Text) : async CoreTypes.SmsCampaign {
    ignore caller;
    CoreLib.createSmsCampaign(state, tenantId, name, audienceSegment, messageTemplate);
  };

  public query ({ caller }) func getSmsCampaign(id : CoreTypes.CampaignId) : async ?CoreTypes.SmsCampaign {
    ignore caller;
    CoreLib.getSmsCampaign(state, id);
  };

  public shared ({ caller }) func updateSmsCampaign(id : CoreTypes.CampaignId, name : Text, status : CoreTypes.CampaignStatus, audienceSegment : CoreTypes.AudienceSegment, messageTemplate : Text) : async ?CoreTypes.SmsCampaign {
    ignore caller;
    CoreLib.updateSmsCampaign(state, id, name, status, audienceSegment, messageTemplate);
  };

  public shared ({ caller }) func deleteSmsCampaign(id : CoreTypes.CampaignId) : async Bool {
    ignore caller;
    CoreLib.deleteSmsCampaign(state, id);
  };

  public query ({ caller }) func listSmsCampaignsByTenant(tenantId : CoreTypes.TenantId) : async [CoreTypes.SmsCampaign] {
    ignore caller;
    CoreLib.listSmsCampaignsByTenant(state, tenantId);
  };

  // ---- Voice Campaign CRUD ----

  public shared ({ caller }) func createVoiceCampaign(tenantId : CoreTypes.TenantId, name : Text, targetSegment : CoreTypes.AudienceSegment, targetStatus : CoreTypes.LeadStatus, voiceAgent : CoreTypes.VoiceAgentConfig) : async CoreTypes.VoiceCampaign {
    ignore caller;
    CoreLib.createVoiceCampaign(state, tenantId, name, targetSegment, targetStatus, voiceAgent);
  };

  public query ({ caller }) func getVoiceCampaign(id : CoreTypes.CampaignId) : async ?CoreTypes.VoiceCampaign {
    ignore caller;
    CoreLib.getVoiceCampaign(state, id);
  };

  public shared ({ caller }) func updateVoiceCampaign(id : CoreTypes.CampaignId, name : Text, status : CoreTypes.CampaignStatus, targetSegment : CoreTypes.AudienceSegment, targetStatus : CoreTypes.LeadStatus, voiceAgent : CoreTypes.VoiceAgentConfig) : async ?CoreTypes.VoiceCampaign {
    ignore caller;
    CoreLib.updateVoiceCampaign(state, id, name, status, targetSegment, targetStatus, voiceAgent);
  };

  public shared ({ caller }) func deleteVoiceCampaign(id : CoreTypes.CampaignId) : async Bool {
    ignore caller;
    CoreLib.deleteVoiceCampaign(state, id);
  };

  public query ({ caller }) func listVoiceCampaignsByTenant(tenantId : CoreTypes.TenantId) : async [CoreTypes.VoiceCampaign] {
    ignore caller;
    CoreLib.listVoiceCampaignsByTenant(state, tenantId);
  };

  // ---- Outbound voice call placement ----

  public shared ({ caller }) func placeVoiceCall(request : CoreTypes.VoiceCallRequest) : async CoreTypes.VoiceCallResult {
    ignore caller;
    await CoreLib.placeVoiceCall(state, request, transform);
  };

  // Launch a voice campaign: place an outbound AI voice call to every lead
  // matching the campaign's targetStatus. Returns the per-lead results.
  public shared ({ caller }) func launchVoiceCampaign(tenantId : CoreTypes.TenantId, campaignId : CoreTypes.CampaignId) : async [CoreTypes.VoiceCallResult] {
    ignore caller;
    await CoreLib.launchVoiceCampaign(state, tenantId, campaignId, transform);
  };

  // ---- Billing ----

  public query ({ caller }) func getBilling(tenantId : CoreTypes.TenantId) : async ?CoreTypes.Billing {
    ignore caller;
    CoreLib.getBilling(state, tenantId);
  };

  public shared ({ caller }) func updateBillingPlan(tenantId : CoreTypes.TenantId, planTier : CoreTypes.PlanTier, includedMinutes : Nat) : async ?CoreTypes.Billing {
    ignore caller;
    CoreLib.updateBillingPlan(state, tenantId, planTier, includedMinutes);
  };

  public shared ({ caller }) func recordBillingUsage(tenantId : CoreTypes.TenantId, usedMinutesDelta : Nat) : async ?CoreTypes.Billing {
    ignore caller;
    CoreLib.recordBillingUsage(state, tenantId, usedMinutesDelta);
  };

  public shared ({ caller }) func addInvoice(tenantId : CoreTypes.TenantId, amount : Nat) : async ?CoreTypes.Billing {
    ignore caller;
    CoreLib.addInvoice(state, tenantId, amount);
  };

  // ---- Dashboard aggregate queries ----

  public query ({ caller }) func getDashboardSummary(tenantId : CoreTypes.TenantId) : async CoreTypes.DashboardSummary {
    ignore caller;
    CoreLib.getDashboardSummary(state, tenantId);
  };

  public query ({ caller }) func getColumnChartMetrics(tenantId : CoreTypes.TenantId) : async CoreTypes.ColumnChartMetric {
    ignore caller;
    CoreLib.getColumnChartMetrics(state, tenantId);
  };

  public query ({ caller }) func getLiveEventStream(tenantId : CoreTypes.TenantId, limit : Nat) : async [CoreTypes.LiveEvent] {
    ignore caller;
    CoreLib.getLiveEventStream(state, tenantId, limit);
  };

  // ---- Mock data seeding ----

  public shared ({ caller }) func seedMockData() : async () {
    ignore caller;
    CoreLib.seedMockData(state);
  };
};
