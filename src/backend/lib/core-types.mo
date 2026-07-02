// Domain logic for the StrataFi core-types domain.
// Stateless module operating on a shared State record (the "self pattern").
// Every entity record strictly references a TenantId for shared-table
// multi-tenant isolation.

import Array "mo:core/Array";
import Char "mo:core/Char";
import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import CoreTypes "../types/core-types";

module {
  public type TenantId = CoreTypes.TenantId;
  public type UserId = CoreTypes.UserId;
  public type LeadId = CoreTypes.LeadId;
  public type InteractionId = CoreTypes.InteractionId;
  public type CampaignId = CoreTypes.CampaignId;
  public type BillingId = CoreTypes.BillingId;
  public type Timestamp = CoreTypes.Timestamp;

  public type Tenant = CoreTypes.Tenant;
  public type User = CoreTypes.User;
  public type Lead = CoreTypes.Lead;
  public type AiInteraction = CoreTypes.AiInteraction;
  public type SmsCampaign = CoreTypes.SmsCampaign;
  public type VoiceCampaign = CoreTypes.VoiceCampaign;
  public type Billing = CoreTypes.Billing;
  public type DashboardSummary = CoreTypes.DashboardSummary;
  public type ColumnChartMetric = CoreTypes.ColumnChartMetric;
  public type LiveEvent = CoreTypes.LiveEvent;
  public type BulkLeadInput = CoreTypes.BulkLeadInput;
  public type BulkImportResult = CoreTypes.BulkImportResult;
  public type VoiceCallRequest = CoreTypes.VoiceCallRequest;
  public type VoiceCallResult = CoreTypes.VoiceCallResult;

  // Default empty VoiceAgentConfig used when a tenant is created without an
  // explicit voice agent configuration, and as the migration default for
  // pre-existing tenants.
  public func emptyVoiceAgentConfig() : CoreTypes.VoiceAgentConfig {
    {
      agentName = "";
      voiceProvider = "";
      voiceId = "";
      language = "";
      apiKey = "";
      model = "";
      transferPhoneNumber = "";
      voiceSettings = "";
    };
  };

  // Stable state container, owned by the actor and passed to every lib call.
  public type State = {
    tenants : Map.Map<TenantId, Tenant>;
    users : Map.Map<UserId, User>;
    leads : Map.Map<LeadId, Lead>;
    aiInteractions : Map.Map<InteractionId, AiInteraction>;
    smsCampaigns : Map.Map<CampaignId, SmsCampaign>;
    voiceCampaigns : Map.Map<CampaignId, VoiceCampaign>;
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
    var timeSavedByAi : Map.Map<TenantId, Nat>; // aggregate minutes saved per tenant
  };

  public func emptyState() : State {
    {
      tenants = Map.empty<TenantId, Tenant>();
      users = Map.empty<UserId, User>();
      leads = Map.empty<LeadId, Lead>();
      aiInteractions = Map.empty<InteractionId, AiInteraction>();
      smsCampaigns = Map.empty<CampaignId, SmsCampaign>();
      voiceCampaigns = Map.empty<CampaignId, VoiceCampaign>();
      billing = Map.empty<TenantId, Billing>();
      liveEvents = List.empty<LiveEvent>();
      var nextTenantId = 1;
      var nextUserId = 1;
      var nextLeadId = 1;
      var nextInteractionId = 1;
      var nextCampaignId = 1;
      var nextBillingId = 1;
      var nextLiveEventId = 1;
      var nextInvoiceId = 1;
      var timeSavedByAi = Map.empty<TenantId, Nat>();
    };
  };

  // ---- Tenant CRUD ----

  public func createTenant(state : State, agencyName : Text, primaryContact : Text, planTier : CoreTypes.PlanTier) : Tenant {
    let id = state.nextTenantId;
    state.nextTenantId += 1;
    let tenant : Tenant = {
      id;
      agencyName;
      primaryContact;
      planTier;
      voiceAgent = emptyVoiceAgentConfig();
      createdAt = Time.now();
    };
    state.tenants.add(id, tenant);
    tenant;
  };

  public func getTenant(state : State, id : TenantId) : ?Tenant {
    state.tenants.get(id);
  };

  public func updateTenant(state : State, id : TenantId, agencyName : Text, primaryContact : Text, planTier : CoreTypes.PlanTier, voiceAgent : CoreTypes.VoiceAgentConfig) : ?Tenant {
    switch (state.tenants.get(id)) {
      case null null;
      case (?tenant) {
        let updated : Tenant = { tenant with agencyName; primaryContact; planTier; voiceAgent };
        state.tenants.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteTenant(state : State, id : TenantId) : Bool {
    switch (state.tenants.get(id)) {
      case null false;
      case (?_) {
        state.tenants.remove(id);
        true;
      };
    };
  };

  public func listTenants(state : State) : [Tenant] {
    state.tenants.values().toArray();
  };

  // ---- User CRUD ----

  public func createUser(state : State, tenantId : TenantId, principal : Principal, name : Text, email : Text, role : CoreTypes.Role) : User {
    let id = state.nextUserId;
    state.nextUserId += 1;
    let user : User = {
      id;
      tenantId;
      principal;
      name;
      email;
      role;
      status = #offline;
      createdAt = Time.now();
    };
    state.users.add(id, user);
    user;
  };

  public func getUser(state : State, id : UserId) : ?User {
    state.users.get(id);
  };

  public func updateUser(state : State, id : UserId, name : Text, email : Text, role : CoreTypes.Role, status : CoreTypes.UserStatus) : ?User {
    switch (state.users.get(id)) {
      case null null;
      case (?user) {
        let updated : User = { user with name; email; role; status };
        state.users.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteUser(state : State, id : UserId) : Bool {
    switch (state.users.get(id)) {
      case null false;
      case (?_) {
        state.users.remove(id);
        true;
      };
    };
  };

  public func listUsersByTenant(state : State, tenantId : TenantId) : [User] {
    state.users.values().toArray().filter(func(u : User) : Bool { u.tenantId == tenantId });
  };

  // ---- Lead CRUD ----

  public func createLead(state : State, tenantId : TenantId, name : Text, phone : Text, email : Text, source : CoreTypes.LeadSource, annualPremiumValue : Nat, assignedAgentId : ?UserId) : Lead {
    let id = state.nextLeadId;
    state.nextLeadId += 1;
    let now = Time.now();
    let lead : Lead = {
      id;
      tenantId;
      name;
      phone;
      email;
      source;
      annualPremiumValue;
      status = #newLead;
      assignedAgentId;
      createdAt = now;
      updatedAt = now;
    };
    state.leads.add(id, lead);
    lead;
  };

  public func getLead(state : State, id : LeadId) : ?Lead {
    state.leads.get(id);
  };

  public func updateLead(state : State, id : LeadId, name : Text, phone : Text, email : Text, source : CoreTypes.LeadSource, annualPremiumValue : Nat, status : CoreTypes.LeadStatus, assignedAgentId : ?UserId) : ?Lead {
    switch (state.leads.get(id)) {
      case null null;
      case (?lead) {
        let updated : Lead = {
          lead with
          name;
          phone;
          email;
          source;
          annualPremiumValue;
          status;
          assignedAgentId;
          updatedAt = Time.now();
        };
        state.leads.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteLead(state : State, id : LeadId) : Bool {
    switch (state.leads.get(id)) {
      case null false;
      case (?_) {
        state.leads.remove(id);
        true;
      };
    };
  };

  public func listLeadsByTenant(state : State, tenantId : TenantId) : [Lead] {
    state.leads.values().toArray().filter(func(l : Lead) : Bool { l.tenantId == tenantId });
  };

  public func listLeadsByStatus(state : State, tenantId : TenantId, status : CoreTypes.LeadStatus) : [Lead] {
    state.leads.values().toArray().filter(func(l : Lead) : Bool { l.tenantId == tenantId and l.status == status });
  };

  // ---- Bulk lead import ----

  public func bulkImportLeads(state : State, tenantId : TenantId, inputs : [CoreTypes.BulkLeadInput]) : CoreTypes.BulkImportResult {
    let createdIds = List.empty<Nat>();
    let errors = List.empty<Text>();
    var idx = 0;
    for (input in inputs.vals()) {
      idx += 1;
      // Validate required fields: name and phone must be non-empty.
      if (input.name.isEmpty() or input.phone.isEmpty()) {
        errors.add("Row " # (idx.toText()) # ": missing required field (name or phone)");
      } else {
        let email = switch (input.email) { case (?e) e; case null "" };
        let source = switch (input.source) { case (?s) s; case null #csvImport };
        let annualPremiumValue = switch (input.annualPremiumValue) { case (?n) n; case null 0 };
        let status = switch (input.status) { case (?s) s; case null #newLead };
        let assignedAgentId = input.assignedAgentId;
        let lead = createLead(state, tenantId, input.name, input.phone, email, source, annualPremiumValue, assignedAgentId);
        // Apply requested status (createLead defaults to #newLead).
        switch (input.status) {
          case null {};
          case (?s) {
            ignore updateLead(state, lead.id, input.name, input.phone, email, source, annualPremiumValue, s, assignedAgentId);
          };
        };
        createdIds.add(lead.id);
      };
    };
    { createdIds = createdIds.toArray(); errors = errors.toArray() };
  };

  // ---- AI Interaction CRUD ----

  public func createAiInteraction(state : State, tenantId : TenantId, leadId : LeadId, agentId : ?UserId, interactionType : CoreTypes.InteractionType, outcome : CoreTypes.InteractionOutcome, durationSeconds : Nat, summary : Text) : AiInteraction {
    let id = state.nextInteractionId;
    state.nextInteractionId += 1;
    // Compute minutes saved: 3 minutes for appointment bookings and live transfers.
    let minutesSaved = applyTimeSavedForInteraction(state, tenantId, interactionType, outcome);
    let interaction : AiInteraction = {
      id;
      tenantId;
      leadId;
      agentId;
      interactionType;
      outcome;
      durationSeconds;
      minutesSaved;
      summary;
      voiceCall = null;
      createdAt = Time.now();
    };
    state.aiInteractions.add(id, interaction);
    interaction;
  };

  public func getAiInteraction(state : State, id : InteractionId) : ?AiInteraction {
    state.aiInteractions.get(id);
  };

  public func updateAiInteraction(state : State, id : InteractionId, outcome : CoreTypes.InteractionOutcome, durationSeconds : Nat, summary : Text) : ?AiInteraction {
    switch (state.aiInteractions.get(id)) {
      case null null;
      case (?interaction) {
        let updated : AiInteraction = { interaction with outcome; durationSeconds; summary };
        state.aiInteractions.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteAiInteraction(state : State, id : InteractionId) : Bool {
    switch (state.aiInteractions.get(id)) {
      case null false;
      case (?_) {
        state.aiInteractions.remove(id);
        true;
      };
    };
  };

  public func listAiInteractionsByTenant(state : State, tenantId : TenantId) : [AiInteraction] {
    state.aiInteractions.values().toArray().filter(func(i : AiInteraction) : Bool { i.tenantId == tenantId });
  };

  public func listAiInteractionsByLead(state : State, leadId : LeadId) : [AiInteraction] {
    state.aiInteractions.values().toArray().filter(func(i : AiInteraction) : Bool { i.leadId == leadId });
  };

  // ---- SMS Campaign CRUD ----

  public func createSmsCampaign(state : State, tenantId : TenantId, name : Text, audienceSegment : CoreTypes.AudienceSegment, messageTemplate : Text) : SmsCampaign {
    let id = state.nextCampaignId;
    state.nextCampaignId += 1;
    let campaign : SmsCampaign = {
      id;
      tenantId;
      name;
      status = #draft;
      audienceSegment;
      messageTemplate;
      sentCount = 0;
      responseCount = 0;
      createdAt = Time.now();
    };
    state.smsCampaigns.add(id, campaign);
    campaign;
  };

  public func getSmsCampaign(state : State, id : CampaignId) : ?SmsCampaign {
    state.smsCampaigns.get(id);
  };

  public func updateSmsCampaign(state : State, id : CampaignId, name : Text, status : CoreTypes.CampaignStatus, audienceSegment : CoreTypes.AudienceSegment, messageTemplate : Text) : ?SmsCampaign {
    switch (state.smsCampaigns.get(id)) {
      case null null;
      case (?campaign) {
        let updated : SmsCampaign = { campaign with name; status; audienceSegment; messageTemplate };
        state.smsCampaigns.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteSmsCampaign(state : State, id : CampaignId) : Bool {
    switch (state.smsCampaigns.get(id)) {
      case null false;
      case (?_) {
        state.smsCampaigns.remove(id);
        true;
      };
    };
  };

  public func listSmsCampaignsByTenant(state : State, tenantId : TenantId) : [SmsCampaign] {
    state.smsCampaigns.values().toArray().filter(func(c : SmsCampaign) : Bool { c.tenantId == tenantId });
  };

  // ---- Voice Campaign CRUD ----

  public func createVoiceCampaign(state : State, tenantId : TenantId, name : Text, targetSegment : CoreTypes.AudienceSegment, targetStatus : CoreTypes.LeadStatus, voiceAgent : CoreTypes.VoiceAgentConfig) : VoiceCampaign {
    let id = state.nextCampaignId;
    state.nextCampaignId += 1;
    let campaign : VoiceCampaign = {
      id;
      tenantId;
      name;
      status = #draft;
      targetSegment;
      targetStatus;
      voiceAgent;
      callsPlaced = 0;
      qualifiedTransfers = 0;
      minutesSaved = 0;
      createdAt = Time.now();
    };
    state.voiceCampaigns.add(id, campaign);
    campaign;
  };

  public func getVoiceCampaign(state : State, id : CampaignId) : ?VoiceCampaign {
    state.voiceCampaigns.get(id);
  };

  public func updateVoiceCampaign(state : State, id : CampaignId, name : Text, status : CoreTypes.CampaignStatus, targetSegment : CoreTypes.AudienceSegment, targetStatus : CoreTypes.LeadStatus, voiceAgent : CoreTypes.VoiceAgentConfig) : ?VoiceCampaign {
    switch (state.voiceCampaigns.get(id)) {
      case null null;
      case (?campaign) {
        let updated : VoiceCampaign = { campaign with name; status; targetSegment; targetStatus; voiceAgent };
        state.voiceCampaigns.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteVoiceCampaign(state : State, id : CampaignId) : Bool {
    switch (state.voiceCampaigns.get(id)) {
      case null false;
      case (?_) {
        state.voiceCampaigns.remove(id);
        true;
      };
    };
  };

  public func listVoiceCampaignsByTenant(state : State, tenantId : TenantId) : [VoiceCampaign] {
    state.voiceCampaigns.values().toArray().filter(func(c : VoiceCampaign) : Bool { c.tenantId == tenantId });
  };

  // ---- Outbound voice call placement ----

  // Internal: append a LiveEvent to the stream.
  func pushLiveEvent(state : State, tenantId : TenantId, source : CoreTypes.LiveEventSource, message : Text) : () {
    let id = state.nextLiveEventId;
    state.nextLiveEventId += 1;
    let ev : LiveEvent = { id; tenantId; source; message; createdAt = Time.now() };
    state.liveEvents.add(ev);
  };

  // Internal: create an AiInteraction of type #voiceCall with the supplied
  // VoiceCallDetail. Bypasses createAiInteraction (which forces voiceCall=null)
  // so the call detail is persisted on the interaction record.
  func createVoiceCallInteraction(state : State, tenantId : TenantId, leadId : LeadId, agentId : ?UserId, outcome : CoreTypes.InteractionOutcome, durationSeconds : Nat, summary : Text, voiceCall : CoreTypes.VoiceCallDetail) : AiInteraction {
    let id = state.nextInteractionId;
    state.nextInteractionId += 1;
    let minutesSaved = applyTimeSavedForInteraction(state, tenantId, #voiceCall, outcome);
    let interaction : AiInteraction = {
      id;
      tenantId;
      leadId;
      agentId;
      interactionType = #voiceCall;
      outcome;
      durationSeconds;
      minutesSaved;
      summary;
      voiceCall = ?voiceCall;
      createdAt = Time.now();
    };
    state.aiInteractions.add(id, interaction);
    interaction;
  };

  // Internal: extract a JSON string field value by key from a flat JSON text
  // response. Returns null if the key is absent or the value cannot be parsed.
  // Handles the common shapes: "call_id":"value" and "call_id": "value".
  func extractJsonStringField(json : Text, key : Text) : ?Text {
    let quoteChar : Char = '\u{22}';
    let pattern = quoteChar.toText() # key # quoteChar.toText();
    // Manual substring search — Text.indexOf is not available in core@2.5.0.
    let jsonChars = json.toArray();
    let patChars = pattern.toArray();
    let jsonLen = jsonChars.size();
    let patLen = patChars.size();
    var foundIdx : ?Nat = null;
    var searchPos = 0;
    label search while (searchPos + patLen <= jsonLen) {
      var matched = true;
      var k = 0;
      label matchLoop while (k < patLen) {
        if (jsonChars[searchPos + k] != patChars[k]) {
          matched := false;
          break matchLoop;
        };
        k += 1;
      };
      if (matched) {
        foundIdx := ?searchPos;
        break search;
      };
      searchPos += 1;
    };
    switch (foundIdx) {
      case null return null;
      case (?s) {
        let chars = jsonChars;
        let n = jsonLen;
        // Skip past the key and the following colon.
        var i = s + patLen;
        // Skip whitespace.
        while (i < n and (chars[i] == ' ' or chars[i] == '\t' or chars[i] == '\n')) { i += 1 };
        if (i >= n or chars[i] != ':') { return null };
        i += 1;
        // Skip whitespace.
        while (i < n and (chars[i] == ' ' or chars[i] == '\t' or chars[i] == '\n')) { i += 1 };
        let quoteChar : Char = '\u{22}';
        if (i >= n or chars[i] != quoteChar) { return null };
        i += 1;
        // Collect the string value until the closing quote.
        var value = "";
        while (i < n and chars[i] != quoteChar) {
          // Handle escaped quotes.
          if (chars[i] == '\\' and i + 1 < n) {
            i += 1;
            value #= switch (chars[i]) {
              case ('\u{22}') "\u{22}";
              case ('\\') "\\";
              case ('n') "\n";
              case ('t') "\t";
              case (c) (c.toText());
            };
          } else {
            value #= chars[i].toText();
          };
          i += 1;
        };
        ?value;
      };
    };
  };

  // Place an outbound AI voice call against a lead via the Bland.ai API.
  // Looks up the tenant's voiceAgent.apiKey and the lead's phone number,
  // performs an HTTP POST, parses the call_id from the response, and on
  // success records an AiInteraction (#voiceCall) with voiceCall detail and
  // appends a LiveEvent. Returns the call result.
  public func placeVoiceCall(state : State, request : CoreTypes.VoiceCallRequest, transform : OutCall.Transform) : async CoreTypes.VoiceCallResult {
    // Resolve tenant and its voice agent config.
    let tenant = switch (state.tenants.get(request.tenantId)) {
      case null return { callId = ""; status = #failed; error = ?"Tenant not found" };
      case (?t) t;
    };
    let apiKey = tenant.voiceAgent.apiKey;
    if (apiKey.isEmpty()) {
      return { callId = ""; status = #failed; error = ?"Tenant voice agent API key not configured" };
    };
    // Resolve the lead and its phone number.
    let lead = switch (state.leads.get(request.leadId)) {
      case null return { callId = ""; status = #failed; error = ?"Lead not found" };
      case (?l) l;
    };
    if (lead.tenantId != request.tenantId) {
      return { callId = ""; status = #failed; error = ?"Lead does not belong to tenant" };
    };
    if (lead.phone.isEmpty()) {
      return { callId = ""; status = #failed; error = ?"Lead has no phone number" };
    };
    // Build the JSON request body.
    let body = "{"
      # "\"phone_number\":\"" # lead.phone # "\","
      # "\"task\":\"" # request.task # "\","
      # "\"voice\":\"" # request.voiceId # "\","
      # "\"language\":\"" # request.language # "\","
      # "\"transfer_phone_number\":\"" # request.transferPhoneNumber # "\""
      # "}";
    let headers = [
      { name = "Authorization"; value = "Bearer " # apiKey },
      { name = "Content-Type"; value = "application/json" },
    ];
    // Perform the HTTP POST. The transform callback is required by the IC.
    let response = await OutCall.httpPostRequest(
      "https://api.bland.ai/v1/calls",
      headers,
      body,
      transform,
    );
    // Parse call_id from the JSON response.
    let callId = switch (extractJsonStringField(response, "call_id")) {
      case null return { callId = ""; status = #failed; error = ?"No call_id in provider response" };
      case (?id) id;
    };
    // Record the interaction and live event.
    let detail : CoreTypes.VoiceCallDetail = {
      callId;
      status = #initiated;
      duration = 0;
    };
    ignore createVoiceCallInteraction(
      state,
      request.tenantId,
      request.leadId,
      null,
      #sent,
      0,
      "Outbound AI voice call placed to " # lead.phone,
      detail,
    );
    pushLiveEvent(state, request.tenantId, #aiDialer, "[AI Dialer] Outbound voice call placed to " # lead.phone # " (call " # callId # ")");
    { callId; status = #initiated; error = null };
  };

  // Launch a voice campaign: look up the campaign, list leads matching its
  // targetStatus, place a voice call to each, and increment the campaign's
  // callsPlaced counter for every successful call. Returns the per-lead
  // results.
  public func launchVoiceCampaign(state : State, tenantId : TenantId, campaignId : CampaignId, transform : OutCall.Transform) : async [CoreTypes.VoiceCallResult] {
    let campaign = switch (state.voiceCampaigns.get(campaignId)) {
      case null return [];
      case (?c) c;
    };
    if (campaign.tenantId != tenantId) {
      return [];
    };
    let tenant = switch (state.tenants.get(tenantId)) {
      case null return [];
      case (?t) t;
    };
    let targetLeads = listLeadsByStatus(state, tenantId, campaign.targetStatus);
    let results = List.empty<CoreTypes.VoiceCallResult>();
    for (lead in targetLeads.vals()) {
      let request : CoreTypes.VoiceCallRequest = {
        tenantId;
        leadId = lead.id;
        task = campaign.name;
        voiceId = campaign.voiceAgent.voiceId;
        language = campaign.voiceAgent.language;
        transferPhoneNumber = campaign.voiceAgent.transferPhoneNumber;
      };
      let result = await placeVoiceCall(state, request, transform);
      results.add(result);
      if (result.status == #initiated) {
        switch (state.voiceCampaigns.get(campaignId)) {
          case null {};
          case (?c) {
            state.voiceCampaigns.add(campaignId, { c with callsPlaced = c.callsPlaced + 1 });
          };
        };
      };
    };
    results.toArray();
  };

  // ---- Billing ----

  public func getBilling(state : State, tenantId : TenantId) : ?Billing {
    state.billing.get(tenantId);
  };

  public func updateBillingPlan(state : State, tenantId : TenantId, planTier : CoreTypes.PlanTier, includedMinutes : Nat) : ?Billing {
    switch (state.billing.get(tenantId)) {
      case null null;
      case (?b) {
        let updated : Billing = { b with planTier; includedMinutes; updatedAt = Time.now() };
        state.billing.add(tenantId, updated);
        ?updated;
      };
    };
  };

  public func recordBillingUsage(state : State, tenantId : TenantId, usedMinutesDelta : Nat) : ?Billing {
    switch (state.billing.get(tenantId)) {
      case null null;
      case (?b) {
        let updated : Billing = { b with usedMinutes = b.usedMinutes + usedMinutesDelta; updatedAt = Time.now() };
        state.billing.add(tenantId, updated);
        ?updated;
      };
    };
  };

  public func addInvoice(state : State, tenantId : TenantId, amount : Nat) : ?Billing {
    switch (state.billing.get(tenantId)) {
      case null null;
      case (?b) {
        let invoiceId = state.nextInvoiceId;
        state.nextInvoiceId += 1;
        let invoice : CoreTypes.InvoiceRecord = {
          invoiceId;
          amount;
          issuedAt = Time.now();
          paid = false;
        };
        let updated : Billing = { b with invoiceHistory = b.invoiceHistory.concat([invoice]); updatedAt = Time.now() };
        state.billing.add(tenantId, updated);
        ?updated;
      };
    };
  };

  // ---- Dashboard aggregates ----

  public func getDashboardSummary(state : State, tenantId : TenantId) : DashboardSummary {
    let users = listUsersByTenant(state, tenantId);
    let totalAgents = users.size();
    let activeAgentsOnline = users.filter(func(u : User) : Bool { u.status == #online }).size();
    let activeAgentsPercentage : Float = if (totalAgents == 0) { 0.0 } else {
      (activeAgentsOnline.toFloat() / totalAgents.toFloat()) * 100.0;
    };
    let totalLeads = listLeadsByTenant(state, tenantId).size();
    let timeSavedByAiMinutes = switch (state.timeSavedByAi.get(tenantId)) {
      case null 0;
      case (?n) n;
    };
    {
      activeAgentsOnline;
      totalAgents;
      activeAgentsPercentage;
      totalLeads;
      timeSavedByAiMinutes;
    };
  };

  public func getColumnChartMetrics(state : State, tenantId : TenantId) : ColumnChartMetric {
    let interactions = listAiInteractionsByTenant(state, tenantId);
    let smsSent = interactions.filter(func(i : AiInteraction) : Bool {
      i.interactionType == #textMessage and (i.outcome == #sent or i.outcome == #delivered);
    }).size();
    let callsAi = interactions.filter(func(i : AiInteraction) : Bool { i.interactionType == #voiceCall }).size();
    let apptsBooked = interactions.filter(func(i : AiInteraction) : Bool {
      i.interactionType == #appointmentBooking and i.outcome == #booked;
    }).size();
    let liveTransfers = interactions.filter(func(i : AiInteraction) : Bool {
      i.interactionType == #liveTransfer and i.outcome == #transferred;
    }).size();
    let leadsSold = listLeadsByStatus(state, tenantId, #sold).size();
    { smsSent; callsAi; apptsBooked; liveTransfers; leadsSold };
  };

  public func getLiveEventStream(state : State, tenantId : TenantId, limit : Nat) : [LiveEvent] {
    let events = state.liveEvents.toArray().filter(func(e : LiveEvent) : Bool { e.tenantId == tenantId });
    // Most recent first.
    let sorted = events.sort(func(a : LiveEvent, b : LiveEvent) : { #less; #equal; #greater } {
      if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal };
    });
    if (limit == 0) { sorted } else {
      let count = if (limit < sorted.size()) { limit } else { sorted.size() };
      Array.tabulate<LiveEvent>(count, func(i : Nat) : LiveEvent { sorted[i] });
    };
  };

  // ---- Time-saved automation helper ----
  // Increments the tenant's "Time Saved By AI" aggregate by 3 minutes every
  // time a text booking or live voice transfer interaction is recorded.
  // Returns the minutes saved for this interaction (3 if applicable, else 0).

  public func applyTimeSavedForInteraction(state : State, tenantId : TenantId, interactionType : CoreTypes.InteractionType, outcome : CoreTypes.InteractionOutcome) : Nat {
    let qualifies = switch (interactionType) {
      case (#appointmentBooking) { outcome == #booked };
      case (#liveTransfer) { outcome == #transferred };
      case (_) false;
    };
    if (not qualifies) { return 0 };
    let current = switch (state.timeSavedByAi.get(tenantId)) {
      case null 0;
      case (?n) n;
    };
    state.timeSavedByAi.add(tenantId, current + 3);
    3;
  };

  // ---- Mock data seeding ----
  // Seeds 3 tenants (Apex / Sentinel / Meridian) with ~49 leads across all 5
  // statuses, 92 AI interactions (some #voiceCall with voiceCall detail), SMS
  // campaigns, voice campaigns (with targetStatus set), billing, and live
  // events. All records are scoped with tenant_id. Tenant creation auto-sets
  // an empty voiceAgent via createTenant; voice campaigns carry a full
  // 8-field VoiceAgentConfig.

  public func seedMockData(state : State) : () {
    let anon = Principal.fromText("2vxsx-fae"); // anonymous principal placeholder

    // Helper to create a billing record for a tenant.
    func seedBilling(tid : TenantId, plan : CoreTypes.PlanTier, included : Nat, used : Nat, invoices : [(Nat, Nat, Bool)]) : () {
      let id = state.nextBillingId;
      state.nextBillingId += 1;
      let invoiceRecords : [CoreTypes.InvoiceRecord] = Array.tabulate<CoreTypes.InvoiceRecord>(
        invoices.size(),
        func(i : Nat) : CoreTypes.InvoiceRecord {
          let (invoiceId, amount, paid) = invoices[i];
          { invoiceId; amount; issuedAt = Time.now() - 1000000000 * 60 * 60 * 24 * (invoices.size() - i).toInt(); paid };
        },
      );
      let b : Billing = {
        id;
        tenantId = tid;
        planTier = plan;
        includedMinutes = included;
        usedMinutes = used;
        invoiceHistory = invoiceRecords;
        updatedAt = Time.now();
      };
      state.billing.add(tid, b);
    };

    // Helper to push a live event.
    func pushEvent(tid : TenantId, source : CoreTypes.LiveEventSource, message : Text) : () {
      let id = state.nextLiveEventId;
      state.nextLiveEventId += 1;
      let ev : LiveEvent = { id; tenantId = tid; source; message; createdAt = Time.now() - (id * 1000000000).toInt() };
      state.liveEvents.add(ev);
    };

    // Shared lookup tables.
    let sources : [CoreTypes.LeadSource] = [#inbound, #outbound, #referral, #webForm, #aiDialer, #smsCampaign, #voiceCampaign];
    let statuses : [CoreTypes.LeadStatus] = [#newLead, #aiContacted, #apptBooked, #liveTransferred, #sold];
    let interactionTypes : [CoreTypes.InteractionType] = [#textMessage, #voiceCall, #liveTransfer, #appointmentBooking];
    let outcomes : [CoreTypes.InteractionOutcome] = [#sent, #delivered, #replied, #noAnswer, #qualified, #transferred, #booked, #failed];
    let summaries : [Text] = [
      "SMS sent to lead for follow-up",
      "AI voice call qualified the prospect",
      "Live transfer to agent line completed",
      "Appointment booked via AI text setter",
      "AI dialer reached voicemail",
      "SMS campaign reply received",
      "Voice router qualified and transferred",
      "AI text setter booked a meeting",
    ];

    // Helper to build a full 8-field VoiceAgentConfig for seeded voice
    // campaigns. The four "secret" fields (apiKey, model,
    // transferPhoneNumber, voiceSettings) are seeded with placeholder values
    // — there is no live provider integration in this build.
    func voiceAgent(agentName : Text, voiceProvider : Text, voiceId : Text) : CoreTypes.VoiceAgentConfig {
      {
        agentName;
        voiceProvider;
        voiceId;
        language = "en-US";
        apiKey = "";
        model = "";
        transferPhoneNumber = "";
        voiceSettings = "";
      };
    };

    // ---- Tenant 1: Apex Insurance Group ----
    let t1 = createTenant(state, "Apex Insurance Group", "Jordan Rivera", #growth);
    let u1a = createUser(state, t1.id, anon, "Jordan Rivera", "jordan@apexins.com", #admin);
    let u1b = createUser(state, t1.id, anon, "Casey Nguyen", "casey@apexins.com", #agent);
    let u1c = createUser(state, t1.id, anon, "Sam Patel", "sam@apexins.com", #agent);
    let u1d = createUser(state, t1.id, anon, "Morgan Lee", "morgan@apexins.com", #manager);
    // Mark some agents online.
    ignore updateUser(state, u1a.id, u1a.name, u1a.email, u1a.role, #online);
    ignore updateUser(state, u1b.id, u1b.name, u1b.email, u1b.role, #online);
    ignore updateUser(state, u1c.id, u1c.name, u1c.email, u1c.role, #away);

    // Leads for tenant 1 (18 leads across all statuses).
    let leadNames1 = [
      "Dana White", "Eli Brooks", "Priya Shah", "Marcus Cole", "Lena Ortiz",
      "Tom Hardy", "Rita Mendez", "Owen Hart", "Nina Park", "Victor Reyes",
      "Beth Stone", "Yuki Tanaka", "Frank Doyle", "Aria Khan", "Gus Romero",
      "Ivy Chen", "Hugo Bell", "Zoe Adams",
    ];
    var li = 0;
    for (name in leadNames1.vals()) {
      let status = statuses[li % statuses.size()];
      let source = sources[li % sources.size()];
      let agentId : ?UserId = if (li % 3 == 0) { ?u1b.id } else if (li % 3 == 1) { ?u1c.id } else { null };
      let premium = 1200 + li * 350;
      let phone = "+1-555-010" # (li.toText());
      let email = name.toLower().replace(#text " ", ".") # "@lead.com";
      ignore createLead(state, t1.id, name, phone, email, source, premium, agentId);
      // Update lead status to spread across pipeline.
      let lastLeadId = state.nextLeadId - 1;
      ignore updateLead(state, lastLeadId, name, phone, email, source, premium, status, agentId);
      li += 1;
    };

    // AI interactions for tenant 1 (32 interactions, varied types/outcomes).
    // Every 4th interaction is a #voiceCall with voiceCall detail attached.
    var ii = 0;
    while (ii < 32) {
      let leadId = (state.nextLeadId - 18) + (ii % 18); // cycle through tenant 1 leads
      let it = interactionTypes[ii % interactionTypes.size()];
      let oc = outcomes[ii % outcomes.size()];
      let dur = if (it == #textMessage) { 0 } else { 30 + (ii * 7) % 600 };
      let summary = summaries[ii % summaries.size()];
      if (it == #voiceCall and ii % 4 == 0) {
        // Attach a voiceCall detail to every 4th voice interaction.
        let detail : CoreTypes.VoiceCallDetail = {
          callId = "seed-call-1-" # (ii.toText());
          status = #initiated;
          duration = dur;
        };
        ignore createVoiceCallInteraction(state, t1.id, leadId, ?u1b.id, oc, dur, summary, detail);
      } else {
        ignore createAiInteraction(state, t1.id, leadId, ?u1b.id, it, oc, dur, summary);
      };
      ii += 1;
    };

    // SMS campaigns for tenant 1.
    ignore createSmsCampaign(state, t1.id, "Q3 Renewal Outreach", #aiContacted, "Hi {name}, your policy renewal is coming up. Reply YES to connect with an agent.");
    ignore createSmsCampaign(state, t1.id, "New Lead Welcome Series", #newLeads, "Welcome to Apex! An AI agent will reach out shortly to help with your quote.");
    // Mark first as running with sent counts.
    let sc1 = state.nextCampaignId - 2;
    ignore updateSmsCampaign(state, sc1, "Q3 Renewal Outreach", #running, #aiContacted, "Hi {name}, your policy renewal is coming up. Reply YES to connect with an agent.");
    switch (state.smsCampaigns.get(sc1)) {
      case null {};
      case (?c) {
        state.smsCampaigns.add(sc1, { c with sentCount = 450; responseCount = 87 });
      };
    };

    // Voice campaigns for tenant 1. createVoiceCampaign now requires a
    // targetStatus argument; the voiceAgent is a full 8-field config.
    ignore createVoiceCampaign(state, t1.id, "AI Dialer — Lapsed Policies", #liveTransferred, #liveTransferred, voiceAgent("Apex Voice Agent", "vapi", "vapi-standard-amber"));
    let vc1 = state.nextCampaignId - 1;
    switch (state.voiceCampaigns.get(vc1)) {
      case null {};
      case (?c) {
        state.voiceCampaigns.add(vc1, { c with callsPlaced = 320; qualifiedTransfers = 64; minutesSaved = 192 });
      };
    };

    // Billing for tenant 1.
    seedBilling(t1.id, #growth, 5000, 3120, [(1001, 499, true), (1002, 499, true), (1003, 499, false)]);

    // Live events for tenant 1.
    pushEvent(t1.id, #aiVoiceRouter, "[AI Voice Router] Call Qualified & Transferred to Agent Line");
    pushEvent(t1.id, #aiTextSetter, "[AI Text Setter] Appointment Booked");
    pushEvent(t1.id, #aiDialer, "[AI Dialer] Outbound call placed to lead");
    pushEvent(t1.id, #smsCampaign, "[SMS Campaign] Q3 Renewal Outreach — 450 messages sent");
    pushEvent(t1.id, #aiVoiceRouter, "[AI Voice Router] Voicemail left for unqualified lead");
    pushEvent(t1.id, #aiTextSetter, "[AI Text Setter] Reply received — lead warmed");
    pushEvent(t1.id, #voiceCampaign, "[Voice Campaign] AI Dialer — Lapsed Policies: 64 qualified transfers");
    pushEvent(t1.id, #sys, "[System] Tenant onboarded: Apex Insurance Group");

    // ---- Tenant 2: Sentinel Health Advisors ----
    let t2 = createTenant(state, "Sentinel Health Advisors", "Avery Kim", #scale);
    let u2a = createUser(state, t2.id, anon, "Avery Kim", "avery@sentinelhealth.com", #admin);
    let u2b = createUser(state, t2.id, anon, "Drew Walsh", "drew@sentinelhealth.com", #agent);
    let u2c = createUser(state, t2.id, anon, "Quinn Foster", "quinn@sentinelhealth.com", #agent);
    let u2d = createUser(state, t2.id, anon, "Reese Carter", "reese@sentinelhealth.com", #manager);
    ignore updateUser(state, u2a.id, u2a.name, u2a.email, u2a.role, #online);
    ignore updateUser(state, u2b.id, u2b.name, u2b.email, u2b.role, #online);
    ignore updateUser(state, u2c.id, u2c.name, u2c.email, u2c.role, #offline);

    // Leads for tenant 2 (16 leads).
    let leadNames2 = [
      "Holly Park", "Jude Vega", "Maya Singh", "Cole Bridges", "Tara Wells",
      "Ravi Desai", "Lola Cruz", "Beau Nash", "Esme Vargas", "Kai Sutton",
      "Nora Frost", "Otis Reed", "Sage Lin", "Wren Holt", "Dax Mercer", "Iris Vale",
    ];
    li := 0;
    for (name in leadNames2.vals()) {
      let status = statuses[li % statuses.size()];
      let source = sources[(li + 2) % sources.size()];
      let agentId : ?UserId = if (li % 2 == 0) { ?u2b.id } else { ?u2c.id };
      let premium = 1800 + li * 420;
      let phone = "+1-555-020" # (li.toText());
      let email = name.toLower().replace(#text " ", ".") # "@lead.com";
      ignore createLead(state, t2.id, name, phone, email, source, premium, agentId);
      let lastLeadId = state.nextLeadId - 1;
      ignore updateLead(state, lastLeadId, name, phone, email, source, premium, status, agentId);
      li += 1;
    };

    // AI interactions for tenant 2 (30 interactions). Every 5th voice call
    // carries a voiceCall detail.
    ii := 0;
    while (ii < 30) {
      let leadId = (state.nextLeadId - 16) + (ii % 16);
      let it = interactionTypes[(ii + 1) % interactionTypes.size()];
      let oc = outcomes[(ii + 3) % outcomes.size()];
      let dur = if (it == #textMessage) { 0 } else { 45 + (ii * 11) % 540 };
      let summary = summaries[(ii + 2) % summaries.size()];
      if (it == #voiceCall and ii % 5 == 0) {
        let detail : CoreTypes.VoiceCallDetail = {
          callId = "seed-call-2-" # (ii.toText());
          status = #initiated;
          duration = dur;
        };
        ignore createVoiceCallInteraction(state, t2.id, leadId, ?u2b.id, oc, dur, summary, detail);
      } else {
        ignore createAiInteraction(state, t2.id, leadId, ?u2b.id, it, oc, dur, summary);
      };
      ii += 1;
    };

    // SMS + Voice campaigns for tenant 2.
    ignore createSmsCampaign(state, t2.id, "Open Enrollment Blast", #allLeads, "Open enrollment is here! Reply to schedule a consultation with a Sentinel advisor.");
    let sc2 = state.nextCampaignId - 1;
    switch (state.smsCampaigns.get(sc2)) {
      case null {};
      case (?c) {
        state.smsCampaigns.add(sc2, { c with status = #completed; sentCount = 1280; responseCount = 214 });
      };
    };
    ignore createVoiceCampaign(state, t2.id, "AI Voice — Benefits Q&A", #aiContacted, #aiContacted, voiceAgent("Sentinel Benefits Bot", "retell", "retell-amber"));
    let vc2 = state.nextCampaignId - 1;
    switch (state.voiceCampaigns.get(vc2)) {
      case null {};
      case (?c) {
        state.voiceCampaigns.add(vc2, { c with status = #running; callsPlaced = 540; qualifiedTransfers = 98; minutesSaved = 294 });
      };
    };

    seedBilling(t2.id, #scale, 12000, 8740, [(2001, 999, true), (2002, 999, true), (2003, 999, true), (2004, 999, false)]);

    pushEvent(t2.id, #aiVoiceRouter, "[AI Voice Router] Benefits Q&A — call qualified, transferred to advisor");
    pushEvent(t2.id, #aiTextSetter, "[AI Text Setter] Open enrollment appointment booked");
    pushEvent(t2.id, #smsCampaign, "[SMS Campaign] Open Enrollment Blast — 1280 messages sent");
    pushEvent(t2.id, #aiDialer, "[AI Dialer] Outbound dial placed to lapsed member");
    pushEvent(t2.id, #aiTextSetter, "[AI Text Setter] Reply received — consultation scheduled");
    pushEvent(t2.id, #sys, "[System] Tenant onboarded: Sentinel Health Advisors");

    // ---- Tenant 3: Meridian Wealth Group ----
    let t3 = createTenant(state, "Meridian Wealth Group", "Skylar Dunn", #enterprise);
    let u3a = createUser(state, t3.id, anon, "Skylar Dunn", "skylar@meridianwealth.com", #admin);
    let u3b = createUser(state, t3.id, anon, "Tatum Reyes", "tatum@meridianwealth.com", #agent);
    let u3c = createUser(state, t3.id, anon, "Blair Soto", "blair@meridianwealth.com", #agent);
    let u3d = createUser(state, t3.id, anon, "Knox Adler", "knox@meridianwealth.com", #manager);
    ignore updateUser(state, u3a.id, u3a.name, u3a.email, u3a.role, #online);
    ignore updateUser(state, u3b.id, u3b.name, u3b.email, u3b.role, #online);
    ignore updateUser(state, u3c.id, u3c.name, u3c.email, u3c.role, #online);

    // Leads for tenant 3 (15 leads).
    let leadNames3 = [
      "Paxton Lee", "Marlow Quinn", "Sutton Reed", "Cleo Vance", "Remy Stone",
      "Indigo Park", "Atlas Ford", "Wells Cruz", "Nova Bell", "Onyx Hart",
      "Phoenix Cole", "Rowan Vale", "Sage Frost", "Tate Wells", "Vesper Lin",
    ];
    li := 0;
    for (name in leadNames3.vals()) {
      let status = statuses[li % statuses.size()];
      let source = sources[(li + 4) % sources.size()];
      let agentId : ?UserId = if (li % 2 == 0) { ?u3b.id } else { ?u3c.id };
      let premium = 3500 + li * 580;
      let phone = "+1-555-030" # (li.toText());
      let email = name.toLower().replace(#text " ", ".") # "@lead.com";
      ignore createLead(state, t3.id, name, phone, email, source, premium, agentId);
      let lastLeadId = state.nextLeadId - 1;
      ignore updateLead(state, lastLeadId, name, phone, email, source, premium, status, agentId);
      li += 1;
    };

    // AI interactions for tenant 3 (30 interactions). Every 3rd voice call
    // carries a voiceCall detail.
    ii := 0;
    while (ii < 30) {
      let leadId = (state.nextLeadId - 15) + (ii % 15);
      let it = interactionTypes[(ii + 2) % interactionTypes.size()];
      let oc = outcomes[(ii + 5) % outcomes.size()];
      let dur = if (it == #textMessage) { 0 } else { 60 + (ii * 13) % 720 };
      let summary = summaries[(ii + 4) % summaries.size()];
      if (it == #voiceCall and ii % 3 == 0) {
        let detail : CoreTypes.VoiceCallDetail = {
          callId = "seed-call-3-" # (ii.toText());
          status = #initiated;
          duration = dur;
        };
        ignore createVoiceCallInteraction(state, t3.id, leadId, ?u3c.id, oc, dur, summary, detail);
      } else {
        ignore createAiInteraction(state, t3.id, leadId, ?u3c.id, it, oc, dur, summary);
      };
      ii += 1;
    };

    ignore createSmsCampaign(state, t3.id, "High-Net-Worth Outreach", #newLeads, "Hello {name}, a Meridian advisor would like to discuss your portfolio. Reply to schedule.");
    let sc3 = state.nextCampaignId - 1;
    switch (state.smsCampaigns.get(sc3)) {
      case null {};
      case (?c) {
        state.smsCampaigns.add(sc3, { c with status = #scheduled; sentCount = 0; responseCount = 0 });
      };
    };
    ignore createVoiceCampaign(state, t3.id, "AI Concierge — Portfolio Review", #apptBooked, #apptBooked, voiceAgent("Meridian Concierge", "vapi", "vapi-premium-aria"));
    let vc3 = state.nextCampaignId - 1;
    switch (state.voiceCampaigns.get(vc3)) {
      case null {};
      case (?c) {
        state.voiceCampaigns.add(vc3, { c with status = #running; callsPlaced = 210; qualifiedTransfers = 52; minutesSaved = 156 });
      };
    };

    seedBilling(t3.id, #enterprise, 25000, 19840, [(3001, 2499, true), (3002, 2499, true), (3003, 2499, true), (3004, 2499, true), (3005, 2499, false)]);

    pushEvent(t3.id, #aiVoiceRouter, "[AI Voice Router] Concierge call — portfolio review qualified");
    pushEvent(t3.id, #aiTextSetter, "[AI Text Setter] High-net-worth appointment booked");
    pushEvent(t3.id, #aiDialer, "[AI Dialer] Outbound dial placed to qualified prospect");
    pushEvent(t3.id, #voiceCampaign, "[Voice Campaign] AI Concierge — Portfolio Review: 52 qualified transfers");
    pushEvent(t3.id, #sys, "[System] Tenant onboarded: Meridian Wealth Group");
  };
};
