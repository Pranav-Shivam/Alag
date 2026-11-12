import { useEffect, useRef, useState } from "react";
import { CircleCheck, Loader2, Send, Sparkles } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle, SimulatedTag, TextArea, TextInput } from "../../components/ui";
import { usd } from "../../studio/calc";
import { useStudio } from "../../studio/store";
import type { QuotationDraft } from "../../studio/types";
import type { Quotation } from "../../types";

interface Props {
  quotation: Quotation;
  draft: QuotationDraft;
  total: number | null;
}

/** Deterministic stand-in for the Quotation Agent. Same inputs always give the same email. */
function writeBody(q: Quotation, d: QuotationDraft, total: number): string {
  const first = q.customer.split(" ")[0];
  return [
    `Dear ${first},`,
    `Thank you for your enquiry about ${q.product.toLowerCase()} in ${q.material.toLowerCase()}. Our quotation ${q.id} totals ${usd(total, 2)}, including delivery and installation in ${q.region}.`,
    `The price is valid for ${d.validityDays} days. Payment terms: ${d.paymentTerms}.`,
    "We would be glad to walk you through the design and finish options before you decide.",
    `Kind regards,\n${q.estimator}\nALAG`,
  ].join("\n\n");
}

export default function CoverEmail({ quotation, draft, total }: Props) {
  const setDraft = useStudio((s) => s.setQuotationDraft);
  const log = useStudio((s) => s.logActivity);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const sent = draft.status === "sent";
  const complete = draft.subject.trim() !== "" && draft.body.trim() !== "";
  const canSend = !sent && complete && total !== null;

  const aiDraft = () => {
    if (total === null || busy) return;
    setBusy(true);
    timer.current = window.setTimeout(() => {
      setDraft(quotation.id, { body: writeBody(quotation, draft, total) });
      log(quotation.id, { stepId: 6, actor: "AI", who: "Quotation Agent", text: "Drafted the cover email for review (simulated)" });
      setBusy(false);
    }, 700);
  };

  const send = () => {
    setDraft(quotation.id, { status: "sent" });
    log(quotation.id, { stepId: 6, actor: "Human", who: "You", text: `Sent quotation ${quotation.id} to ${quotation.customer}` });
    setConfirming(false);
  };

  return (
    <Card className="space-y-4 p-4">
      <SectionTitle
        title="Cover email"
        hint="The email that goes with the quotation. A person reads it and sends it."
        action={sent ? <Chip tone="ok" icon={CircleCheck}>Sent</Chip> : undefined}
      />

      {sent ? (
        <Callout tone="ok" icon={CircleCheck} title="Quotation sent">
          The quotation went to {quotation.customer}. The email is now read only.
        </Callout>
      ) : null}

      <TextInput label="Subject" value={draft.subject} readOnly={sent} onChange={(e) => setDraft(quotation.id, { subject: e.target.value })} />
      <TextArea label="Message" rows={9} value={draft.body} readOnly={sent} onChange={(e) => setDraft(quotation.id, { body: e.target.value })} />

      {!sent ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={busy ? Loader2 : Sparkles} disabled={busy || total === null} onClick={aiDraft} aria-busy={busy}>
              {busy ? "Drafting" : "Draft with AI"}
            </Button>
            <SimulatedTag />
            <span aria-live="polite" className="text-xs text-muted">
              {busy ? "The agent is writing the email." : total === null ? "Needs a price first. Estimate pending." : ""}
            </span>
          </div>

          {confirming ? (
            <Callout tone="warn" icon={Send} title={`Send to ${quotation.customer}?`}>
              <p>This sends the quotation and the email above. It cannot be unsent. A person sends the quotation, never the AI.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="primary" icon={Send} onClick={send}>
                  Confirm and send
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </Callout>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={Send} disabled={!canSend} onClick={() => setConfirming(true)}>
                Send quotation
              </Button>
              {!complete ? <span className="text-xs text-muted">Add a subject and a message first.</span> : null}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
