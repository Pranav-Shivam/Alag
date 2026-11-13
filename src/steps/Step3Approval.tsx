import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle2, CircleSlash, FileWarning, Send, Sparkles, Undo2 } from "lucide-react";
import type { CaseProps } from "../components/inspector/types";
import { Button, Callout, Card, Chip, SectionTitle, SimulatedTag, TextArea, TextInput } from "../components/ui";
import type { Tone } from "../components/ui";
import { fieldNeedsHuman } from "../studio/calc";
import { useCase, useStudio } from "../studio/store";
import type { ClarificationDraft, ExtractedField, QuotationCase } from "../studio/types";

type Readiness = "ready" | "review" | "missing";

function readinessOf(f: ExtractedField): Readiness {
  if (f.state === "verified" || f.state === "edited" || f.state === "na") return "ready";
  if (f.state === "missing" || f.value === null || f.value === "") return "missing";
  return "review";
}

const READINESS_UI: Record<Readiness, { word: string; tone: Tone; Icon: typeof CheckCircle2 }> = {
  ready: { word: "Ready", tone: "ok", Icon: CheckCircle2 },
  review: { word: "Needs review", tone: "warn", Icon: AlertTriangle },
  missing: { word: "Missing", tone: "danger", Icon: CircleSlash },
};

function valueText(f: ExtractedField): string {
  if (f.value === null || f.value === "") return "Not provided";
  return f.unit ? `${f.value} ${f.unit}` : f.value;
}

const EXAMPLE: Record<string, string> = {
  product_type: "for example wardrobe, machine guard or kitchen cabinet",
  material_type: "for example the main material named in the RFQ",
  length_in: "for example 84 inches or 7 ft",
  width_in: "for example 24 inches or 2 ft",
  height_in: "for example 90 inches or 7 ft 6 in",
  quantity: "for example 2 units",
  finish: "for example natural polish or white spray",
  delivery_location: "for example the city and state, such as Austin, TX",
};

function buildClarification(c: QuotationCase, estimator: string): ClarificationDraft {
  const asks = c.extraction.fields.filter(fieldNeedsHuman);
  const first = c.email.fromName.split(" ")[0];
  const lines = asks.map((f) => {
    const example = EXAMPLE[f.key] ?? "for example the value as written on your drawing";
    const label = f.label.toLowerCase();
    if (f.value === null || f.value === "") return `- The ${label}, ${example}.`;
    return `- Please confirm the ${label}. We read ${valueText(f)} but we are not fully sure, ${example}.`;
  });
  const subject = c.email.subject.toLowerCase().startsWith("re:") ? c.email.subject : `Re: ${c.email.subject}`;
  return {
    to: c.email.from,
    subject,
    body: `Hello ${first},\n\nThank you for your request. To prepare an accurate quotation we need ${asks.length === 1 ? "one more detail" : `${asks.length} more details`}:\n\n${lines.join("\n")}\n\nOnce we have ${asks.length === 1 ? "it" : "them"} we will send the quotation within two working days.\n\nKind regards,\n${estimator}\nALAG`,
    status: "draft",
  };
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Step3Approval({ quotation }: CaseProps) {
  const qid = quotation.id;
  const c = useCase(qid);
  const setRfqApproved = useStudio((s) => s.setRfqApproved);
  const setClarification = useStudio((s) => s.setClarification);
  const sendClarification = useStudio((s) => s.sendClarification);
  const logActivity = useStudio((s) => s.logActivity);

  const [edit, setEdit] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendError, setSendError] = useState("");
  const [openItems, setOpenItems] = useState(false);
  const [reason, setReason] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!c) return <div className="text-sm text-muted">No case data for {qid}.</div>;

  const { extraction, clarification } = c;
  const extractionOk = extraction.status === "done";
  const required = extraction.fields.filter((f) => f.required);
  const checklist = required.map((f) => ({ f, r: readinessOf(f) }));
  const attention = checklist.filter((x) => x.r !== "ready").length;
  const allReady = extractionOk && attention === 0;
  const asks = extraction.fields.filter(fieldNeedsHuman);

  /* ---------------- clarification ---------------- */
  const sent = clarification?.status === "sent";
  const shown = clarification ? (edit ?? { to: clarification.to, subject: clarification.subject, body: clarification.body }) : null;
  const dirty = edit !== null;

  const draftWithAi = () => {
    setDrafting(true);
    setConfirmSend(false);
    setSaved(false);
    setSendError("");
    timer.current = window.setTimeout(() => {
      setClarification(qid, buildClarification(c, quotation.estimator));
      setEdit(null);
      setDrafting(false);
    }, 700);
  };

  const patchEdit = (patch: Partial<{ to: string; subject: string; body: string }>) => {
    if (!shown) return;
    setEdit({ ...shown, ...patch });
    setSaved(false);
    setSendError("");
    setConfirmSend(false);
  };

  const saveDraft = () => {
    if (!shown) return;
    setClarification(qid, { to: shown.to, subject: shown.subject, body: shown.body, status: "draft" });
    setEdit(null);
    setSaved(true);
  };

  const validate = (): string => {
    if (!shown) return "There is no draft to send.";
    if (!/^\S+@\S+\.\S+$/.test(shown.to.trim())) return "Enter a valid email address in To.";
    if (!shown.subject.trim()) return "Enter a subject.";
    if (shown.body.trim().length < 10) return "Write a message before sending.";
    return "";
  };

  const startSend = () => {
    const err = validate();
    setSendError(err);
    if (!err) setConfirmSend(true);
  };

  const doSend = () => {
    if (!shown) return;
    setClarification(qid, { to: shown.to.trim(), subject: shown.subject.trim(), body: shown.body, status: "draft" });
    sendClarification(qid);
    setEdit(null);
    setConfirmSend(false);
    setSaved(false);
  };

  /* ---------------- approval ---------------- */
  const reasonOk = reason.trim().length >= 10;
  const approveWithOpenItems = () => {
    if (!reasonOk) return;
    setRfqApproved(qid, true);
    logActivity(qid, { stepId: 3, actor: "Human", who: "You", text: `Approved with ${attention} open ${attention === 1 ? "item" : "items"}. Reason: ${reason.trim()}` });
    setOpenItems(false);
    setReason("");
  };

  return (
    <div className="space-y-4">
      {/* Readiness */}
      <Card className="p-4">
        <SectionTitle title="Is this RFQ ready?" hint="Every required field must be verified or edited by a person." />

        {!extractionOk ? (
          <Callout tone="warn" icon={FileWarning} title={extraction.status === "failed" ? "Extraction failed" : "Extraction has not run yet"} className="mt-3">
            Extraction must succeed before this RFQ can be reviewed. Open the Review extraction tab to run it again or enter the values by hand.
            {extraction.status === "failed" && extraction.failureReason ? <span className="mt-1 block text-xs">{extraction.failureReason}</span> : null}
          </Callout>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line rounded-control border border-line">
              {checklist.map(({ f, r }) => {
                const ui = READINESS_UI[r];
                return (
                  <li key={f.key} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink">{f.label}</div>
                      <div className={`break-words text-xs ${r === "missing" ? "text-danger-fg" : "text-muted"}`}>{valueText(f)}</div>
                    </div>
                    <Chip tone={ui.tone} icon={ui.Icon} className="shrink-0">
                      {ui.word}
                    </Chip>
                  </li>
                );
              })}
            </ul>

            <div className={`mt-3 rounded-control border p-3 ${allReady ? "border-ok-line bg-ok-soft" : "border-warn-line bg-warn-soft"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className={`h-4 w-4 ${allReady ? "text-ok-fg" : "text-warn-fg"}`} aria-hidden="true" />
                <span className={`text-sm font-semibold ${allReady ? "text-ok-fg" : "text-warn-fg"}`}>
                  AI recommendation: {allReady ? "Ready for estimation" : `Not ready: ${attention} ${attention === 1 ? "item needs" : "items need"} attention`}
                </span>
                <SimulatedTag />
              </div>
              <p className="mt-1 text-xs text-ink-2">The AI can recommend, but only a person approves an RFQ for estimation.</p>
            </div>
          </>
        )}
      </Card>

      {/* Requirement summary */}
      {extraction.fields.length > 0 ? (
        <Card className="p-4">
          <SectionTitle title="Requirement summary" hint="Current values, including your edits." />
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 @sm:grid-cols-2">
            {extraction.fields.map((f) => (
              <div key={f.key} className="min-w-0 border-b border-line pb-2">
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd className={`break-words text-sm ${f.value ? "font-medium text-ink" : "text-muted"}`}>{valueText(f)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {/* Clarification */}
      <Card className="p-4">
        <SectionTitle
          title="Clarification email"
          hint="Ask the customer for anything that is missing or unclear. A person always sends it."
          action={
            sent && clarification?.sentAt ? (
              <Chip tone="ok" icon={CheckCircle2}>
                Sent {fmtTime(clarification.sentAt)}
              </Chip>
            ) : clarification ? (
              <Chip>{dirty ? "Unsaved changes" : "Draft"}</Chip>
            ) : null
          }
        />

        {!shown ? (
          <div className="mt-3 rounded-control border border-dashed border-line-strong bg-surface-2 p-4">
            <p className="text-sm text-ink-2">No email drafted yet. The AI can write a short polite one that asks only for what is missing or unclear.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={Sparkles} onClick={draftWithAi} disabled={drafting || !extractionOk || asks.length === 0}>
                {drafting ? "Drafting" : "Draft with AI"}
              </Button>
              <SimulatedTag />
            </div>
            {!extractionOk ? <p className="mt-2 text-xs text-muted">Extraction must succeed first, so the AI knows what to ask.</p> : asks.length === 0 ? <p className="mt-2 text-xs text-muted">Nothing is missing or unclear, so there is nothing to ask the customer.</p> : null}
            <p role="status" aria-live="polite" className={drafting ? "mt-2 text-xs text-muted" : "sr-only"}>
              {drafting ? "The AI is writing the email." : ""}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3" aria-busy={drafting}>
            <TextInput label="To" type="email" value={shown.to} readOnly={sent} disabled={drafting} onChange={(e) => patchEdit({ to: e.target.value })} />
            <TextInput label="Subject" value={shown.subject} readOnly={sent} disabled={drafting} onChange={(e) => patchEdit({ subject: e.target.value })} />
            <TextArea label="Message" rows={10} value={shown.body} readOnly={sent} disabled={drafting} onChange={(e) => patchEdit({ body: e.target.value })} className="resize-y" />

            {sendError ? (
              <p role="alert" className="text-xs text-danger-fg">
                {sendError}
              </p>
            ) : null}

            {sent ? (
              <Callout tone="ok" icon={BadgeCheck} title={`Sent ${clarification?.sentAt ? fmtTime(clarification.sentAt) : ""}`}>
                This email was sent to {clarification?.to}. It can no longer be edited.
              </Callout>
            ) : confirmSend ? (
              <Callout tone="warn" icon={Send} title={`Send this email to ${shown.to}?`}>
                <span className="block">It goes out right away and cannot be recalled.</span>
                <span className="mt-2 flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" icon={Send} onClick={doSend}>
                    Confirm send
                  </Button>
                  <Button size="sm" onClick={() => setConfirmSend(false)}>
                    Cancel
                  </Button>
                </span>
              </Callout>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button icon={Sparkles} onClick={draftWithAi} disabled={drafting || !extractionOk || asks.length === 0}>
                  {drafting ? "Drafting" : "Regenerate"}
                </Button>
                <Button onClick={saveDraft} disabled={drafting || !dirty}>
                  Save draft
                </Button>
                <Button variant="primary" icon={Send} onClick={startSend} disabled={drafting}>
                  Send
                </Button>
                <SimulatedTag />
              </div>
            )}
            <p role="status" aria-live="polite" className="text-xs text-muted">
              {drafting ? "The AI is writing the email." : saved ? "Draft saved." : ""}
            </p>
            {!sent && !confirmSend && (!extractionOk || asks.length === 0) ? <p className="text-xs text-muted">Regenerate is off because there is nothing for the AI to ask about.</p> : null}
          </div>
        )}
      </Card>

      {/* Approval */}
      <Card className="p-4">
        <SectionTitle title="Approval" hint="Approving hands the RFQ to estimation." />
        {c.rfqApproved ? (
          <div className="mt-3 space-y-3">
            <Callout tone="ok" icon={BadgeCheck} title="Approved for estimation">
              This RFQ is released to the next step.
            </Callout>
            <Button icon={Undo2} onClick={() => setRfqApproved(qid, false)}>
              Withdraw approval
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={BadgeCheck} disabled={!allReady} onClick={() => setRfqApproved(qid, true)}>
                Approve for estimation
              </Button>
              {!allReady && extractionOk ? (
                <Button icon={AlertTriangle} onClick={() => setOpenItems((v) => !v)} aria-expanded={openItems}>
                  Approve with open items
                </Button>
              ) : null}
            </div>
            {!allReady ? (
              <p className="text-xs text-muted">
                {extractionOk
                  ? `Approval is off: ${attention} required ${attention === 1 ? "field is" : "fields are"} not ready. Fix them in the Review extraction tab, ask the customer, or approve with a reason.`
                  : "Approval is off: extraction must succeed first. Open the Review extraction tab."}
              </p>
            ) : null}
            {openItems && !allReady && extractionOk ? (
              <div className="space-y-2 rounded-control border border-warn-line bg-warn-soft p-3">
                <TextArea
                  label="Why approve with open items?"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  hint={`At least 10 characters. ${reason.trim().length} so far. The reason is saved in the activity log.`}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" disabled={!reasonOk} onClick={approveWithOpenItems}>
                    Approve with {attention} open {attention === 1 ? "item" : "items"}
                  </Button>
                  <Button
                    onClick={() => {
                      setOpenItems(false);
                      setReason("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
