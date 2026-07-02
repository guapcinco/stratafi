import { useStrataFi } from "@/hooks/useStrataFi";
import { getInitials, titleCase } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  BarChart3,
  Building2,
  CreditCard,
  Headphones,
  KanbanSquare,
  MessageSquare,
  Phone,
  Settings,
  UserSquare2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

type OfficeMode = "front" | "back";

interface NavItem {
  to: string;
  label: string;
  icon: typeof BarChart3;
  office: OfficeMode | "both";
}

const NAV_ITEMS: NavItem[] = [
  { to: "/team-stats", label: "Team Stats", icon: BarChart3, office: "front" },
  {
    to: "/agent-performance",
    label: "Agent Performance",
    icon: Users,
    office: "front",
  },
  {
    to: "/conversations",
    label: "Conversations",
    icon: MessageSquare,
    office: "front",
  },
  { to: "/leads", label: "Leads", icon: UserSquare2, office: "front" },
  {
    to: "/pipeline",
    label: "Pipeline",
    icon: KanbanSquare,
    office: "front",
  },
  {
    to: "/sms-campaigns",
    label: "SMS Campaigns",
    icon: MessageSquare,
    office: "back",
  },
  {
    to: "/voice-campaigns",
    label: "Voice Campaigns",
    icon: Phone,
    office: "back",
  },
  { to: "/billing", label: "Billing", icon: CreditCard, office: "back" },
  { to: "/settings", label: "Settings", icon: Settings, office: "back" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clear, isAuthenticated, identity } = useInternetIdentity();
  const { activeTenant } = useStrataFi();
  const [office, setOffice] = useState<OfficeMode>("front");

  // Show all 7 items; the toggle changes emphasis (front items get the green
  // accent, back items get the blue accent) and reorders so the active office
  // group sits on top.
  const ordered =
    office === "front"
      ? [...NAV_ITEMS].sort((a, b) => {
          const aFront = a.office === "front" || a.office === "both";
          const bFront = b.office === "front" || b.office === "both";
          if (aFront === bFront) return 0;
          return aFront ? -1 : 1;
        })
      : [...NAV_ITEMS].sort((a, b) => {
          const aBack = a.office === "back" || a.office === "both";
          const bBack = b.office === "back" || b.office === "both";
          if (aBack === bBack) return 0;
          return aBack ? -1 : 1;
        });

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  function handleLogout() {
    clear();
    navigate("/landing");
  }

  const principalText =
    isAuthenticated && identity
      ? `${identity.getPrincipal().toText().slice(0, 8)}…`
      : "anonymous";

  return (
    <aside className="crm-sidebar flex flex-col w-60 h-full flex-shrink-0">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center flex-shrink-0 glow-green">
          <Building2 size={16} className="text-primary" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-display font-bold text-foreground text-base tracking-tight">
            StrataFi
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-[0.18em] font-mono">
            Agency OS
          </span>
        </div>
      </div>

      {/* Front / Back Office toggle */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-accent border border-border">
          <button
            type="button"
            data-ocid="sidebar.office.front.toggle"
            onClick={() => setOffice("front")}
            className={`h-7 rounded text-xs font-medium transition-colors ${
              office === "front"
                ? "bg-primary text-primary-foreground glow-green"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Front Office
          </button>
          <button
            type="button"
            data-ocid="sidebar.office.back.toggle"
            onClick={() => setOffice("back")}
            className={`h-7 rounded text-xs font-medium transition-colors ${
              office === "back"
                ? "bg-secondary text-secondary-foreground glow-blue"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Back Office
          </button>
        </div>
        <div className="mt-2 px-1 text-[9px] text-muted-foreground uppercase tracking-wider font-mono">
          {office === "front" ? "Live operations" : "Campaigns & admin"}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {ordered.map((item) => {
          const active = isActive(item.to);
          const isFront = item.office === "front" || item.office === "both";
          const accent = isFront ? "text-primary" : "text-secondary";
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "_")}.link`}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-foreground border-l-2 border-primary pl-[10px]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              }`}
            >
              <item.icon
                size={15}
                className={`flex-shrink-0 ${active ? accent : ""}`}
              />
              <span className="truncate">{item.label}</span>
              {active && (
                <span
                  className={`ml-auto w-1.5 h-1.5 rounded-full ${
                    isFront ? "bg-primary" : "bg-secondary"
                  }`}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Active tenant footer */}
      <div className="px-3 py-3 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md bg-accent/50 border border-border">
          <span className="w-7 h-7 rounded bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
            {activeTenant ? getInitials(activeTenant.agencyName) || "—" : "—"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-foreground text-xs font-medium truncate">
              {activeTenant?.agencyName ?? "No tenant"}
            </div>
            <div className="text-muted-foreground text-[10px] truncate font-mono">
              {activeTenant ? titleCase(activeTenant.planTier) : "—"}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 px-2">
          <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">
            {principalText}
          </span>
          <button
            type="button"
            data-ocid="sidebar.logout.button"
            onClick={handleLogout}
            title="Log out"
            className="text-muted-foreground hover:text-foreground transition-colors text-[10px] font-mono uppercase tracking-wider"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
