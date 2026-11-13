import { Lock, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button, Callout, SectionTitle } from "../components/ui";
import { usd } from "../studio/calc";
import type { ApprovalTier, PricingRules } from "../studio/types";
import { CELL_LABEL, NumInput, OptNumInput, PctSlider, SelectField } from "./fields";
import { APPROVERS, newId } from "./helpers";

interface Props {
  rules: PricingRules;
  set: (patch: Partial<PricingRules>) => void;
}

const GRID = "grid grid-cols-2 gap-2 @md:grid-cols-[7.5rem_minmax(0,1fr)_6.5rem_2.5rem] @md:items-end";

const sortKey = (t: ApprovalTier) => t.upToValue ?? Infinity;

export default function DiscountSection({ rules, set }: Props) {
  const tiers = rules.approvalTiers;
  const sorted = [...tiers].sort((a, b) => sortKey(a) - sortKey(b));
  const catchAllCount = tiers.filter((t) => t.upToValue === null).length;

  const patch = (id: string, p: Partial<ApprovalTier>) => set({ approvalTiers: tiers.map((t) => (t.id === id ? { ...t, ...p } : t)) });

  const addTier = () => {
    const limits = tiers.filter((t) => t.upToValue !== null).map((t) => t.upToValue as number);
    const upTo = limits.length > 0 ? Math.max(...limits) * 2 : 10000;
    set({ approvalTiers: [...tiers, { id: newId("at"), upToValue: upTo, approver: "Sales manager" }] });
  };

  const addCatchAll = () => set({ approvalTiers: [...tiers, { id: newId("at"), upToValue: null, approver: "Director" }] });

  return (
    <div className="space-y-6">
      <PctSlider
        label="Maximum discount"
        value={rules.maxDiscountPct}
        onChange={(n) => set({ maxDiscountPct: n })}
        min={0}
        max={30}
        hint={`The largest discount a negotiator can offer without a warning. Above ${rules.maxDiscountPct}% the quotation needs a higher approver.`}
      />
      <PctSlider
        label="Early payment discount"
        value={rules.earlyPayDiscountPct}
        onChange={(n) => set({ earlyPayDiscountPct: n })}
        min={0}
        max={30}
        hint={`Offered to customers who pay in advance. It cannot be higher than the maximum discount of ${rules.maxDiscountPct}%.`}
      />
      <PctSlider
        label="Default advance payment"
        value={rules.advancePaymentPct}
        onChange={(n) => set({ advancePaymentPct: n })}
        min={0}
        max={100}
        step={1}
        hint={`Share of the order value paid before manufacturing starts. New quotations start with ${rules.advancePaymentPct}% advance.`}
      />

      <div className="space-y-3 border-t border-line pt-5">
        <SectionTitle
          title="Approval tiers"
          hint="The tier that covers the quotation value decides who approves. Tiers cannot overlap, and the last tier has no limit."
          action={
            <Button size="sm" icon={Plus} onClick={addTier}>
              Add tier
            </Button>
          }
        />

        {catchAllCount === 0 ? (
          <Callout tone="danger" icon={TriangleAlert} title="No top tier">
            <p>Every quotation value needs an approver. Add a tier with no upper limit.</p>
            <Button size="sm" className="mt-2" onClick={addCatchAll}>
              Add the top tier
            </Button>
          </Callout>
        ) : null}

        <div className={`hidden text-xs font-medium text-muted @md:grid ${GRID}`} aria-hidden="true">
          <span>Up to</span>
          <span>Approver</span>
          <span>Escalate below</span>
          <span />
        </div>

        <ol className="space-y-2">
          {sorted.map((t, i) => {
            const isTop = t.upToValue === null;
            const canRemove = tiers.length > 1 && (!isTop || catchAllCount > 1);
            const prev = i > 0 ? sorted[i - 1].upToValue : 0;
            return (
              <li key={t.id} className={`${GRID} rounded-control border border-line p-3 @md:border-0 @md:p-0`}>
                {isTop ? (
                  <div className="col-span-1">
                    <span className={CELL_LABEL}>Up to</span>
                    <div className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-control border border-line bg-surface-2 px-3 text-sm text-ink-2">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                      Up to: no limit
                    </div>
                  </div>
                ) : (
                  <NumInput label="Up to value in dollars" labelClass={CELL_LABEL} value={t.upToValue as number} min={0} prefix="$" onChange={(n) => patch(t.id, { upToValue: n })} />
                )}
                <SelectField label="Approver" labelClass={CELL_LABEL} value={t.approver} options={APPROVERS} onChange={(v) => patch(t.id, { approver: v })} />
                <OptNumInput
                  label="Escalate when margin below, optional"
                  labelClass={CELL_LABEL}
                  value={t.escalateBelowMarginPct}
                  min={0}
                  max={99}
                  suffix="%"
                  placeholder="None"
                  onChange={(n) => patch(t.id, { escalateBelowMarginPct: n })}
                />
                <div className="flex items-center justify-end @md:justify-center">
                  <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Remove tier ${i + 1}`} disabled={!canRemove} title={canRemove ? undefined : "The top tier cannot be removed"} onClick={() => set({ approvalTiers: tiers.filter((x) => x.id !== t.id) })} />
                </div>
                <p className="col-span-2 text-xs text-muted tabular-nums @md:col-span-4">
                  {isTop ? `Covers quotations above ${usd(prev ?? 0)}.` : `Covers ${usd(prev ?? 0)} up to and including ${usd(t.upToValue as number)}.`}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
