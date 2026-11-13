import { AlertTriangle, CheckCircle2, CircleDot, XCircle } from "lucide-react";
import type { Outcome, Quotation } from "../../types";
import { Callout, Card, Chip, ConfidenceMeter, SectionTitle, SimulatedTag } from "../../components/ui";
import type { Tone } from "../../components/ui";
import { usd } from "../../studio/calc";
import type { MarginDecision, PricingRules } from "../../studio/types";
import { explainRecommendation, fallbackTarget, similarQuotes, winStats } from "./margin";
import { pct } from "./shared";

const OUTCOME: Record<Outcome, { label: string; tone: Tone; icon: typeof CheckCircle2 }> = {
  awarded: { label: "Awarded", tone: "ok", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "danger", icon: XCircle },
  in_progress: { label: "In progress", tone: "info", icon: CircleDot },
};

export default function RecommendationCard({ quotation, margin, cost, rules, threshold }: { quotation: Quotation; margin: MarginDecision; cost: number; rules: PricingRules; threshold: number }) {
  const similar = similarQuotes(quotation);
  const stats = winStats(similar);
  const shown = similar.slice(0, 5);
  const low = margin.modelConfidence < threshold;
  const target = fallbackTarget(rules, quotation);

  return (
    <Card className="p-4">
      <SectionTitle title="Margin recommendation" hint="From the margin model. It is a suggestion, and the pricing rules decide what is allowed." action={<SimulatedTag />} />

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <div className="text-xs text-muted">Recommended margin</div>
          <div className="text-3xl font-semibold tabular-nums text-ink">{pct(margin.recommendedPct, 1)}</div>
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">Model confidence</div>
          <ConfidenceMeter pct={margin.modelConfidence} />
        </div>
      </div>

      {low ? (
        <Callout tone="warn" icon={AlertTriangle} className="mt-3" title="Confidence is below the agent threshold">
          The model is {margin.modelConfidence}% confident and the Margin Intelligence agent needs {threshold}%. A human should check this number.
          {target ? ` The rules suggest a fallback target of ${pct(target.targetPct)} for ${target.material === "Any" ? "any material" : target.material} in ${target.region === "Any" ? "any region" : target.region}.` : ""}
        </Callout>
      ) : (
        <p className="mt-3 text-xs text-muted">Confidence meets the agent threshold of {threshold}%.</p>
      )}

      <div className="mt-4">
        <div className="mb-1 flex items-center gap-2">
          <h4 className="text-xs font-semibold text-ink">Why this margin</h4>
          <SimulatedTag />
        </div>
        <p className="text-sm leading-relaxed text-ink-2">{explainRecommendation(quotation, margin.recommendedPct, cost, rules)}</p>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
          <h4 className="text-xs font-semibold text-ink">Similar quotes</h4>
          <span className="text-xs tabular-nums text-muted">
            {stats.ratePct === null ? "No decided similar quotes yet" : `Win rate ${pct(stats.ratePct)}: ${stats.awarded} of ${stats.decided} decided similar quotes were awarded`}
          </span>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-muted">No other quotation uses the same material or region.</p>
        ) : (
          <ul className="divide-y divide-line rounded-control border border-line">
            {shown.map((o) => {
              const oc = OUTCOME[o.outcome];
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm text-ink">
                      <span className="font-medium tabular-nums">{o.id}</span> <span className="break-words text-ink-2">{o.product}</span>
                    </div>
                    <div className="text-xs tabular-nums text-muted">
                      {usd(o.value)} at {pct(o.marginPct)} margin, {o.material} in {o.region}
                    </div>
                  </div>
                  <Chip tone={oc.tone} icon={oc.icon}>
                    {oc.label}
                  </Chip>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
