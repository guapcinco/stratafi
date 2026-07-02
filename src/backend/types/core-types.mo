// Cross-cutting type definitions for the StrataFi multi-tenant CRM.
// Every entity record across the platform strictly references a TenantId
// to enforce shared-table multi-tenant isolation.

module CoreTypes {
  // ---- Cross-cutting identifiers & primitives ----

  public type TenantId = Nat;
  public type UserId = Nat;
  public type LeadId = Nat;
  public type InteractionId = Nat;
  public type CampaignId = Nat;
  public type BillingId = Nat;
  public type Timestamp = Int; // Time.Time (nanoseconds)

  // ---- Tenant onboarding ----

  public type PlanTier = {
    #starter;
    #growth;
    #scale;
    #enterprise;
  };

  public type Tenant = {
    id : TenantId;
    agencyName : Text;
    primaryContact : Text;
    planTier : PlanTier;
    voiceAgent : VoiceAgentConfig; // per-tenant voice agent configuration
    createdAt : Timestamp;
  };

  // ---- Users (agency agents, managers, admins) ----

  public type Role = {
    #agent;
    #manager;
    #admin;
  };

  public type UserStatus = {
    #offline;
    #online;
    #away;
  };

  public type User = {
    id : UserId;
    tenantId : TenantId;
    principal : Principal;
    name : Text;
    email : Text;
    role : Role;
    status : UserStatus;
    createdAt : Timestamp;
  };

  // ---- Leads ----

  public type LeadSource = {
    #inbound;
    #outbound;
    #referral;
    #webForm;
    #aiDialer;
    #smsCampaign;
    #voiceCampaign;
    #csvImport;
  };

  public type LeadStatus = {
    #newLead;
    #aiContacted;
    #apptBooked;
    #liveTransferred;
    #sold;
  };

  public type Lead = {
    id : LeadId;
    tenantId : TenantId;
    name : Text;
    phone : Text;
    email : Text;
    source : LeadSource;
    annualPremiumValue : Nat;
    status : LeadStatus;
    assignedAgentId : ?UserId;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // Bulk lead import payload. All fields optional except `name` and `phone`.
  public type BulkLeadInput = {
    name : Text;
    phone : Text;
    email : ?Text;
    source : ?LeadSource;
    annualPremiumValue : ?Nat;
    status : ?LeadStatus;
    assignedAgentId : ?UserId;
  };

  public type BulkImportResult = {
    createdIds : [Nat];
    errors : [Text];
  };

  // ---- AI Interactions (text + voice activity log) ----

  public type InteractionType = {
    #textMessage;
    #voiceCall;
    #liveTransfer;
    #appointmentBooking;
  };

  public type InteractionOutcome = {
    #sent;
    #delivered;
    #replied;
    #noAnswer;
    #qualified;
    #transferred;
    #booked;
    #failed;
  };

  // Status of an outbound AI voice call. Captured per interaction when the
  // interactionType is #voiceCall.
  public type VoiceCallStatus = {
    #initiated;
    #completed;
    #failed;
  };

  // Voice-call-specific detail attached to an AiInteraction whose
  // interactionType is #voiceCall. `callId` is the provider-issued call id.
  public type VoiceCallDetail = {
    callId : Text;
    status : VoiceCallStatus;
    duration : Nat; // seconds
  };

  public type AiInteraction = {
    id : InteractionId;
    tenantId : TenantId;
    leadId : LeadId;
    agentId : ?UserId;
    interactionType : InteractionType;
    outcome : InteractionOutcome;
    durationSeconds : Nat; // call duration; 0 for text events
    minutesSaved : Nat; // computed per automation task
    summary : Text;
    voiceCall : ?VoiceCallDetail; // present when interactionType is #voiceCall
    createdAt : Timestamp;
  };

  // ---- SMS Campaigns ----

  public type CampaignStatus = {
    #draft;
    #scheduled;
    #running;
    #paused;
    #completed;
    #archived;
  };

  public type AudienceSegment = {
    #allLeads;
    #newLeads;
    #aiContacted;
    #apptBooked;
    #liveTransferred;
    #sold;
  };

  public type SmsCampaign = {
    id : CampaignId;
    tenantId : TenantId;
    name : Text;
    status : CampaignStatus;
    audienceSegment : AudienceSegment;
    messageTemplate : Text;
    sentCount : Nat;
    responseCount : Nat;
    createdAt : Timestamp;
  };

  // ---- Voice Campaigns ----

  // Voice agent configuration persisted per tenant via updateTenant.
  // `voiceProvider` is a free-text label (e.g. "vapi" or "retell") — there is
  // no live integration with any provider in this build.
  public type VoiceAgentConfig = {
    agentName : Text;
    voiceProvider : Text;
    voiceId : Text;
    language : Text;
    apiKey : Text;
    model : Text;
    transferPhoneNumber : Text;
    voiceSettings : Text;
  };

  public type VoiceCampaign = {
    id : CampaignId;
    tenantId : TenantId;
    name : Text;
    status : CampaignStatus;
    targetSegment : AudienceSegment;
    targetStatus : LeadStatus; // leads targeted by status
    voiceAgent : VoiceAgentConfig;
    callsPlaced : Nat;
    qualifiedTransfers : Nat;
    minutesSaved : Nat;
    createdAt : Timestamp;
  };

  // ---- Outbound voice call placement ----

  // Request payload for placing an outbound AI voice call against a lead.
  public type VoiceCallRequest = {
    tenantId : TenantId;
    leadId : LeadId;
    task : Text;
    voiceId : Text;
    language : Text;
    transferPhoneNumber : Text;
  };

  // Result returned from outbound call placement.
  public type VoiceCallResult = {
    callId : Text;
    status : {
      #initiated;
      #failed;
    };
    error : ?Text;
  };

  // ---- Billing ----

  public type InvoiceRecord = {
    invoiceId : Nat;
    amount : Nat;
    issuedAt : Timestamp;
    paid : Bool;
  };

  public type Billing = {
    id : BillingId;
    tenantId : TenantId;
    planTier : PlanTier;
    includedMinutes : Nat;
    usedMinutes : Nat;
    invoiceHistory : [InvoiceRecord];
    updatedAt : Timestamp;
  };

  // ---- Dashboard aggregates ----

  public type DashboardSummary = {
    activeAgentsOnline : Nat;
    totalAgents : Nat;
    activeAgentsPercentage : Float;
    totalLeads : Nat;
    timeSavedByAiMinutes : Nat;
  };

  public type ColumnChartMetric = {
    smsSent : Nat;
    callsAi : Nat;
    apptsBooked : Nat;
    liveTransfers : Nat;
    leadsSold : Nat;
  };

  public type LiveEventSource = {
    #aiVoiceRouter;
    #aiTextSetter;
    #aiDialer;
    #smsCampaign;
    #voiceCampaign;
    #sys;
  };

  public type LiveEvent = {
    id : Nat;
    tenantId : TenantId;
    source : LiveEventSource;
    message : Text;
    createdAt : Timestamp;
  };
};
