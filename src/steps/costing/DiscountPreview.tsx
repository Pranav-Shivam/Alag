import { BadgePercent, ShieldAlert } from "lucide-react";
import { Callout, Card, Chip, SectionTitle } from "../../components/ui";
import { usd } from "../../studio/calc";
import type { PricingRules } from "../../studio/types";
import { pct } from "./shared";

/** Shows what the approved early payment discount does to the selling price and margin. The discount is policy, never an AI decision. */
export default function DiscountPreview({ cost, price, rules, rulesVersion }: { cost: number; price: number; rules: PricingRules; rulesVersion: number }) {
  const d = rules.earlyPayDiscountPct;
  const after = price * (1 - d / 100);
  const marginAfter = after > 0 ? ((after - cost) / after) * 100 : 0;
  const below = marginAfter < rules.minMarginPct;

  return (
    <Card className="p-4">
      <SectionTitle
        title="Early payment discount preview"
        hint={`The ${pct(d, 1)} discount comes from the approved pricing policy, rules version ${rulesVersion}. It is not decided by AI.`}
        action={
          <Chip tone="neutral" icon={BadgePercent}>
            Policy
          </Chip>
        }
      />
      <dl className="mt-3 grid grid-cols-2 gap-2 @md:grid-cols-4" aria-live="polite">
        {[
          ["Selling price", usd(price)],
          [`Price after ${pct(d, 1)} discount`, usd(after)],
          ["Margin after discount", pct(marginAfter, 1)],
          ["Gross profit after discount", usd(after - cost)],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-control border border-line bg-surface-2 p-2.5">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="break-words text-base font-semibold tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {below ? (
        <Callout tone="danger" icon={ShieldAlert} className="mt-3" title="Margin after the discount is below the minimum">
          After the discount the margin is {pct(marginAfter, 1)}, under the minimum of {pct(rules.minMarginPct, 1)}. Offering early payment on this quote needs a Director exception, or a higher margin before the discount.
        </Callout>
      ) : (
        <p className="mt-3 text-xs text-muted">After the discount the margin stays above the minimum of {pct(rules.minMarginPct, 1)}.</p>
      )}
    </Card>
  );
}
