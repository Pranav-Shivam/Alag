import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Card, Chip } from "../components/ui";
import type { Tone } from "../components/ui";
import { approverFor, grossProfit, sellingPrice, usd } from "../studio/calc";
import type { PricingRules } from "../studio/types";
import { NumInput, SelectField } from "./fields";
import { MATERIALS, matchTarget, regionNames } from "./helpers";

/** Sample quote that recalculates from the draft rules on every edit. */
export default function PreviewCard({ rules }: { rules: PricingRules }) {
  const [open, setOpen] = useState(true);
  const [cost, setCost] = useState(10000);
  const [margin, setMargin] = useState(22);
  const [region, setRegion] = useState("California");
  const [material, setMaterial] = useState("Teak");

  const price = sellingPrice(cost, margin);
  const profit = grossProfit(cost, margin);
  const ap = approverFor(rules, price, margin);
  const target = matchTarget(rules, material, region);
  const mod = rules.regionModifiers.find((r) => r.region === region);
  const early = price * (1 - rules.earlyPayDiscountPct / 100);

  let marginTone: Tone = "ok";
  let marginText = target ? `In band around the ${target.targetPct}% target` : "No margin target matches";
  if (margin < rules.minMarginPct) {
    marginTone = "danger";
    marginText = `Below the ${rules.minMarginPct}% minimum margin`;
  } else if (target && Math.abs(margin - target.targetPct) > rules.toleranceBandPct) {
    marginTone = "warn";
    marginText = `Outside plus or minus ${rules.toleranceBandPct} of the ${target.targetPct}% target`;
  } else if (!target) {
    marginTone = "neutral";
  }

  const tierText = !ap.tier ? "No tier matches" : ap.tier.upToValue === null ? "Top tier, no limit" : `Tier up to ${usd(ap.tier.upToValue)}`;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="rules-preview-body"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-2"
      >
        <Calculator className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Live sample quotation</span>
          <span className="block text-xs text-muted">Recalculates from the draft rules on every edit.</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />}
      </button>

      {open ? (
        <div id="rules-preview-body" className="space-y-4 border-t border-line p-4">
          <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
            <NumInput label="Cost" value={cost} min={0} prefix="$" onChange={setCost} />
            <NumInput label="Margin" value={margin} min={0} max={99} suffix="%" onChange={setMargin} />
            <SelectField label="Region" value={region} options={regionNames(rules)} onChange={setRegion} />
            <SelectField label="Material" value={material} options={MATERIALS.filter((m) => m !== "Any")} onChange={setMaterial} />
          </div>

          <div aria-live="polite" className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 @md:grid-cols-4">
              <Result label="Selling price" value={usd(price, 2)} strong />
              <Result label="Gross profit" value={usd(profit, 2)} />
              <Result label="Early payment price" value={usd(early, 2)} note={`${rules.earlyPayDiscountPct}% off`} />
              <Result label="Approver" value={ap.approver} note={ap.escalated ? `Escalated from ${ap.tier?.approver}` : tierText} />
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={marginTone}>{marginText}</Chip>
              {ap.escalated && ap.tier ? <Chip tone="warn">Margin is below {ap.tier.escalateBelowMarginPct}%, so it moves up one tier</Chip> : null}
            </div>

            <p className="text-xs text-muted">
              {mod
                ? `${region} adjusts price book rates: labour ${signed(mod.labourPct)}, material ${signed(mod.materialPct)}, transport ${signed(mod.transportPct)}. The cost above is treated as already adjusted.`
                : `${region} has no region modifier, so price book rates are used unchanged.`}
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${n}%`;

function Result({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className="rounded-control border border-line bg-surface-2 p-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 tabular-nums text-ink ${strong ? "text-base font-semibold" : "text-sm font-medium"}`}>{value}</dd>
      {note ? <dd className="mt-0.5 text-xs text-muted">{note}</dd> : null}
    </div>
  );
}
