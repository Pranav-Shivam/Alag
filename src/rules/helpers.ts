import type { MarginTarget, PricingRules } from "../studio/types";

export const MATERIALS = ["Teak", "Cedar", "Oak", "Any"];
export const BASE_REGIONS = ["California", "Texas", "New York"];
export const APPROVERS = ["Estimator", "Sales manager", "Director", "Finance"];

export const isCatchAll = (t: MarginTarget) => t.material === "Any" && t.region === "Any";

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

/** First margin target whose material and region match. Same "first match wins" rule the table shows. */
export function matchTarget(rules: PricingRules, material: string, region: string): MarginTarget | undefined {
  return rules.marginTargets.find((t) => (t.material === "Any" || t.material === material) && (t.region === "Any" || t.region === region));
}

/** Region names for selects: the modifiers table plus the three base regions. */
export function regionNames(rules: PricingRules): string[] {
  const out = [...BASE_REGIONS];
  for (const r of rules.regionModifiers) if (!out.includes(r.region)) out.push(r.region);
  return out;
}

/** Risky but valid edits. These warn and never block publishing. */
export function riskWarnings(r: PricingRules): string[] {
  const out: string[] = [];
  if (r.toleranceBandPct > 10) out.push(`A tolerance band of plus or minus ${r.toleranceBandPct} points is wide. Almost any margin will look acceptable.`);
  if (r.minMarginPct < 10) out.push(`A minimum margin of ${r.minMarginPct}% leaves little room for rework and delays.`);
  if (r.maxDiscountPct > 15) out.push(`A maximum discount of ${r.maxDiscountPct}% can erase most of the margin on a typical quotation.`);
  if (r.advancePaymentPct < 20) out.push(`An advance payment of ${r.advancePaymentPct}% may not cover material purchases.`);
  if (!r.approvalTiers.some((t) => t.upToValue === null)) out.push("There is no top approval tier. Very large quotations would have no approver.");
  const lowEscalation = r.approvalTiers.find((t) => t.escalateBelowMarginPct !== undefined && t.escalateBelowMarginPct < r.minMarginPct);
  if (lowEscalation) out.push(`The ${lowEscalation.approver} tier escalates below ${lowEscalation.escalateBelowMarginPct}%, which is under the minimum margin. That escalation never triggers.`);
  if (!r.marginTargets.some(isCatchAll)) out.push("There is no Any and Any margin target. Some quotations would have no target margin.");
  return out;
}

/** Margin target rows that an earlier row already covers, so they can never be used. */
export function shadowedTargets(r: PricingRules): Set<string> {
  const out = new Set<string>();
  r.marginTargets.forEach((t, i) => {
    const covered = r.marginTargets.slice(0, i).some((p) => (p.material === "Any" || p.material === t.material) && (p.region === "Any" || p.region === t.region));
    if (covered) out.add(t.id);
  });
  return out;
}
