import { usd } from "../studio/calc";
import type { ApprovalTier, MarginTarget, PricingRules, RegionModifier } from "../studio/types";

/* Plain language change list between two rule sets. Used by the publish panel and the version history. */

const pct = (n: number) => `${n}%`;

function scalar(label: string, a: number, b: number): string | null {
  return a === b ? null : `${label}: ${pct(a)} to ${pct(b)}`;
}

function table<T>(label: string, a: T[], b: T[], key: (t: T) => string, name: (t: T) => string, changed: (x: T, y: T) => string[], checkOrder = false): string | null {
  const aMap = new Map(a.map((t) => [key(t), t]));
  const bMap = new Map(b.map((t) => [key(t), t]));
  const added = b.filter((t) => !aMap.has(key(t))).map(name);
  const removed = a.filter((t) => !bMap.has(key(t))).map(name);
  const edits: string[] = [];
  for (const t of b) {
    const before = aMap.get(key(t));
    if (!before) continue;
    const c = changed(before, t);
    if (c.length > 0) edits.push(`${name(t)} (${c.join(", ")})`);
  }
  const keptA = a.filter((t) => bMap.has(key(t))).map(key);
  const keptB = b.filter((t) => aMap.has(key(t))).map(key);
  const reordered = checkOrder && keptA.join("|") !== keptB.join("|");
  const parts: string[] = [];
  if (added.length > 0) parts.push(`${added.length} added (${added.join(", ")})`);
  if (removed.length > 0) parts.push(`${removed.length} removed (${removed.join(", ")})`);
  if (edits.length > 0) parts.push(`${edits.length} changed: ${edits.join("; ")}`);
  if (reordered) parts.push("order changed");
  return parts.length > 0 ? `${label}: ${parts.join(". ")}` : null;
}

const limit = (n: number | null) => (n === null ? "no limit" : usd(n));
const esc = (n: number | undefined) => (n === undefined ? "none" : pct(n));

export function diffRules(a: PricingRules, b: PricingRules): string[] {
  const out: (string | null)[] = [
    scalar("Minimum margin", a.minMarginPct, b.minMarginPct),
    scalar("Tolerance band", a.toleranceBandPct, b.toleranceBandPct),
    scalar("Maximum discount", a.maxDiscountPct, b.maxDiscountPct),
    scalar("Early payment discount", a.earlyPayDiscountPct, b.earlyPayDiscountPct),
    scalar("Advance payment", a.advancePaymentPct, b.advancePaymentPct),
    table<RegionModifier>(
      "Region modifiers",
      a.regionModifiers,
      b.regionModifiers,
      (r) => r.region,
      (r) => r.region,
      (x, y) => {
        const c: string[] = [];
        if (x.labourPct !== y.labourPct) c.push(`labour ${pct(x.labourPct)} to ${pct(y.labourPct)}`);
        if (x.materialPct !== y.materialPct) c.push(`material ${pct(x.materialPct)} to ${pct(y.materialPct)}`);
        if (x.transportPct !== y.transportPct) c.push(`transport ${pct(x.transportPct)} to ${pct(y.transportPct)}`);
        return c;
      },
    ),
    table<MarginTarget>(
      "Margin targets",
      a.marginTargets,
      b.marginTargets,
      (t) => t.id,
      (t) => `${t.material} in ${t.region}`,
      (x, y) => {
        const c: string[] = [];
        if (x.material !== y.material) c.push(`material ${x.material} to ${y.material}`);
        if (x.region !== y.region) c.push(`region ${x.region} to ${y.region}`);
        if (x.targetPct !== y.targetPct) c.push(`target ${pct(x.targetPct)} to ${pct(y.targetPct)}`);
        return c;
      },
      true,
    ),
    table<ApprovalTier>(
      "Approval tiers",
      a.approvalTiers,
      b.approvalTiers,
      (t) => t.id,
      (t) => `${t.approver}, up to ${limit(t.upToValue)}`,
      (x, y) => {
        const c: string[] = [];
        if (x.upToValue !== y.upToValue) c.push(`limit ${limit(x.upToValue)} to ${limit(y.upToValue)}`);
        if (x.approver !== y.approver) c.push(`approver ${x.approver} to ${y.approver}`);
        if (x.escalateBelowMarginPct !== y.escalateBelowMarginPct) c.push(`escalation ${esc(x.escalateBelowMarginPct)} to ${esc(y.escalateBelowMarginPct)}`);
        return c;
      },
    ),
  ];
  return out.filter((s): s is string => s !== null);
}
