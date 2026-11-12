import { ArrowDown, ArrowUp, Lock, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button, Callout, Chip, SectionTitle } from "../components/ui";
import { sellingPrice, usd } from "../studio/calc";
import type { MarginTarget, PricingRules } from "../studio/types";
import { CELL_LABEL, NumInput, PctSlider, SelectField } from "./fields";
import { MATERIALS, isCatchAll, newId, regionNames, shadowedTargets } from "./helpers";

interface Props {
  rules: PricingRules;
  set: (patch: Partial<PricingRules>) => void;
}

const GRID = "grid grid-cols-2 gap-2 @md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem_6.5rem] @md:items-end";

export default function MarginSection({ rules, set }: Props) {
  const targets = rules.marginTargets;
  const regions = [...regionNames(rules), "Any"];
  const shadowed = shadowedTargets(rules);
  const catchAll = targets.find(isCatchAll);
  const exampleTarget = catchAll?.targetPct ?? 20;
  const lo = Math.max(0, exampleTarget - rules.toleranceBandPct);
  const hi = exampleTarget + rules.toleranceBandPct;

  const patchTarget = (id: string, p: Partial<MarginTarget>) => set({ marginTargets: targets.map((t) => (t.id === id ? { ...t, ...p } : t)) });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...targets];
    const j = index + dir;
    [next[index], next[j]] = [next[j], next[index]];
    set({ marginTargets: next });
  };

  const addRow = () => {
    const row: MarginTarget = { id: newId("mt"), material: "Teak", region: "Any", targetPct: Math.max(rules.minMarginPct, exampleTarget) };
    const at = targets.findIndex(isCatchAll);
    const next = [...targets];
    next.splice(at < 0 ? next.length : at, 0, row);
    set({ marginTargets: next });
  };

  const addCatchAll = () => set({ marginTargets: [...targets, { id: newId("mt"), material: "Any", region: "Any", targetPct: Math.max(rules.minMarginPct, 20) }] });

  return (
    <div className="space-y-6">
      <PctSlider
        label="Minimum margin"
        value={rules.minMarginPct}
        onChange={(n) => set({ minMarginPct: n })}
        min={0}
        max={40}
        hint={`No quotation can be sold at a margin below ${rules.minMarginPct}%. On a cost of $10,000 that means a price of at least ${usd(sellingPrice(10000, rules.minMarginPct), 2)}.`}
      />

      <PctSlider
        label="Tolerance band, plus or minus"
        value={rules.toleranceBandPct}
        onChange={(n) => set({ toleranceBandPct: n })}
        min={0}
        max={20}
        hint={`A quotation may sit up to ${rules.toleranceBandPct} points away from its target margin. With a ${exampleTarget}% target, margins from ${lo}% to ${hi}% are in band. Outside the band the quotation is flagged for review.`}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <Lock className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">The AI can never price below the minimum margin.</span>
        <Chip>Locked</Chip>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Margin targets"
          hint="Used when the margin model has low confidence. The first matching row wins, so put specific rows above general ones."
          action={
            <Button size="sm" icon={Plus} onClick={addRow}>
              Add row
            </Button>
          }
        />

        {!catchAll ? (
          <Callout tone="warn" icon={TriangleAlert} title="No Any and Any row">
            <p>The last row must match every material and region, or some quotations get no target.</p>
            <Button size="sm" className="mt-2" onClick={addCatchAll}>
              Add the catch-all row
            </Button>
          </Callout>
        ) : null}

        <div className={`hidden px-0 text-xs font-medium text-muted @md:grid ${GRID}`} aria-hidden="true">
          <span>Material</span>
          <span>Region</span>
          <span>Target</span>
          <span>Order</span>
        </div>

        <ol className="space-y-2">
          {targets.map((t, i) => {
            const locked = isCatchAll(t) && i === targets.length - 1;
            const nextIsLockedCatchAll = i + 1 < targets.length && isCatchAll(targets[i + 1]) && i + 1 === targets.length - 1;
            return (
              <li key={t.id} className={`${GRID} rounded-lg border border-line p-3 @md:border-0 @md:p-0`}>
                <SelectField label="Material" labelClass={CELL_LABEL} value={t.material} options={MATERIALS} disabled={locked} onChange={(v) => patchTarget(t.id, { material: v })} />
                <SelectField label="Region" labelClass={CELL_LABEL} value={t.region} options={regions} disabled={locked} onChange={(v) => patchTarget(t.id, { region: v })} />
                <NumInput label="Target margin" labelClass={CELL_LABEL} value={t.targetPct} min={0} max={99} suffix="%" onChange={(n) => patchTarget(t.id, { targetPct: n })} />
                <div className="col-span-2 flex items-center justify-end gap-1 @md:col-span-1">
                  {locked ? (
                    <span className="mr-auto inline-flex items-center gap-1 text-xs text-muted @md:mr-0">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Always last
                    </span>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" icon={ArrowUp} aria-label={`Move row ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} />
                      <Button size="sm" variant="ghost" icon={ArrowDown} aria-label={`Move row ${i + 1} down`} disabled={nextIsLockedCatchAll || i === targets.length - 1} onClick={() => move(i, 1)} />
                      <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Remove row ${i + 1}`} onClick={() => set({ marginTargets: targets.filter((x) => x.id !== t.id) })} />
                    </>
                  )}
                </div>
                {shadowed.has(t.id) ? (
                  <p className="col-span-2 flex items-start gap-1.5 text-xs text-warn-fg @md:col-span-4">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Row {i + 1} is never used because an earlier row already covers {t.material} in {t.region}.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
