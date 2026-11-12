import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { CaseProps } from "../components/inspector/types";
import { Card } from "../components/ui";
import { useCase, useRules } from "../studio/store";
import CoverEmail from "./quotation/CoverEmail";
import Decision from "./quotation/Decision";
import Negotiation from "./quotation/Negotiation";
import QuotePreview from "./quotation/QuotePreview";
import { quoteFigures, quoteTotal } from "./quotation/pricing";

export default function Step6Quotation({ quotation }: CaseProps) {
  const c = useCase(quotation.id);
  const rules = useRules();
  const [applyEarly, setApplyEarly] = useState(false);

  const figures = useMemo(() => (c ? quoteFigures(c) : null), [c]);
  const draft = c?.quotationDraft ?? null;

  if (!c || !draft || !figures) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <FileText className="h-8 w-8 text-muted" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink">No quotation yet</h3>
        <p className="max-w-sm text-sm text-muted">
          {quotation.id} has not reached the customer quotation step. It is at step {quotation.currentStep}. Cost, margin and approval come first, then the quotation appears here.
        </p>
      </Card>
    );
  }

  const earlyPct = rules.live.earlyPayDiscountPct;
  const { total, discount } = quoteTotal(figures.subtotal, earlyPct, applyEarly && draft.status !== "sent");
  const decided = draft.decision !== undefined || quotation.outcome !== "in_progress";

  return (
    <div className="@container min-w-0 space-y-5">
      <QuotePreview
        quotation={quotation}
        draft={draft}
        figures={figures}
        earlyPct={earlyPct}
        applyEarly={applyEarly && draft.status !== "sent"}
        onToggleEarly={setApplyEarly}
        discount={discount}
        total={total}
      />
      <CoverEmail quotation={quotation} draft={draft} total={total} />
      <Negotiation quotation={quotation} cost={figures.cost} basePrice={total} locked={decided} />
      <Decision quotation={quotation} draft={draft} />
    </div>
  );
}
