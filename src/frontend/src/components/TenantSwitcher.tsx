import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStrataFi } from "@/hooks/useStrataFi";
import { getInitials, titleCase } from "@/types";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { OnboardTenantModal } from "./OnboardTenantModal";

export function TenantSwitcher() {
  const { tenants, activeTenant, switchTenant } = useStrataFi();
  const [onboardOpen, setOnboardOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-ocid="tenant_switcher.dropdown_menu"
            className="flex items-center gap-2.5 px-3 h-9 rounded-md border border-border bg-input hover:border-primary/60 transition-colors min-w-0"
          >
            <span className="w-6 h-6 rounded bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
              {activeTenant ? getInitials(activeTenant.agencyName) || "—" : "—"}
            </span>
            <span className="flex flex-col items-start min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">
                Tenant
              </span>
              <span className="text-sm text-foreground font-medium truncate max-w-[140px]">
                {activeTenant?.agencyName ?? "No tenant"}
              </span>
            </span>
            <ChevronDown
              size={14}
              className="text-muted-foreground flex-shrink-0"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 bg-popover border-border text-popover-foreground"
        >
          <DropdownMenuLabel className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Switch Tenant
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          {tenants.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No tenants loaded.
            </div>
          )}
          {tenants.map((t, i) => {
            const isActive = activeTenant?.id === t.id;
            return (
              <DropdownMenuItem
                key={t.id.toString()}
                data-ocid={`tenant_switcher.item.${i + 1}`}
                onClick={() => void switchTenant(t.id)}
                className="flex items-center gap-2.5 cursor-pointer focus:bg-accent"
              >
                <span className="w-6 h-6 rounded bg-accent text-foreground flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
                  {getInitials(t.agencyName) || "?"}
                </span>
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm text-foreground truncate">
                    {t.agencyName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {t.primaryContact} · {titleCase(t.planTier)}
                  </span>
                </span>
                {isActive && (
                  <Check size={14} className="text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            data-ocid="tenant_switcher.open_modal_button"
            onClick={() => setOnboardOpen(true)}
            className="flex items-center gap-2.5 cursor-pointer focus:bg-accent text-primary"
          >
            <Plus size={14} className="flex-shrink-0" />
            <span className="text-sm font-medium">Onboard New Agency</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <OnboardTenantModal open={onboardOpen} onOpenChange={setOnboardOpen} />
    </>
  );
}

// Re-export the icon for the empty-state illustration in the sidebar.
export { Building2 };
