import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Callout, SectionTitle, TextInput } from "../components/ui";
import type { PricingRules, RegionModifier } from "../studio/types";
import { CELL_LABEL, NumInput } from "./fields";

interface Props {
  rules: PricingRules;
  set: (patch: Partial<PricingRules>) => void;
}

const GRID = "grid grid-cols-3 gap-2 @md:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem_2.5rem] @md:items-end";

export default function RegionSection({ rules, set }: Props) {
  const rows = rules.regionModifiers;
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const duplicate = rows.some((r) => r.region.toLowerCase() === trimmed.toLowerCase());

  const patch = (region: string, p: Partial<RegionModifier>) => set({ regionModifiers: rows.map((r) => (r.region === region ? { ...r, ...p } : r)) });

  const add = () => {
    if (!trimmed || duplicate) return;
    set({ regionModifiers: [...rows, { region: trimmed, labourPct: 0, materialPct: 0, transportPct: 0 }] });
    setName("");
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Region modifiers" />
      <Callout tone="info" title="How modifiers work">
        Each percentage adjusts the price book rate for that kind of cost in that region. A labour modifier of +12 raises every labour rate by 12 percent, and -6 lowers it by 6 percent. Negative numbers are allowed.
      </Callout>

      <div className={`hidden text-xs font-medium text-muted @md:grid ${GRID}`} aria-hidden="true">
        <span>Region</span>
        <span>Labour</span>
        <span>Material</span>
        <span>Transport</span>
        <span />
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.region} className={`${GRID} rounded-control border border-line p-3 @md:border-0 @md:p-0`}>
            <div className="col-span-3 flex min-h-10 items-center text-sm font-medium text-ink @md:col-span-1">{r.region}</div>
            <NumInput label="Labour percent" labelClass={CELL_LABEL} value={r.labourPct} min={-50} max={100} suffix="%" onChange={(n) => patch(r.region, { labourPct: n })} />
            <NumInput label="Material percent" labelClass={CELL_LABEL} value={r.materialPct} min={-50} max={100} suffix="%" onChange={(n) => patch(r.region, { materialPct: n })} />
            <NumInput label="Transport percent" labelClass={CELL_LABEL} value={r.transportPct} min={-50} max={100} suffix="%" onChange={(n) => patch(r.region, { transportPct: n })} />
            <div className="col-span-3 flex justify-end @md:col-span-1">
              <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Remove ${r.region}`} onClick={() => set({ regionModifiers: rows.filter((x) => x.region !== r.region) })}>
                <span className="@md:sr-only">Remove</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-muted">No regions yet. Price book rates are used as they are.</p> : null}

      <form
        className="flex flex-wrap items-end gap-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="min-w-40 flex-1">
          <TextInput label="New region name" value={name} onChange={(e) => setName(e.target.value)} error={duplicate ? "That region already exists." : undefined} maxLength={40} />
        </div>
        <Button type="submit" icon={Plus} disabled={!trimmed || duplicate}>
          Add region
        </Button>
      </form>
    </div>
  );
}
