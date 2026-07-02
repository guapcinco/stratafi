import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export interface VoiceCallDetail {
    status: VoiceCallStatus;
    duration: bigint;
    callId: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface Tenant {
    id: TenantId;
    createdAt: Timestamp;
    agencyName: string;
    voiceAgent: VoiceAgentConfig;
    primaryContact: string;
    planTier: PlanTier;
}
export type LeadId = bigint;
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface Lead {
    id: LeadId;
    status: LeadStatus;
    source: LeadSource;
    name: string;
    createdAt: Timestamp;
    assignedAgentId?: UserId;
    email: string;
    tenantId: TenantId;
    updatedAt: Timestamp;
    annualPremiumValue: bigint;
    phone: string;
}
export interface InvoiceRecord {
    paid: boolean;
    invoiceId: bigint;
    issuedAt: Timestamp;
    amount: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface VoiceCallResult {
    status: Variant_initiated_failed;
    error?: string;
    callId: string;
}
export interface LiveEvent {
    id: bigint;
    source: LiveEventSource;
    createdAt: Timestamp;
    tenantId: TenantId;
    message: string;
}
export interface AiInteraction {
    id: InteractionId;
    interactionType: InteractionType;
    minutesSaved: bigint;
    createdAt: Timestamp;
    agentId?: UserId;
    tenantId: TenantId;
    summary: string;
    leadId: LeadId;
    durationSeconds: bigint;
    outcome: InteractionOutcome;
    voiceCall?: VoiceCallDetail;
}
export type TenantId = bigint;
export interface VoiceCampaign {
    id: CampaignId;
    status: CampaignStatus;
    minutesSaved: bigint;
    name: string;
    createdAt: Timestamp;
    tenantId: TenantId;
    voiceAgent: VoiceAgentConfig;
    qualifiedTransfers: bigint;
    targetStatus: LeadStatus;
    targetSegment: AudienceSegment;
    callsPlaced: bigint;
}
export interface User {
    id: UserId;
    status: UserStatus;
    principal: Principal;
    name: string;
    createdAt: Timestamp;
    role: Role;
    email: string;
    tenantId: TenantId;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface ColumnChartMetric {
    callsAi: bigint;
    apptsBooked: bigint;
    liveTransfers: bigint;
    smsSent: bigint;
    leadsSold: bigint;
}
export interface DashboardSummary {
    activeAgentsOnline: bigint;
    totalAgents: bigint;
    timeSavedByAiMinutes: bigint;
    totalLeads: bigint;
    activeAgentsPercentage: number;
}
export type CampaignId = bigint;
export interface SmsCampaign {
    id: CampaignId;
    status: CampaignStatus;
    messageTemplate: string;
    name: string;
    createdAt: Timestamp;
    sentCount: bigint;
    tenantId: TenantId;
    audienceSegment: AudienceSegment;
    responseCount: bigint;
}
export interface HttpHeader {
    value: string;
    name: string;
}
export interface VoiceAgentConfig {
    model: string;
    voiceProvider: string;
    voiceId: string;
    agentName: string;
    language: string;
    voiceSettings: string;
    apiKey: string;
    transferPhoneNumber: string;
}
export type UserId = bigint;
export type InteractionId = bigint;
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface BulkLeadInput {
    status?: LeadStatus;
    source?: LeadSource;
    name: string;
    assignedAgentId?: UserId;
    email?: string;
    annualPremiumValue?: bigint;
    phone: string;
}
export interface BulkImportResult {
    errors: Array<string>;
    createdIds: Array<bigint>;
}
export interface VoiceCallRequest {
    voiceId: string;
    task: string;
    tenantId: TenantId;
    language: string;
    leadId: LeadId;
    transferPhoneNumber: string;
}
export type BillingId = bigint;
export interface Billing {
    id: BillingId;
    includedMinutes: bigint;
    invoiceHistory: Array<InvoiceRecord>;
    tenantId: TenantId;
    updatedAt: Timestamp;
    planTier: PlanTier;
    usedMinutes: bigint;
}
export enum AudienceSegment {
    aiContacted = "aiContacted",
    liveTransferred = "liveTransferred",
    sold = "sold",
    allLeads = "allLeads",
    newLeads = "newLeads",
    apptBooked = "apptBooked"
}
export enum CampaignStatus {
    scheduled = "scheduled",
    completed = "completed",
    draft = "draft",
    running = "running",
    archived = "archived",
    paused = "paused"
}
export enum InteractionOutcome {
    noAnswer = "noAnswer",
    sent = "sent",
    booked = "booked",
    transferred = "transferred",
    replied = "replied",
    delivered = "delivered",
    failed = "failed",
    qualified = "qualified"
}
export enum InteractionType {
    liveTransfer = "liveTransfer",
    appointmentBooking = "appointmentBooking",
    textMessage = "textMessage",
    voiceCall = "voiceCall"
}
export enum LeadSource {
    referral = "referral",
    voiceCampaign = "voiceCampaign",
    webForm = "webForm",
    smsCampaign = "smsCampaign",
    aiDialer = "aiDialer",
    csvImport = "csvImport",
    inbound = "inbound",
    outbound = "outbound"
}
export enum LeadStatus {
    aiContacted = "aiContacted",
    liveTransferred = "liveTransferred",
    sold = "sold",
    apptBooked = "apptBooked",
    newLead = "newLead"
}
export enum LiveEventSource {
    sys = "sys",
    aiVoiceRouter = "aiVoiceRouter",
    voiceCampaign = "voiceCampaign",
    aiTextSetter = "aiTextSetter",
    smsCampaign = "smsCampaign",
    aiDialer = "aiDialer"
}
export enum PlanTier {
    growth = "growth",
    enterprise = "enterprise",
    starter = "starter",
    scale = "scale"
}
export enum Role {
    manager = "manager",
    admin = "admin",
    agent = "agent"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum UserStatus {
    away = "away",
    offline = "offline",
    online = "online"
}
export enum Variant_initiated_failed {
    initiated = "initiated",
    failed = "failed"
}
export enum VoiceCallStatus {
    initiated = "initiated",
    completed = "completed",
    failed = "failed"
}
export interface backendInterface {
    addInvoice(tenantId: TenantId, amount: bigint): Promise<Billing | null>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkImportLeads(tenantId: TenantId, inputs: Array<BulkLeadInput>): Promise<BulkImportResult>;
    createAiInteraction(tenantId: TenantId, leadId: LeadId, agentId: UserId | null, interactionType: InteractionType, outcome: InteractionOutcome, durationSeconds: bigint, summary: string): Promise<AiInteraction>;
    createLead(tenantId: TenantId, name: string, phone: string, email: string, source: LeadSource, annualPremiumValue: bigint, assignedAgentId: UserId | null): Promise<Lead>;
    createSmsCampaign(tenantId: TenantId, name: string, audienceSegment: AudienceSegment, messageTemplate: string): Promise<SmsCampaign>;
    createTenant(agencyName: string, primaryContact: string, planTier: PlanTier): Promise<Tenant>;
    createUser(tenantId: TenantId, principal: Principal, name: string, email: string, role: Role): Promise<User>;
    createVoiceCampaign(tenantId: TenantId, name: string, targetSegment: AudienceSegment, targetStatus: LeadStatus, voiceAgent: VoiceAgentConfig): Promise<VoiceCampaign>;
    deleteAiInteraction(id: InteractionId): Promise<boolean>;
    deleteLead(id: LeadId): Promise<boolean>;
    deleteSmsCampaign(id: CampaignId): Promise<boolean>;
    deleteTenant(id: TenantId): Promise<boolean>;
    deleteUser(id: UserId): Promise<boolean>;
    deleteVoiceCampaign(id: CampaignId): Promise<boolean>;
    getAiInteraction(id: InteractionId): Promise<AiInteraction | null>;
    getBilling(tenantId: TenantId): Promise<Billing | null>;
    getCallerUserRole(): Promise<UserRole>;
    getColumnChartMetrics(tenantId: TenantId): Promise<ColumnChartMetric>;
    getDashboardSummary(tenantId: TenantId): Promise<DashboardSummary>;
    getLead(id: LeadId): Promise<Lead | null>;
    getLiveEventStream(tenantId: TenantId, limit: bigint): Promise<Array<LiveEvent>>;
    getSmsCampaign(id: CampaignId): Promise<SmsCampaign | null>;
    getTenant(id: TenantId): Promise<Tenant | null>;
    getUser(id: UserId): Promise<User | null>;
    getVoiceCampaign(id: CampaignId): Promise<VoiceCampaign | null>;
    isCallerAdmin(): Promise<boolean>;
    launchVoiceCampaign(tenantId: TenantId, campaignId: CampaignId): Promise<Array<VoiceCallResult>>;
    listAiInteractionsByLead(leadId: LeadId): Promise<Array<AiInteraction>>;
    listAiInteractionsByTenant(tenantId: TenantId): Promise<Array<AiInteraction>>;
    listLeadsByStatus(tenantId: TenantId, status: LeadStatus): Promise<Array<Lead>>;
    listLeadsByTenant(tenantId: TenantId): Promise<Array<Lead>>;
    listSmsCampaignsByTenant(tenantId: TenantId): Promise<Array<SmsCampaign>>;
    listTenants(): Promise<Array<Tenant>>;
    listUsersByTenant(tenantId: TenantId): Promise<Array<User>>;
    listVoiceCampaignsByTenant(tenantId: TenantId): Promise<Array<VoiceCampaign>>;
    placeVoiceCall(request: VoiceCallRequest): Promise<VoiceCallResult>;
    recordBillingUsage(tenantId: TenantId, usedMinutesDelta: bigint): Promise<Billing | null>;
    seedMockData(): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateAiInteraction(id: InteractionId, outcome: InteractionOutcome, durationSeconds: bigint, summary: string): Promise<AiInteraction | null>;
    updateBillingPlan(tenantId: TenantId, planTier: PlanTier, includedMinutes: bigint): Promise<Billing | null>;
    updateLead(id: LeadId, name: string, phone: string, email: string, source: LeadSource, annualPremiumValue: bigint, status: LeadStatus, assignedAgentId: UserId | null): Promise<Lead | null>;
    updateSmsCampaign(id: CampaignId, name: string, status: CampaignStatus, audienceSegment: AudienceSegment, messageTemplate: string): Promise<SmsCampaign | null>;
    updateTenant(id: TenantId, agencyName: string, primaryContact: string, planTier: PlanTier, voiceAgent: VoiceAgentConfig): Promise<Tenant | null>;
    updateUser(id: UserId, name: string, email: string, role: Role, status: UserStatus): Promise<User | null>;
    updateVoiceCampaign(id: CampaignId, name: string, status: CampaignStatus, targetSegment: AudienceSegment, targetStatus: LeadStatus, voiceAgent: VoiceAgentConfig): Promise<VoiceCampaign | null>;
}
