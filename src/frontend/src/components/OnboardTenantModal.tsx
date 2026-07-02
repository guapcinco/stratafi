import { PlanTier } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStrataFi } from "@/hooks/useStrataFi";
import { useState } from "react";
import { toast } from "sonner";

interface OnboardTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_OPTIONS: { value: PlanTier; label: string; minutes: string }[] = [
  { value: PlanTier.starter, label: "Starter", minutes: "1,000 min" },
  { value: PlanTier.growth, label: "Growth", minutes: "5,000 min" },
  { value: PlanTier.scale, label: "Scale", minutes: "15,000 min" },
  { value: PlanTier.enterprise, label: "Enterprise", minutes: "50,000 min" },
];

export function OnboardTenantModal({
  open,
  onOpenChange,
}: OnboardTenantModalProps) {
  const { createTenant } = useStrataFi();
  const [agencyName, setAgencyName] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");
  const [planTier, setPlanTier] = useState<PlanTier>(PlanTier.growth);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAgencyName("");
    setPrimaryContact("");
    setPlanTier(PlanTier.growth);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyName.trim() || !primaryContact.trim()) {
      toast.error("Agency name and primary contact are required.");
      return;
    }
    setSubmitting(true);
    try {
      const t = await createTenant(
        agencyName.trim(),
        primaryContact.trim(),
        planTier,
      );
      if (t) {
        toast.success(`Onboarded ${t.agencyName}`);
        reset();
        onOpenChange(false);
      } else {
        toast.error("Failed to onboard agency.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="onboard_tenant.dialog"
        className="bg-card border-border text-foreground sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Onboard New Agency
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new tenant. All dashboard data will be scoped to this
            agency once activated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="agency-name"
              className="text-foreground text-xs font-medium"
            >
              Agency Name
            </Label>
            <Input
              id="agency-name"
              data-ocid="onboard_tenant.agency_name.input"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="e.g. Apex Insurance Group"
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="primary-contact"
              className="text-foreground text-xs font-medium"
            >
              Primary Contact
            </Label>
            <Input
              id="primary-contact"
              data-ocid="onboard_tenant.primary_contact.input"
              value={primaryContact}
              onChange={(e) => setPrimaryContact(e.target.value)}
              placeholder="e.g. Jordan Lee / jordan@apexins.com"
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground text-xs font-medium">
              Plan Tier
            </Label>
            <Select
              value={planTier}
              onValueChange={(v) => setPlanTier(v as PlanTier)}
            >
              <SelectTrigger
                data-ocid="onboard_tenant.plan_tier.select"
                className="w-full bg-input border-border text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {PLAN_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    data-ocid={`onboard_tenant.plan_tier.${opt.value}.item`}
                  >
                    <span className="flex items-center justify-between w-full">
                      <span>{opt.label}</span>
                      <span className="text-muted-foreground text-xs ml-2 font-mono">
                        {opt.minutes}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              data-ocid="onboard_tenant.cancel_button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="onboard_tenant.submit_button"
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green"
            >
              {submitting ? "Onboarding…" : "Onboard Agency"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
