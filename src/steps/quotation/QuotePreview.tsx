import { Card, Callout, SectionTitle, Switch } from "../../components/ui";
import { usd } from "../../studio/calc";
import type { QuotationDraft } from "../../studio/types";
import type { Quotation } from "../../types";
import { issueDate, shortDate } from "./pricing";
import type { QuoteFigures } from "./pricing";

interface Props {
  quotation: Quotation;
  draft: QuotationDraft;
  figures: QuoteFigures;
  earlyPct: number;
  applyEarly: boolean;
  onToggleEarly: (v: boolean) => void;
  discount: number;
  total: number | null;
}

const PENDING = "Estimate pending";

export default function QuotePreview({ quotation, draft, figures, earlyPct, applyEarly, onToggleEarly, discount, total }: Props) {
  const pending = figures.subtotal === null;
  const sent = draft.status === "sent";

  return (
    <section aria-label="Quotation preview" className="space-y-3">
      <SectionTitle title="Quotation preview" hint="This is what the customer receives. Prices come from the pricing engine." />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
        <span id="early-label" className="min-w-0 text-sm text-ink-2">
          Show the early payment discount of <span className="tabular-nums">{earlyPct}%</span> for advance payment
        </span>
        <Switch checked={applyEarly} onChange={onToggleEarly} label="Show early payment discount on the quotation" disabled={sent} />
      </div>

      <Card as="article" className="overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-surface-2 px-4 py-3">
          <div>
            <div className="text-lg font-semibold tracking-widest text-ink">ALAG</div>
            <div className="text-xs text-muted">Custom wooden furniture and interiors</div>
          </div>
          <div className="text-xs text-ink-2 @md:text-right">
            <div className="text-sm font-semibold tabular-nums text-ink">Quotation {quotation.id}</div>
            <div className="tabular-nums">Date: {shortDate(issueDate(quotation.receivedOn))}</div>
            <div className="tabular-nums">Valid for {draft.validityDays} days</div>
          </div>
        </header>

        <div className="space-y-4 p-4">
          <dl className="grid grid-cols-1 gap-3 text-sm @md:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Customer</dt>
              <dd className="mt-0.5 break-words text-ink">{quotation.customer}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Project</dt>
              <dd className="mt-0.5 break-words text-ink">
                {quotation.product}, {quotation.material.toLowerCase()}, {quotation.region}
              </dd>
            </div>
          </dl>

          {pending ? (
            <Callout tone="warn" title={PENDING}>
              The cost estimate or the margin decision is not complete, so no prices can be shown yet.
            </Callout>
          ) : null}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Scope and price</h4>
            {figures.groups.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{PENDING}. No cost lines exist yet.</p>
            ) : (
              <ul className="mt-1 divide-y divide-line">
                {figures.groups.map((g) => (
                  <li key={g.category} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{g.label}</span>
                      <span className="shrink-0 text-sm tabular-nums text-ink">{pending ? PENDING : usd(g.total, 2)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{g.items.join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">Subtotal</dt>
              <dd className="tabular-nums text-ink">{figures.subtotal === null ? PENDING : usd(figures.subtotal, 2)}</dd>
            </div>
            {applyEarly && !pending ? (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">Early payment discount ({earlyPct}%)</dt>
                <dd className="tabular-nums text-ok-fg">-{usd(discount, 2)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold">
              <dt className="text-ink">Total</dt>
              <dd className="tabular-nums text-ink" aria-live="polite">
                {total === null ? PENDING : usd(total, 2)}
              </dd>
            </div>
          </dl>

          <div className="rounded-lg bg-surface-2 p-3 text-sm">
            <div className="text-xs font-medium text-muted">Payment terms</div>
            <p className="mt-0.5 text-ink">{draft.paymentTerms}</p>
          </div>

          <p className="text-xs text-muted">All prices come from the ALAG pricing engine and the approved price book.</p>
        </div>
      </Card>
    </section>
  );
}
