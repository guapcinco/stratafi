import { useStrataFiContext } from "@/AppContext";
import { createActor } from "@/backend";
import type { LiveEvent, TenantId } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect, useRef, useState } from "react";

/**
 * Typed accessor for the StrataFi global context. Pages and components should
 * import this hook (not the raw context) so the API surface stays stable.
 */
export function useStrataFi() {
  return useStrataFiContext();
}

/**
 * Direct actor accessor for pages that need to call mutating backend methods
 * (e.g. updateTenant, updateBillingPlan) outside the context's refresh cycle.
 * Returns the same `{ actor, isFetching }` pair as the infrastructure hook.
 */
export function useStrataFiActor() {
  return useActor(createActor);
}

/**
 * Continuous live-event stream polling hook.
 *
 * Polls `getLiveEventStream` for the given tenant every `intervalMs`
 * milliseconds and merges new events into the head of the list. Stops polling
 * when the tenant changes or the component unmounts. Honors a manual refresh
 * callback so the sidebar / dashboard can share one stream.
 */
export function useLiveEventStream(
  tenantId: TenantId | null,
  intervalMs = 4000,
): {
  events: LiveEvent[];
  lastUpdated: Date | null;
} {
  const { refreshLiveEvents, liveEvents } = useStrataFiContext();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (tenantId === null) return;
    // Immediate first poll.
    void refreshLiveEvents().then(() => setLastUpdated(new Date()));

    timerRef.current = setInterval(async () => {
      await refreshLiveEvents();
      setLastUpdated(new Date());
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [tenantId, intervalMs, refreshLiveEvents]);

  return { events: liveEvents, lastUpdated };
}
