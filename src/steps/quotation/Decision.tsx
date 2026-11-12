import { useState } from "react";
import { BrainCircuit, CircleCheck, CircleX, Gavel } from "lucide-react";
import { Button, Callout, Card, Segmented, SectionTitle, Select, TextArea } from "../../components/ui";
import { useStudio } from "../../studio/store";
import type { QuotationDraft } from "../../studio/types";
import type { Quotation } from "../../types";
import { shortDate } from "./pricing";

export const REJECT_REASONS = ["Pricing too high", "Delivery timeline too long", "Competitor selected", "Customer cancelled", "Design not accepted", "Budget constraints", "Other"];

type Result = "awarded" | "rejected";

interface Props {
  quotation: Quotation;
  draft: QuotationDraft;
}

const FEEDS = "This feeds future margin intelligence. Won and lost quotations with their reasons help the margin model recommend better prices.";

export default function Decision({ quotation, draft }: Props) {
  const setDraft = useStudio((s) => s.setQuotationDraft);
  const log = useStudio((s) => s.logActivity);
  const [result, setResult] = useState<Result>("awarded");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  // The recorded decision wins. Static outcome covers quotations decided before this session.
  const recorded: { result: Result; reason?: string; at?: string } | undefined =
    draft.decision ?? (quotation.outcome !== "in_progress" ? { result: quotation.outcome, reason: quotation.rejectReason, at: new Date(quotation.receivedOn + "T09:00:00Z").toISOString() } : undefined);

  if (recorded) {
    const won = recorded.result === "awarded";
    return (
      <Card className="space-y-3 p-4">
        <SectionTitle title="Customer decision" hint="Recorded and read only." />
        <Callout tone={won ? "ok" : "danger"} icon={won ? CircleCheck : CircleX} title={won ? "Awarded" : "Rejected"}>
          <p>
            {won
              ? `${quotation.customer} accepted the quotation.${quotation.orderId ? ` Order ${quotation.orderId} was created.` : ""}`
              : `${quotation.customer} did not accept the quotation. Reason: ${recorded.reason ?? "not recorded"}.`}
            {recorded.at ? ` Recorded on ${shortDate(recorded.at)}.` : ""}
          </p>
        </Callout>
        <p className="flex items-start gap-2 text-xs text-muted">
          <BrainCircuit className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {FEEDS}
        </p>
      </Card>
    );
  }

  const sent = draft.status === "sent";
  const needsReason = result === "rejected" && reason === "";
  const canSave = sent && !needsReason;

  const save = () => {
    if (!canSave) return;
    const rejected = result === "rejected";
    setDraft(quotation.id, { decision: { result, reason: rejected ? reason : undefined, at: new Date().toISOString() } });
    const detail = rejected ? ` Reason: ${reason}.${note.trim() ? ` Note: ${note.trim()}` : ""}` : note.trim() ? ` Note: ${note.trim()}` : "";
    log(quotation.id, { stepId: 6, actor: "Human", who: "You", text: `Recorded the customer decision: ${result}.${detail}` });
  };

  return (
    <Card className="space-y-4 p-4">
      <SectionTitle title="Record customer decision" hint="Save what the customer told you. It closes this step." />

      <Segmented<Result>
        label="Customer decision"
        value={result}
        onChange={(v) => {
          setResult(v);
          if (v === "awarded") setReason("");
        }}
        options={[
          { id: "awarded", label: "Awarded", icon: CircleCheck },
          { id: "rejected", label: "Rejected", icon: CircleX },
        ]}
      />

      {result === "rejected" ? (
        <Select label="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} hint="Required. The margin model learns from lost quotations.">
          <option value="">Choose a reason</option>
          {REJECT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      ) : null}

      <TextArea label="Note, optional" rows={2} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} hint="Added to the activity log." />

      <p className="flex items-start gap-2 text-xs text-muted">
        <BrainCircuit className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {FEEDS}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" icon={Gavel} disabled={!canSave} onClick={save}>
          Save decision
        </Button>
        {!sent ? <span className="text-xs text-muted">Send the quotation before recording a decision.</span> : needsReason ? <span className="text-xs text-muted">Choose a reason to save a rejection.</span> : null}
      </div>
    </Card>
  );
}
