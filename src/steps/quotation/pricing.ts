import { bomTotals, lineTotal, sellingPrice } from "../../studio/calc";
import type { BomCategory, QuotationCase } from "../../studio/types";

export const CATEGORY_LABEL: Record<BomCategory, string> = {
  material: "Materials",
  labour: "Carpentry labour",
  manufacturing: "Manufacturing",
  finishing: "Finishing",
  hardware: "Hardware",
  logistics: "Transport",
  installation: "Installation",
};

const ORDER: BomCategory[] = ["material", "labour", "manufacturing", "finishing", "hardware", "logistics", "installation"];

export interface CategoryGroup {
  category: BomCategory;
  label: string;
  items: string[];
  /** Share of the selling price, scaled from the effective cost of this category. */
  total: number;
}

export interface QuoteFigures {
  cost: number | null;
  marginPct: number | null;
  subtotal: number | null;
  groups: CategoryGroup[];
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Price = effective BOM total / (1 - chosen margin), split across cost categories in proportion to their cost. */
export function quoteFigures(c: QuotationCase): QuoteFigures {
  const cost = c.bom.length > 0 ? bomTotals(c.bom).effective : 0;
  const marginPct = c.margin ? c.margin.chosenPct : null;
  const priceRaw = cost > 0 && marginPct !== null ? sellingPrice(cost, marginPct) : NaN;
  const ready = Number.isFinite(priceRaw);
  const subtotal = ready ? cents(priceRaw) : null;

  const groups: CategoryGroup[] = [];
  for (const category of ORDER) {
    const lines = c.bom.filter((l) => l.category === category);
    if (lines.length === 0) continue;
    const catCost = lines.reduce((s, l) => s + lineTotal(l), 0);
    groups.push({ category, label: CATEGORY_LABEL[category], items: lines.map((l) => l.item), total: ready ? cents((catCost / cost) * priceRaw) : 0 });
  }
  // Rounding to cents can leave a small gap. The last category absorbs it so the lines add up to the subtotal.
  if (ready && subtotal !== null && groups.length > 0) {
    const sum = groups.reduce((s, g) => s + g.total, 0);
    const last = groups[groups.length - 1];
    last.total = cents(last.total + (subtotal - sum));
  }
  return { cost: cost > 0 ? cost : null, marginPct, subtotal, groups };
}

export function quoteTotal(subtotal: number | null, earlyPct: number, applyEarly: boolean): { total: number | null; discount: number } {
  if (subtotal === null) return { total: null, discount: 0 };
  const total = applyEarly ? cents(subtotal * (1 - earlyPct / 100)) : subtotal;
  return { total, discount: cents(subtotal - total) };
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Deterministic issue date: nine days after the request arrived. */
export function issueDate(receivedOn: string): string {
  return new Date(new Date(receivedOn + "T09:00:00Z").getTime() + 9 * 86400_000).toISOString();
}
