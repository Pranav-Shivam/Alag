import { useState } from "react";
import { Bot, CheckCircle2, Copy, Forward, Mail, User } from "lucide-react";
import AddAttachments from "../components/attachments/AddAttachments";
import AttachmentList from "../components/attachments/AttachmentList";
import type { CaseProps } from "../components/inspector/types";
import { Card, Chip, SectionTitle, SimulatedTag } from "../components/ui";
import { useCase, useStudio } from "../studio/store";

function formatReceived(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Step1Email({ quotation }: CaseProps) {
  const c = useCase(quotation.id);
  const addAttachment = useStudio((s) => s.addAttachment);
  const removeAttachment = useStudio((s) => s.removeAttachment);
  const [message, setMessage] = useState("");

  if (!c) return <div className="text-sm text-muted">No case data for {quotation.id}.</div>;
  const { email } = c;

  return (
    <div className="space-y-4">
      {/* AI result */}
      <Card className="p-4">
        <SectionTitle
          title="RFQ Agent result"
          hint="What the agent decided when this email arrived."
          action={
            <span className="flex shrink-0 items-center gap-1.5">
              <Bot className="h-4 w-4 text-muted" aria-hidden="true" />
              <SimulatedTag />
            </span>
          }
        />
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="RFQ Agent result">
          <li>
            <Chip tone="ok" icon={CheckCircle2}>
              Classified as RFQ
            </Chip>
          </li>
          <li>
            <Chip tone="ok">Confidence 97%</Chip>
          </li>
          <li>
            <Chip tone="ok" icon={Copy}>
              Not a duplicate
            </Chip>
          </li>
          <li>
            <Chip tone="info" icon={User}>
              Customer: {quotation.customer}
            </Chip>
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted">This is a sample output made for the demo. A real agent would produce it from the email text.</p>
      </Card>

      {/* Email */}
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-surface-2 px-4 py-3">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <h3 className="break-words text-sm font-semibold text-ink">{email.subject}</h3>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted">From</dt>
            <dd className="min-w-0 break-words text-ink">
              <span className="font-medium">{email.fromName}</span> <span className="text-ink-2">&lt;{email.from}&gt;</span>
            </dd>
            <dt className="text-muted">To</dt>
            <dd className="min-w-0 break-words text-ink">{email.to}</dd>
            <dt className="text-muted">Received</dt>
            <dd className="text-ink">{formatReceived(email.receivedAt)}</dd>
            <dt className="text-muted">Forwarded by</dt>
            <dd className="flex min-w-0 items-center gap-1 text-ink">
              <Forward className="h-3 w-3 shrink-0 text-muted" aria-hidden="true" />
              {email.forwardedBy}, estimator
            </dd>
          </dl>
        </div>
        <div className="px-4 py-3">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{email.body}</p>
          <p className="mt-4 whitespace-pre-wrap break-words border-t border-line pt-3 text-xs leading-relaxed text-muted">{email.signature}</p>
        </div>
      </Card>

      <AttachmentList
        attachments={c.attachments}
        onRemove={(a) => {
          removeAttachment(quotation.id, a.id);
          setMessage(`Removed ${a.name}.`);
        }}
      />

      <AddAttachments attachments={c.attachments} onAdd={(a) => addAttachment(quotation.id, a)} onMessage={setMessage} />

      <p role="status" aria-live="polite" className={message ? "flex items-center gap-1.5 text-xs font-medium text-ok-fg" : "sr-only"}>
        {message ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {message}
      </p>
    </div>
  );
}
