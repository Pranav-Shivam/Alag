import { useState } from "react";
import { Ban, CircleCheck, Handshake, TriangleAlert } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle } from "../../components/ui";
import { approverFor, usd } from "../../studio/calc";
import { useRules, useStudio } from "../../studio/store";
import type { Quotation } from "../../types";
import { NumInput } from "../../rules/fields";

interface Props {
  quotation: Quotation;
  /** Cost from the bill of materials, or null when the estimate is pending. */
  cost: number | null;
  /** The price on the quotation today. */
  basePrice: number | null;
  locked: boolean;
}

export default function Negotiation({ quotation, cost, basePrice, locked }: Props) {
  const live = useRules().live;
  const log = useStudio((s) => s.logActivity);
  const [discount, setDiscount] = useState(3);
  const [recorded, setRecorded] = useState<string | null>(null);

  const ready = cost !== null && basePrice !== null;
  const newPrice = ready ? basePrice * (1 - discount / 100) : NaN;
  const newMargin = ready && newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : NaN;
  const profit = ready ? newPrice - cost : NaN;
  const approval = ready ? approverFor(live, newPrice, newMargin) : null;
  const blocked = ready && newMargin < live.minMarginPct;
  const overMax = discount > live.maxDiscountPct;

  const record = () => {
    if (!ready || blocked || !approval) return;
    const text = `Recorded a counter-offer of ${discount}% off: price ${usd(newPrice, 2)}, margin ${newMargin.toFixed(1)}%, approver ${approval.approver}${overMax ? `, above the ${live.maxDiscountPct}% maximum discount` : ""}`;
    log(quotation.id, { stepId: 6, actor: "Human", who: "You", text });
    setRecorded(text);
  };

  return (
    <Card className="space-y-4 p-4">
      <SectionTitle title="Negotiation" hint="Test a customer counter-offer against the live pricing rules before you answer." action={<Chip icon={Handshake}>Maximum discount {live.maxDiscountPct}%</Chip>} />

      {!ready ? (
        <Callout tone="warn" title="Estimate pending">
          Negotiation needs a cost estimate and a margin decision. Finish steps 4 and 5 first.
        </Callout>
      ) : (
        <>
          <div className="max-w-xs">
            <NumInput
              label="Counter-offer discount"
              value={discount}
              min={0}
              max={50}
              suffix="%"
              disabled={locked}
              onChange={(n) => {
                setDiscount(n);
                setRecorded(null);
              }}
              hint={`Percent taken off the current price of ${usd(basePrice, 2)}.`}
            />
          </div>

          <div aria-live="polite" className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 @md:grid-cols-4">
              <Stat label="New price" value={usd(newPrice, 2)} />
              <Stat label="New margin" value={`${newMargin.toFixed(1)}%`} danger={blocked} />
              <Stat label="Gross profit" value={usd(profit, 2)} />
              <Stat label="Approver" value={approval?.approver ?? "Not set"} note={approval?.escalated ? "Escalated, margin is low" : undefined} />
            </dl>

            {blocked ? (
              <Callout tone="danger" icon={Ban} title="Blocked: below the minimum margin">
                At {discount}% off the margin falls to {newMargin.toFixed(1)}%, under the minimum of {live.minMarginPct}%. Offer a smaller discount.
              </Callout>
            ) : overMax ? (
              <Callout tone="warn" icon={TriangleAlert} title="Above the maximum discount">
                {discount}% is more than the {live.maxDiscountPct}% limit. {approval?.approver ?? "A manager"} must approve before you offer it.
              </Callout>
            ) : (
              <Callout tone="ok" icon={CircleCheck}>
                Within the maximum discount and above the minimum margin of {live.minMarginPct}%. {approval?.approver ?? "The approver"} signs off on this price.
              </Callout>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={Handshake} disabled={locked || blocked} onClick={record}>
              Record counter-offer
            </Button>
            {locked ? <span className="text-xs text-muted">The customer has already decided.</span> : null}
          </div>
          <p aria-live="polite" className="text-xs text-ok-fg">
            {recorded ? "Counter-offer saved to the activity log." : ""}
          </p>
        </>
      )}
    </Card>
  );
}

function Stat({ label, value, note, danger }: { label: string; value: string; note?: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${danger ? "border-danger-line bg-danger-soft" : "border-line bg-surface-2"}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium tabular-nums ${danger ? "text-danger-fg" : "text-ink"}`}>{value}</dd>
      {note ? <dd className="mt-0.5 text-xs text-muted">{note}</dd> : null}
    </div>
  );
}
