import { useMemo, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle, SimulatedTag } from "../../components/ui";
import { bomTotals, lineTotal, usd } from "../../studio/calc";
import type { BomCategory, BomLine, RegionModifier } from "../../studio/types";
import { ADDED_PREFIX, CATEGORY_LABEL, fmtQty, pct } from "./shared";

/* Deterministic checks dressed as an AI helper. Prices always come from the price book table below, never from a model. */

interface Standard {
  key: string;
  title: string;
  category: BomCategory;
  item: string;
  unit: string;
  /** Price book price before the region modifier. */
  price: number;
  /** Typical share of the total cost, used to size the suggested quantity. */
  share: number;
  match: RegExp;
}

const STANDARD: Standard[] = [
  { key: "paint", title: "Coating and finish", category: "finishing", item: "Coating and finish", unit: "litre", price: 28, share: 0.05, match: /paint|polish|lacquer|varnish|coating|finish/ },
  { key: "spray", title: "Spray finishing", category: "finishing", item: "Spray finishing", unit: "sq ft", price: 3.2, share: 0.03, match: /spray/ },
  { key: "hardware", title: "Screws and hardware", category: "hardware", item: "Screws, hinges, runners", unit: "lot", price: 95, share: 0.04, match: /screw|hinge|runner|hardware|fastener/ },
  { key: "glue", title: "Glue and adhesives", category: "hardware", item: "Glue and adhesives", unit: "kg", price: 18, share: 0.01, match: /glue|adhesive/ },
  { key: "transport", title: "Transport", category: "logistics", item: "Transport", unit: "trip", price: 180, share: 0.05, match: /transport|freight|haul|delivery/ },
  { key: "installation", title: "On-site installation", category: "installation", item: "On-site installation", unit: "hour", price: 55, share: 0.1, match: /install/ },
];

/** Typical share of the total cost per group. A group more than 15 percent away from this is worth a second look. */
const TYPICAL_SHARE: Record<BomCategory, number> = {
  material: 0.34,
  labour: 0.22,
  manufacturing: 0.12,
  finishing: 0.09,
  hardware: 0.06,
  logistics: 0.05,
  installation: 0.11,
};
const SHARE_TOLERANCE = 0.15;

function modifierFor(cat: BomCategory, m: RegionModifier | undefined): number {
  if (!m) return 0;
  if (cat === "logistics") return m.transportPct;
  if (cat === "labour" || cat === "manufacturing" || cat === "installation") return m.labourPct;
  return m.materialPct;
}

type Suggestion =
  | { kind: "missing"; id: string; title: string; detail: string; line: BomLine; reason: string }
  | { kind: "share"; id: string; title: string; detail: string };

/** Checks one lane: only standard components and cost groups of `categories` are suggested. `lines` is the whole estimate, so shares stay against the full total. */
export default function Suggestions({ lines, categories, region, onAdd }: { lines: BomLine[]; categories: BomCategory[]; region: RegionModifier | undefined; onAdd: (line: BomLine, reason: string) => void }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const all = useMemo<Suggestion[]>(() => {
    const total = bomTotals(lines).effective;
    if (lines.length === 0 || total <= 0) return [];
    const out: Suggestion[] = [];

    for (const s of STANDARD.filter((x) => categories.includes(x.category))) {
      const present = lines.some((l) => s.match.test(l.item.toLowerCase()) || (s.key === "transport" && l.category === "logistics") || (s.key === "installation" && l.category === "installation"));
      if (present) continue;
      const mod = modifierFor(s.category, region);
      const price = Math.round(s.price * (1 + mod / 100) * 100) / 100;
      const rawQty = (total * s.share) / price;
      const qty = s.unit === "lot" || s.unit === "trip" ? Math.max(1, Math.round(rawQty)) : Math.max(0.01, Math.round(rawQty * 100) / 100);
      out.push({
        kind: "missing",
        id: `missing-${s.key}`,
        title: `${s.title} is not in the cost lines`,
        detail: `Typical for this kind of job. Price book price ${usd(price, 2)} per ${s.unit}${mod !== 0 ? `, region adjusted ${mod > 0 ? "+" : ""}${mod}%` : ""}, about ${fmtQty(qty)} ${s.unit}.`,
        line: { id: `${ADDED_PREFIX}sug-${s.key}-${Date.now()}`, category: s.category, item: s.item, unit: s.unit, calcQty: qty, calcUnitPrice: price, source: "price_book" },
        reason: `AI suggested adding ${s.item}. Quantity sized to ${pct(s.share * 100)} of the estimate at the price book price.`,
      });
    }

    for (const cat of categories) {
      const group = lines.filter((l) => l.category === cat);
      if (group.length === 0) continue;
      const share = group.reduce((s, l) => s + lineTotal(l), 0) / total;
      const typical = TYPICAL_SHARE[cat];
      const off = (share - typical) / typical;
      if (Math.abs(off) > SHARE_TOLERANCE) {
        out.push({
          kind: "share",
          id: `share-${cat}`,
          title: `${CATEGORY_LABEL[cat]} looks ${off > 0 ? "high" : "low"}`,
          detail: `${CATEGORY_LABEL[cat]} is ${pct(share * 100, 1)} of the total. Typical is about ${pct(typical * 100)}, so it is ${pct(Math.abs(off) * 100)} ${off > 0 ? "above" : "below"} the usual share. Check the quantities and any overrides in this group.`,
        });
      }
    }
    return out;
  }, [lines, categories, region]);

  const visible = all.filter((s) => !dismissed.includes(s.id));
  const hiddenCount = all.length - visible.length;

  return (
    <Card className="p-4">
      <SectionTitle
        title="AI suggestions"
        hint="AI suggests what to check. It never sets a price. Suggested prices come from the approved price book, and you decide what is added."
        action={<SimulatedTag />}
      />
      <div className="mt-3 space-y-2">
        {visible.length === 0 ? (
          <Callout tone="ok" icon={Sparkles}>
            {all.length === 0 ? "All standard components are present and every cost group is near its typical share of the total." : "All suggestions are dismissed."}
          </Callout>
        ) : (
          <ul className="space-y-2">
            {visible.map((s) => (
              <li key={s.id} className="rounded-control border border-line bg-surface-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink">{s.title}</span>
                  <Chip tone={s.kind === "missing" ? "info" : "warn"}>{s.kind === "missing" ? "Missing component" : "Unusual share"}</Chip>
                </div>
                <p className="mt-1 text-xs text-ink-2">{s.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.kind === "missing" ? (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Plus}
                      onClick={() => onAdd(s.line, s.reason)}
                      aria-label={`Add line: ${s.line.item}`}
                    >
                      Add line
                    </Button>
                  ) : null}
                  <Button size="sm" icon={X} onClick={() => setDismissed((d) => [...d, s.id])} aria-label={`Dismiss: ${s.title}`}>
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {hiddenCount > 0 ? (
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>{hiddenCount} dismissed</span>
            <Button size="sm" variant="ghost" onClick={() => setDismissed([])}>
              Show dismissed
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
