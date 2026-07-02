import { useStrataFi } from "@/hooks/useStrataFi";
import { getInitials } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useLocation } from "react-router-dom";
import { TenantSwitcher } from "./TenantSwitcher";

const ROUTE_TITLES: Record<string, string> = {
  "/team-stats": "Team Stats",
  "/agent-performance": "Agent Performance",
  "/conversations": "Conversations",
  "/leads": "Leads",
  "/leads/:id": "Lead Detail",
  "/pipeline": "Pipeline",
  "/sms-campaigns": "SMS Campaigns",
  "/voice-campaigns": "Voice Campaigns",
  "/billing": "Billing",
  "/settings": "Settings",
};

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // /leads/:id dynamic route — show "Lead Detail" for any sub-path.
  if (pathname.startsWith("/leads/")) return "Lead Detail";
  return "StrataFi";
}

export function TopBar() {
  const location = useLocation();
  const title = getTitle(location.pathname);
  const { isAuthenticated } = useInternetIdentity();
  const { bootstrapping } = useStrataFi();

  const signedIn = isAuthenticated;
  const userName = signedIn ? "Operator" : "Guest";

  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-display text-lg font-semibold text-foreground truncate">
          {title}
        </h1>
        {bootstrapping && (
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider animate-pulse">
            bootstrapping…
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TenantSwitcher />

        <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-border">
          <span className="w-8 h-8 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center text-xs font-bold text-secondary font-mono">
            {getInitials(userName)}
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-xs text-foreground font-medium">
              {userName}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {signedIn ? "authenticated" : "anonymous"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
