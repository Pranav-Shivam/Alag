import type { ApprovalTier, BomLine, ExtractedField, PricingRules } from "./types";

/* Deterministic money maths. The UI never asks an LLM for a number. */

export function lineQty(l: BomLine): number {
  return l.override ? l.override.qty : l.calcQty;
}
export function lineUnitPrice(l: BomLine): number {
  return l.override ? l.override.unitPrice : l.calcUnitPrice;
}
export function lineCalcTotal(l: BomLine): number {
  return l.calcQty * l.calcUnitPrice;
}
export function lineTotal(l: BomLine): number {
  return lineQty(l) * lineUnitPrice(l);
}
export function lineDelta(l: BomLine): number {
  return lineTotal(l) - lineCalcTotal(l);
}

export function bomTotals(lines: BomLine[]) {
  const calc = lines.reduce((s, l) => s + lineCalcTotal(l), 0);
  const effective = lines.reduce((s, l) => s + lineTotal(l), 0);
  return { calc, effective, delta: effective - calc, overrides: lines.filter((l) => l.override).length };
}

/** Selling price when margin is a share of the selling price: cost / (1 - margin). */
export function sellingPrice(cost: number, marginPct: number): number {
  if (marginPct >= 100) return NaN;
  return cost / (1 - marginPct / 100);
}

export function grossProfit(cost: number, marginPct: number): number {
  return sellingPrice(cost, marginPct) - cost;
}

/** First tier whose limit covers the value. Tiers must be sorted ascending with a catch-all last. */
export function approvalTierFor(rules: PricingRules, value: number): ApprovalTier | undefined {
  const sorted = [...rules.approvalTiers].sort((a, b) => (a.upToValue ?? Infinity) - (b.upToValue ?? Infinity));
  return sorted.find((t) => t.upToValue === null || value <= t.upToValue);
}

/** Who must approve a quote of this value and margin. Escalates one tier when margin is under the tier threshold. */
export function approverFor(rules: PricingRules, value: number, marginPct: number): { approver: string; escalated: boolean; tier?: ApprovalTier } {
  const sorted = [...rules.approvalTiers].sort((a, b) => (a.upToValue ?? Infinity) - (b.upToValue ?? Infinity));
  const idx = sorted.findIndex((t) => t.upToValue === null || value <= t.upToValue);
  if (idx < 0) return { approver: "No matching tier", escalated: false };
  const tier = sorted[idx];
  if (tier.escalateBelowMarginPct !== undefined && marginPct < tier.escalateBelowMarginPct && sorted[idx + 1]) {
    return { approver: sorted[idx + 1].approver, escalated: true, tier };
  }
  return { approver: tier.approver, escalated: false, tier };
}

/** Problems with a rule set. Empty array means valid. */
export function validateRules(r: PricingRules): string[] {
  const out: string[] = [];
  if (r.minMarginPct < 0 || r.minMarginPct >= 100) out.push("Minimum margin must be between 0 and 100.");
  if (r.toleranceBandPct < 0 || r.toleranceBandPct > 20) out.push("Tolerance band above 20 percent is not allowed.");
  if (r.maxDiscountPct < 0 || r.maxDiscountPct > 30) out.push("Maximum discount must be between 0 and 30.");
  if (r.earlyPayDiscountPct > r.maxDiscountPct) out.push("Early payment discount is above the maximum discount.");
  const tiers = r.approvalTiers;
  if (tiers.length === 0) out.push("Add at least one approval tier.");
  const catchAll = tiers.filter((t) => t.upToValue === null);
  if (catchAll.length === 0) out.push("The last approval tier must have no upper limit, so every value has an approver.");
  if (catchAll.length > 1) out.push("Only one approval tier can have no upper limit.");
  const limits = tiers.filter((t) => t.upToValue !== null).map((t) => t.upToValue as number);
  if (new Set(limits).size !== limits.length) out.push("Two approval tiers have the same limit. They overlap.");
  const floorAboveTarget = r.marginTargets.find((m) => m.targetPct < r.minMarginPct);
  if (floorAboveTarget) out.push(`Target margin ${floorAboveTarget.targetPct}% for ${floorAboveTarget.material} in ${floorAboveTarget.region} is below the minimum margin.`);
  return out;
}

export function fieldNeedsHuman(f: ExtractedField): boolean {
  return f.state === "needs_review" || (f.state === "missing" && f.required);
}

/** Roughly 4 characters per token. Good enough for a budget hint in a POC. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Names inside {{double braces}}, in order of first use. */
export function extractVariables(text: string): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g)) {
    if (!seen.includes(m[1])) seen.push(m[1]);
  }
  return seen;
}

export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, k: string) => values[k] ?? `{{${k}}}`);
}

export function usd(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "n/a";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}
