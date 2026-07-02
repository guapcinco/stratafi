import { createActor } from "@/backend";
import type {
  AiInteraction,
  Billing,
  BulkImportResult,
  BulkLeadInput,
  CampaignId,
  ColumnChartMetric,
  DashboardSummary,
  Lead,
  LeadId,
  LeadSource,
  LeadStatus,
  LiveEvent,
  PlanTier,
  SmsCampaign,
  Tenant,
  TenantId,
  User,
  UserId,
  VoiceCallRequest,
  VoiceCallResult,
  VoiceCampaign,
} from "@/backend";
import { PlanTier as PlanTierEnum } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * StrataFi global context.
 *
 * Holds the active tenant, the list of tenants, and all entity state scoped
 * to the active tenant. On mount it seeds mock data, loads tenants, and
 * activates the first tenant. `refreshAll(tenantId)` reloads every entity for
 * a tenant; `switchTenant(tenantId)` changes the active tenant and refreshes;
 * `createTenant(...)` onboards a new agency.
 */
export interface StrataFiState {
  // tenant scope
  tenants: Tenant[];
  activeTenantId: TenantId | null;
  activeTenant: Tenant | null;

  // entity state (scoped to active tenant)
  users: User[];
  leads: Lead[];
  aiInteractions: AiInteraction[];
  smsCampaigns: SmsCampaign[];
  voiceCampaigns: VoiceCampaign[];
  billing: Billing | null;
  dashboardSummary: DashboardSummary | null;
  columnChartMetrics: ColumnChartMetric | null;
  liveEvents: LiveEvent[];

  // lifecycle flags
  loading: boolean;
  bootstrapping: boolean;

  // actions
  refreshAll: (tenantId: TenantId) => Promise<void>;
  switchTenant: (tenantId: TenantId) => Promise<void>;
  createTenant: (
    agencyName: string,
    primaryContact: string,
    planTier: PlanTier,
  ) => Promise<Tenant | null>;
  refreshTenants: () => Promise<void>;
  refreshLiveEvents: () => Promise<void>;
  createLead: (
    tenantId: TenantId,
    name: string,
    phone: string,
    email: string,
    source: LeadSource,
    annualPremiumValue: number,
    assignedAgentId: UserId | null,
  ) => Promise<Lead | null>;
  updateLead: (
    id: LeadId,
    name: string,
    phone: string,
    email: string,
    source: LeadSource,
    annualPremiumValue: number,
    status: LeadStatus,
    assignedAgentId: UserId | null,
  ) => Promise<Lead | null>;
  deleteLead: (id: LeadId) => Promise<boolean>;
  bulkImportLeads: (
    tenantId: TenantId,
    inputs: BulkLeadInput[],
  ) => Promise<BulkImportResult | null>;
  placeVoiceCall: (
    request: VoiceCallRequest,
  ) => Promise<VoiceCallResult | null>;
  launchVoiceCampaign: (
    tenantId: TenantId,
    campaignId: CampaignId,
  ) => Promise<VoiceCallResult[] | null>;
}

const AppContext = createContext<StrataFiState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { actor, isFetching } = useActor(createActor);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<TenantId | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [aiInteractions, setAiInteractions] = useState<AiInteraction[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<SmsCampaign[]>([]);
  const [voiceCampaigns, setVoiceCampaigns] = useState<VoiceCampaign[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [dashboardSummary, setDashboardSummary] =
    useState<DashboardSummary | null>(null);
  const [columnChartMetrics, setColumnChartMetrics] =
    useState<ColumnChartMetric | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const seededRef = useRef(false);
  const activeRef = useRef<TenantId | null>(null);

  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? null;

  const refreshTenants = useCallback(async () => {
    if (!actor) return;
    try {
      const list = await actor.listTenants();
      list.sort((a, b) => Number(a.createdAt - b.createdAt));
      setTenants(list);
    } catch {
      /* ignore */
    }
  }, [actor]);

  const refreshAll = useCallback(
    async (tenantId: TenantId) => {
      if (!actor) return;
      activeRef.current = tenantId;
      setLoading(true);
      try {
        const [u, l, ai, sms, voice, bill, summary, chart, events] =
          await Promise.all([
            actor.listUsersByTenant(tenantId),
            actor.listLeadsByTenant(tenantId),
            actor.listAiInteractionsByTenant(tenantId),
            actor.listSmsCampaignsByTenant(tenantId),
            actor.listVoiceCampaignsByTenant(tenantId),
            actor.getBilling(tenantId),
            actor.getDashboardSummary(tenantId),
            actor.getColumnChartMetrics(tenantId),
            actor.getLiveEventStream(tenantId, 25n),
          ]);
        // Guard against a tenant switch racing this load.
        if (activeRef.current !== tenantId) return;
        setUsers(u);
        setLeads(l);
        setAiInteractions(ai);
        setSmsCampaigns(sms);
        setVoiceCampaigns(voice);
        setBilling(bill);
        setDashboardSummary(summary);
        setColumnChartMetrics(chart);
        setLiveEvents(events);
      } catch {
        /* ignore */
      } finally {
        if (activeRef.current === tenantId) setLoading(false);
      }
    },
    [actor],
  );

  const refreshLiveEvents = useCallback(async () => {
    if (!actor || activeTenantId === null) return;
    try {
      const events = await actor.getLiveEventStream(activeTenantId, 25n);
      // Only commit if still on the same tenant.
      if (activeRef.current === activeTenantId) setLiveEvents(events);
    } catch {
      /* ignore */
    }
  }, [actor, activeTenantId]);

  const switchTenant = useCallback(
    async (tenantId: TenantId) => {
      if (activeTenantId === tenantId) return;
      setActiveTenantId(tenantId);
      await refreshAll(tenantId);
    },
    [activeTenantId, refreshAll],
  );

  const createTenant = useCallback(
    async (
      agencyName: string,
      primaryContact: string,
      planTier: PlanTier,
    ): Promise<Tenant | null> => {
      if (!actor) return null;
      try {
        const t = await actor.createTenant(
          agencyName,
          primaryContact,
          planTier,
        );
        await refreshTenants();
        // Activate the newly created tenant.
        await switchTenant(t.id);
        return t;
      } catch {
        return null;
      }
    },
    [actor, refreshTenants, switchTenant],
  );

  const refreshLeads = useCallback(async () => {
    if (!actor || activeTenantId === null) return;
    try {
      const l = await actor.listLeadsByTenant(activeTenantId);
      if (activeRef.current === activeTenantId) setLeads(l);
    } catch {
      /* ignore */
    }
  }, [actor, activeTenantId]);

  const createLead = useCallback(
    async (
      tenantId: TenantId,
      name: string,
      phone: string,
      email: string,
      source: LeadSource,
      annualPremiumValue: number,
      assignedAgentId: UserId | null,
    ): Promise<Lead | null> => {
      if (!actor) return null;
      try {
        const lead = await actor.createLead(
          tenantId,
          name,
          phone,
          email,
          source,
          BigInt(annualPremiumValue),
          assignedAgentId,
        );
        await refreshLeads();
        return lead;
      } catch {
        return null;
      }
    },
    [actor, refreshLeads],
  );

  const updateLead = useCallback(
    async (
      id: LeadId,
      name: string,
      phone: string,
      email: string,
      source: LeadSource,
      annualPremiumValue: number,
      status: LeadStatus,
      assignedAgentId: UserId | null,
    ): Promise<Lead | null> => {
      if (!actor) return null;
      try {
        const lead = await actor.updateLead(
          id,
          name,
          phone,
          email,
          source,
          BigInt(annualPremiumValue),
          status,
          assignedAgentId,
        );
        await refreshLeads();
        return lead;
      } catch {
        return null;
      }
    },
    [actor, refreshLeads],
  );

  const deleteLead = useCallback(
    async (id: LeadId): Promise<boolean> => {
      if (!actor) return false;
      try {
        await actor.deleteLead(id);
        await refreshLeads();
        return true;
      } catch {
        return false;
      }
    },
    [actor, refreshLeads],
  );

  const bulkImportLeads = useCallback(
    async (
      tenantId: TenantId,
      inputs: BulkLeadInput[],
    ): Promise<BulkImportResult | null> => {
      if (!actor) return null;
      try {
        const result = await actor.bulkImportLeads(tenantId, inputs);
        await refreshLeads();
        return result;
      } catch {
        return null;
      }
    },
    [actor, refreshLeads],
  );

  const placeVoiceCall = useCallback(
    async (request: VoiceCallRequest): Promise<VoiceCallResult | null> => {
      if (!actor) return null;
      try {
        const result = await actor.placeVoiceCall(request);
        await refreshAll(activeTenantId ?? request.tenantId);
        await refreshLiveEvents();
        return result;
      } catch {
        return null;
      }
    },
    [actor, activeTenantId, refreshAll, refreshLiveEvents],
  );

  const launchVoiceCampaign = useCallback(
    async (
      tenantId: TenantId,
      campaignId: CampaignId,
    ): Promise<VoiceCallResult[] | null> => {
      if (!actor) return null;
      try {
        const results = await actor.launchVoiceCampaign(tenantId, campaignId);
        await refreshAll(tenantId);
        await refreshLiveEvents();
        return results;
      } catch {
        return null;
      }
    },
    [actor, refreshAll, refreshLiveEvents],
  );

  // Bootstrap: seed mock data once, then load tenants + activate first.
  useEffect(() => {
    if (!actor || isFetching || seededRef.current) return;
    let cancelled = false;
    (async () => {
      seededRef.current = true;
      setBootstrapping(true);
      try {
        await actor.seedMockData();
        if (cancelled) return;
        await refreshTenants();
        if (cancelled) return;
        setTenants((prev) => {
          const first = prev[0];
          if (first) {
            setActiveTenantId(first.id);
            // Kick off the first tenant load.
            void refreshAll(first.id);
          }
          return prev;
        });
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, refreshTenants, refreshAll]);

  const value: StrataFiState = {
    tenants,
    activeTenantId,
    activeTenant,
    users,
    leads,
    aiInteractions,
    smsCampaigns,
    voiceCampaigns,
    billing,
    dashboardSummary,
    columnChartMetrics,
    liveEvents,
    loading,
    bootstrapping,
    refreshAll,
    switchTenant,
    createTenant,
    refreshTenants,
    refreshLiveEvents,
    createLead,
    updateLead,
    deleteLead,
    bulkImportLeads,
    placeVoiceCall,
    launchVoiceCampaign,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useStrataFiContext(): StrataFiState {
  const ctx = useContext(AppContext);
  if (!ctx)
    throw new Error("useStrataFiContext must be used inside <AppProvider>");
  return ctx;
}

export { PlanTierEnum };
