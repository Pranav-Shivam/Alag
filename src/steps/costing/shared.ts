import type { BomCategory, BomLine } from "../../studio/types";
import { lineCalcTotal, lineDelta, usd } from "../../studio/calc";

/* Small helpers shared by the costing (step 4) and margin (step 5) screens. */

export const CATEGORY_ORDER: BomCategory[] = ["wood", "labour", "manufacturing", "finishing", "hardware", "logistics", "installation"];

export const CATEGORY_LABEL: Record<BomCategory, string> = {
  wood: "Wood",
  labour: "Labour",
  manufacturing: "Manufacturing",
  finishing: "Finishing",
  hardware: "Hardware",
  logistics: "Logistics",
  installation: "Installation",
};

export const OVERRIDE_REASONS = ["Supplier quote", "Customer request", "Design change", "Price book outdated", "Other"] as const;
export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

/** A change beyond this share of the calculated total is flagged for review. */
export const VARIANCE_FLAG_PCT = 5;
export const MIN_NOTE_CHARS = 8;

/** Lines created in this screen carry this id prefix. Only these can be removed. */
export const ADDED_PREFIX = "bom-add-";
export const isAddedLine = (l: BomLine) => l.id.startsWith(ADDED_PREFIX);

/** Percent change of the line total versus the calculated total. Null when there is nothing to compare with. */
export function variancePct(l: BomLine): number | null {
  const calc = lineCalcTotal(l);
  if (calc === 0) return null;
  return (lineDelta(l) / calc) * 100;
}

export function signedUsd(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "n/a";
  const rounded = Number(n.toFixed(digits));
  return `${rounded > 0 ? "+" : ""}${usd(rounded, digits)}`;
}

export function signedPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "n/a";
  const rounded = Number(n.toFixed(digits));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}%`;
}

export function pct(n: number, digits = 0): string {
  return `${Number(n.toFixed(digits))}%`;
}

export function fmtQty(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Parse a number typed into a text field. Null when empty or not a finite number. */
export function parseNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
