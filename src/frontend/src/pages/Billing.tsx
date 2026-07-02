import { PlanTier } from "@/backend";
import { EmptyState, MetricCard, SectionCard } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStrataFi, useStrataFiActor } from "@/hooks/useStrataFi";
import {
  bigToNum,
  formatInt,
  formatMinutes,
  formatUsd,
  nsToDate,
  titleCase,
} from "@/types";
import { Check, CreditCard, DollarSign, FileText, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLAN_MINUTES: Record<PlanTier, bigint> = {
  [PlanTier.starter]: 1000n,
  [PlanTier.growth]: 5000n,
  [PlanTier.scale]: 15000n,
  [PlanTier.enterprise]: 50000n,
};

const PLAN_PRICE: Record<PlanTier, string> = {
  [PlanTier.starter]: "$199",
  [PlanTier.growth]: "$499",
  [PlanTier.scale]: "$1,199",
  [PlanTier.enterprise]: "Custom",
};

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  [PlanTier.starter]: [
    "1,000 AI minutes / cycle",
    "Up to 3 team members",
    "Voice + SMS campaigns",
    "Live event stream",
    "Email support",
  ],
  [PlanTier.growth]: [
    "5,000 AI minutes / cycle",
    "Up to 10 team members",
    "Voice + SMS campaigns",
    "AI voice routing",
    "Priority support",
  ],
  [PlanTier.scale]: [
    "15,000 AI minutes / cycle",
    "Up to 25 team members",
    "Advanced audience segments",
    "AI text booking setter",
    "Dedicated success manager",
  ],
  [PlanTier.enterprise]: [
    "50,000+ AI minutes / cycle",
    "Unlimited team members",
    "Custom voice agents",
    "SSO + audit logs",
    "24/7 phone support",
  ],
};

const PLAN_ORDER: PlanTier[] = [
  PlanTier.starter,
  PlanTier.growth,
  PlanTier.scale,
  PlanTier.enterprise,
];

export function Billing() {
  const { billing, activeTenant, loading, bootstrapping, refreshAll } =
    useStrataFi();
  const { actor } = useStrataFiActor();
  const [newPlan, setNewPlan] = useState<PlanTier>(
    billing?.planTier ?? PlanTier.growth,
  );
  const [updating, setUpdating] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<PlanTier | null>(null);

  if (bootstrapping || loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="crm-card p-5 h-24 bg-accent/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="space-y-6 fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Billing
        </h2>
        <SectionCard title="Billing Account">
          <EmptyState
            message="No billing account found for this tenant."
            hint="onboard a tenant to provision billing"
          />
        </SectionCard>
      </div>
    );
  }

  const used = bigToNum(billing.usedMinutes);
  const included = bigToNum(billing.includedMinutes);
  const usagePct = included > 0 ? Math.min(100, (used / included) * 100) : 0;
  const remaining = Math.max(0, included - used);
  const overage = used > included ? used - included : 0;
  const currentPlan = billing.planTier;

  async function handleUpdatePlan() {
    if (!activeTenant || !actor) return;
    setUpdating(true);
    try {
      const updated = await actor.updateBillingPlan(
        activeTenant.id,
        newPlan,
        PLAN_MINUTES[newPlan],
      );
      if (updated) {
        toast.success(`Plan updated to ${titleCase(newPlan)}`);
        await refreshAll(activeTenant.id);
      } else {
        toast.error("Failed to update plan.");
      }
    } catch {
      toast.error("Failed to update plan.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleSwitchPlan(plan: PlanTier) {
    if (!activeTenant || !actor || plan === currentPlan) return;
    setSwitchingTo(plan);
    try {
      const updated = await actor.updateBillingPlan(
        activeTenant.id,
        plan,
        PLAN_MINUTES[plan],
      );
      if (updated) {
        toast.success(`Switched to ${titleCase(plan)}`);
        setNewPlan(plan);
        await refreshAll(activeTenant.id);
      } else {
        toast.error("Failed to switch plan.");
      }
    } catch {
      toast.error("Failed to switch plan.");
    } finally {
      setSwitchingTo(null);
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Billing
        </h2>
        <p className="text-muted-foreground text-sm">
          {activeTenant?.agencyName ?? "—"} · plan & usage
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Current Plan"
          value={titleCase(billing.planTier)}
          sub={activeTenant?.primaryContact}
          icon={<Zap size={18} className="text-primary" />}
          accent="green"
        />
        <MetricCard
          label="Included Minutes"
          value={formatInt(billing.includedMinutes)}
          sub="per cycle"
          icon={<CreditCard size={18} className="text-secondary" />}
          accent="blue"
        />
        <MetricCard
          label="Used Minutes"
          value={formatInt(billing.usedMinutes)}
          sub={`${Math.round(usagePct)}% used`}
          icon={<DollarSign size={18} className="text-primary" />}
          accent="green"
          alert={overage > 0}
        />
        <MetricCard
          label="Remaining"
          value={formatMinutes(remaining)}
          sub={overage > 0 ? `${overage} overage` : "within plan"}
          icon={<DollarSign size={18} className="text-secondary" />}
          accent="blue"
        />
      </div>

      {/* Plan-tier comparison cards */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-foreground">
            Available Plans
          </h3>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            compare tiers
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLAN_ORDER.map((plan, i) => {
            const isCurrent = plan === billing.planTier;
            const features = PLAN_FEATURES[plan];
            const minutes = PLAN_MINUTES[plan];
            const price = PLAN_PRICE[plan];
            const isSwitching = switchingTo === plan;
            return (
              <div
                key={plan}
                data-ocid={`billing.plan_card.${i + 1}`}
                className={`crm-card p-5 flex flex-col transition-all duration-200 ${
                  isCurrent
                    ? "border-primary/60 glow-green"
                    : "hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div
                      className={`text-xs font-mono uppercase tracking-wider ${
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {titleCase(plan)}
                    </div>
                    <div className="text-2xl font-bold font-display text-foreground mt-1">
                      {price}
                      <span className="text-xs text-muted-foreground font-body font-normal">
                        /mo
                      </span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-primary/40 bg-primary/15 text-primary">
                      current
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
                  <Zap
                    size={14}
                    className={isCurrent ? "text-primary" : "text-secondary"}
                  />
                  <span className="text-sm text-foreground font-mono">
                    {formatInt(minutes)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                    minutes
                  </span>
                </div>

                <ul className="space-y-2 flex-1">
                  {features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs text-foreground"
                    >
                      <Check
                        size={13}
                        className={`mt-0.5 flex-shrink-0 ${
                          isCurrent ? "text-primary" : "text-secondary"
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 mt-4">
                  {isCurrent ? (
                    <Button
                      type="button"
                      disabled
                      data-ocid={`billing.current_plan.${plan}.button`}
                      className="w-full bg-primary/15 border border-primary/40 text-primary hover:bg-primary/15 cursor-default"
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      data-ocid={`billing.switch_to.${plan}.button`}
                      onClick={() => void handleSwitchPlan(plan)}
                      disabled={isSwitching}
                      className="w-full bg-accent border border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary/40 transition-colors"
                    >
                      {isSwitching
                        ? "Switching…"
                        : `Switch to ${titleCase(plan)}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage bar */}
        <SectionCard title="Usage This Cycle" className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Minutes consumed</span>
              <span className="text-foreground font-mono">
                {formatInt(used)} / {formatInt(included)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-accent overflow-hidden border border-border">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overage > 0 ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>
                last updated: {nsToDate(billing.updatedAt).toLocaleString()}
              </span>
              {overage > 0 && (
                <span className="text-destructive">
                  {overage} minutes over plan
                </span>
              )}
            </div>
          </div>

          {/* Plan updater */}
          <div className="mt-6 pt-5 border-t border-border">
            <h3 className="text-sm text-foreground font-medium mb-3">
              Change Plan
            </h3>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1.5">
                <label
                  htmlFor="billing-plan-tier"
                  className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono"
                >
                  New Plan
                </label>
                <Select
                  value={newPlan}
                  onValueChange={(v) => setNewPlan(v as PlanTier)}
                >
                  <SelectTrigger
                    id="billing-plan-tier"
                    data-ocid="billing.plan_tier.select"
                    className="w-48 bg-input border-border text-foreground"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {(Object.keys(PLAN_MINUTES) as PlanTier[]).map((p) => (
                      <SelectItem
                        key={p}
                        value={p}
                        data-ocid={`billing.plan_tier.${p}.item`}
                      >
                        {titleCase(p)} · {formatInt(PLAN_MINUTES[p])} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                data-ocid="billing.update_plan.submit_button"
                onClick={handleUpdatePlan}
                disabled={updating || newPlan === billing.planTier}
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green"
              >
                {updating ? "Updating…" : "Update Plan"}
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Invoice history */}
        <SectionCard
          title="Invoice History"
          action={<FileText size={14} className="text-muted-foreground" />}
        >
          {billing.invoiceHistory.length === 0 ? (
            <EmptyState message="No invoices yet." />
          ) : (
            <div className="space-y-2">
              {billing.invoiceHistory
                .slice()
                .sort((a, b) => Number(b.issuedAt - a.issuedAt))
                .map((inv, i) => (
                  <div
                    key={inv.invoiceId.toString()}
                    data-ocid={`invoice.item.${i + 1}`}
                    className="flex items-center justify-between px-3 py-2 rounded-md bg-accent/40 border border-border"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground font-mono">
                        #{inv.invoiceId.toString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {nsToDate(inv.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground font-mono">
                        {formatUsd(inv.amount)}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          inv.paid
                            ? "text-primary border-primary/30 bg-primary/10"
                            : "text-destructive border-destructive/30 bg-destructive/10"
                        }`}
                      >
                        {inv.paid ? "paid" : "due"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
