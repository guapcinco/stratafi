// StrataFi migration from the previous multi-tenant StrataFi actor to the
// new extended StrataFi actor.
//
// The previous actor (in .old/src/backend/main.mo) exposed these stable
// fields: accessControlState (inherited unchanged from the
// caffeineai-authorization package) and state (a CoreLib.State record).
//
// This build extends the schema:
//   - LeadSource gains #csvImport (additive variant tag — coerces).
//   - AiInteraction gains voiceCall : ?VoiceCallDetail (optional — coerces
//     with null).
//   - VoiceAgentConfig gains four required Text fields (apiKey, model,
//     transferPhoneNumber, voiceSettings) — NOT stable-compatible for
//     existing records.
//   - VoiceCampaign gains targetStatus : LeadStatus (required) — NOT
//     stable-compatible for existing records.
//
// The migration consumes the previous `state` and rebuilds it, mapping each
// stored VoiceCampaign to add targetStatus = #newLead and extending each
// voiceAgent with empty-string defaults for the four new fields. All other
// collections (tenants, users, leads, aiInteractions, smsCampaigns, billing,
// liveEvents, counters) are carried over unchanged. accessControlState is
// neither consumed nor produced, so it is inherited from the previous canister.
//
// The old types are defined inline (copied from .old/src/backend/types/core-types.mo
// and .old/src/backend/lib/core-types.mo) because the sandboxed compilation
// environment cannot resolve .old/ paths.

import Map "mo:core/Map";
import List "mo:core/List";
import CoreLib "lib/core-types";
import CoreTypes "types/core-types";

module {
  // ---- Legacy types (copied verbatim from .old/src/backend/types/core-types.mo) ----

  type TenantId = Nat;
  type UserId = Nat;
  type LeadId = Nat;
  type InteractionId = Nat;
  type CampaignId = Nat;
  type BillingId = Nat;
  type Timestamp = Int;

  type PlanTier = {
    #starter;
    #growth;
    #scale;
    #enterprise;
  };

  type Tenant = {
    id : TenantId;
    agencyName : Text;
    primaryContact : Text;
    planTier : PlanTier;
    createdAt : Timestamp;
  };

  type Role = {
    #agent;
    #manager;
    #admin;
  };

  type UserStatus = {
    #offline;
    #online;
    #away;
  };

  type User = {
    id : UserId;
    tenantId : TenantId;
    principal : Principal;
    name : Text;
    email : Text;
    role : Role;
    status : UserStatus;
    createdAt : Timestamp;
  };

  type LeadSource = {
    #inbound;
    #outbound;
    #referral;
    #webForm;
    #aiDialer;
    #smsCampaign;
    #voiceCampaign;
  };

  type LeadStatus = {
    #newLead;
    #aiContacted;
    #apptBooked;
    #liveTransferred;
    #sold;
  };

  type Lead = {
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

  type InteractionType = {
    #textMessage;
    #voiceCall;
    #liveTransfer;
    #appointmentBooking;
  };

  type InteractionOutcome = {
    #sent;
    #delivered;
    #replied;
    #noAnswer;
    #qualified;
    #transferred;
    #booked;
    #failed;
  };

  type AiInteraction = {
    id : InteractionId;
    tenantId : TenantId;
    leadId : LeadId;
    agentId : ?UserId;
    interactionType : InteractionType;
    outcome : InteractionOutcome;
    durationSeconds : Nat;
    minutesSaved : Nat;
    summary : Text;
    createdAt : Timestamp;
  };

  type CampaignStatus = {
    #draft;
    #scheduled;
    #running;
    #paused;
    #completed;
    #archived;
  };

  type AudienceSegment = {
    #allLeads;
    #newLeads;
    #aiContacted;
    #apptBooked;
    #liveTransferred;
    #sold;
  };

  type SmsCampaign = {
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

  // Old VoiceAgentConfig — missing apiKey, model, transferPhoneNumber,
  // voiceSettings.
  type OldVoiceAgentConfig = {
    agentName : Text;
    voiceProvider : Text;
    voiceId : Text;
    language : Text;
  };

  // Old VoiceCampaign — missing targetStatus.
  type OldVoiceCampaign = {
    id : CampaignId;
    tenantId : TenantId;
    name : Text;
    status : CampaignStatus;
    targetSegment : AudienceSegment;
    voiceAgent : OldVoiceAgentConfig;
    callsPlaced : Nat;
    qualifiedTransfers : Nat;
    minutesSaved : Nat;
    createdAt : Timestamp;
  };

  type InvoiceRecord = {
    invoiceId : Nat;
    amount : Nat;
    issuedAt : Timestamp;
    paid : Bool;
  };

  type Billing = {
    id : BillingId;
    tenantId : TenantId;
    planTier : PlanTier;
    includedMinutes : Nat;
    usedMinutes : Nat;
    invoiceHistory : [InvoiceRecord];
    updatedAt : Timestamp;
  };

  type LiveEventSource = {
    #aiVoiceRouter;
    #aiTextSetter;
    #aiDialer;
    #smsCampaign;
    #voiceCampaign;
    #sys;
  };

  type LiveEvent = {
    id : Nat;
    tenantId : TenantId;
    source : LiveEventSource;
    message : Text;
    createdAt : Timestamp;
  };

  // Old State record — mirrors .old/src/backend/lib/core-types.mo State.
  public type OldState = {
    tenants : Map.Map<TenantId, Tenant>;
    users : Map.Map<UserId, User>;
    leads : Map.Map<LeadId, Lead>;
    aiInteractions : Map.Map<InteractionId, AiInteraction>;
    smsCampaigns : Map.Map<CampaignId, SmsCampaign>;
    voiceCampaigns : Map.Map<CampaignId, OldVoiceCampaign>;
    billing : Map.Map<TenantId, Billing>;
    liveEvents : List.List<LiveEvent>;
    var nextTenantId : TenantId;
    var nextUserId : UserId;
    var nextLeadId : LeadId;
    var nextInteractionId : InteractionId;
    var nextCampaignId : CampaignId;
    var nextBillingId : BillingId;
    var nextLiveEventId : Nat;
    var nextInvoiceId : Nat;
    var timeSavedByAi : Map.Map<TenantId, Nat>;
  };

  // OldActor lists only the stable fields the migration consumes.
  // accessControlState is intentionally omitted: it is inherited unchanged.
  public type OldActor = {
    state : OldState;
  };

  // NewActor lists only the stable fields the migration produces.
  // accessControlState is intentionally omitted: it is inherited from the
  // previous canister.
  public type NewActor = {
    state : CoreLib.State;
  };

  // Migrate each old VoiceCampaign to the new shape: add targetStatus = #newLead
  // and extend voiceAgent with empty-string defaults for the four new fields.
  // All other collections and counters are carried over unchanged.
  public func run(old : OldActor) : NewActor {
    let oldState = old.state;
    let newVoiceCampaigns = oldState.voiceCampaigns.map<CampaignId, OldVoiceCampaign, CoreTypes.VoiceCampaign>(
      func(_id, c : OldVoiceCampaign) : CoreTypes.VoiceCampaign {
        {
          id = c.id;
          tenantId = c.tenantId;
          name = c.name;
          status = c.status;
          targetSegment = c.targetSegment;
          targetStatus = #newLead;
          voiceAgent = {
            agentName = c.voiceAgent.agentName;
            voiceProvider = c.voiceAgent.voiceProvider;
            voiceId = c.voiceAgent.voiceId;
            language = c.voiceAgent.language;
            apiKey = "";
            model = "";
            transferPhoneNumber = "";
            voiceSettings = "";
          };
          callsPlaced = c.callsPlaced;
          qualifiedTransfers = c.qualifiedTransfers;
          minutesSaved = c.minutesSaved;
          createdAt = c.createdAt;
        };
      },
    );
    // Map leads to coerce LeadSource (additive #csvImport tag) into the new
    // LeadSource type. The record shape is otherwise unchanged.
    let newLeads = oldState.leads.map<LeadId, Lead, CoreTypes.Lead>(
      func(_id, l : Lead) : CoreTypes.Lead {
        {
          id = l.id;
          tenantId = l.tenantId;
          name = l.name;
          phone = l.phone;
          email = l.email;
          source = l.source;
          annualPremiumValue = l.annualPremiumValue;
          status = l.status;
          assignedAgentId = l.assignedAgentId;
          createdAt = l.createdAt;
          updatedAt = l.updatedAt;
        };
      },
    );
    // Map aiInteractions to add voiceCall = null (new optional field).
    let newAiInteractions = oldState.aiInteractions.map<InteractionId, AiInteraction, CoreTypes.AiInteraction>(
      func(_id, i : AiInteraction) : CoreTypes.AiInteraction {
        {
          id = i.id;
          tenantId = i.tenantId;
          leadId = i.leadId;
          agentId = i.agentId;
          interactionType = i.interactionType;
          outcome = i.outcome;
          durationSeconds = i.durationSeconds;
          minutesSaved = i.minutesSaved;
          summary = i.summary;
          voiceCall = null;
          createdAt = i.createdAt;
        };
      },
    );
    // Map tenants to add the new required voiceAgent field. The old Tenant
    // type lacks voiceAgent, so the Map must be .map'd to the new record
    // type — otherwise the M0216 stable compatibility check fails.
    let newTenants = oldState.tenants.map<TenantId, Tenant, CoreTypes.Tenant>(
      func(_id, t : Tenant) : CoreTypes.Tenant {
        {
          id = t.id;
          agencyName = t.agencyName;
          primaryContact = t.primaryContact;
          planTier = t.planTier;
          voiceAgent = {
            agentName = "";
            voiceProvider = "";
            voiceId = "";
            language = "";
            apiKey = "";
            model = "";
            transferPhoneNumber = "";
            voiceSettings = "";
          };
          createdAt = t.createdAt;
        };
      },
    );
    {
      state = {
        tenants = newTenants;
        users = oldState.users;
        leads = newLeads;
        aiInteractions = newAiInteractions;
        smsCampaigns = oldState.smsCampaigns;
        voiceCampaigns = newVoiceCampaigns;
        billing = oldState.billing;
        liveEvents = oldState.liveEvents;
        var nextTenantId = oldState.nextTenantId;
        var nextUserId = oldState.nextUserId;
        var nextLeadId = oldState.nextLeadId;
        var nextInteractionId = oldState.nextInteractionId;
        var nextCampaignId = oldState.nextCampaignId;
        var nextBillingId = oldState.nextBillingId;
        var nextLiveEventId = oldState.nextLiveEventId;
        var nextInvoiceId = oldState.nextInvoiceId;
        var timeSavedByAi = oldState.timeSavedByAi;
      };
    };
  };
};
