import { useState } from "react";
import { HighlightedText } from "../../components/agent/ResponseView";
import { ArrowDownToLine, FileSearch, ListChecks, MailQuestionMark, Play, RotateCcw, TriangleAlert, CircleCheck } from "lucide-react";
import { Button, Callout, Card, SimulatedTag, TextArea } from "../../components/ui";

/** Shown when the agent has not read the files yet. */
export function NotRunState({ running, fileCount, onRun }: { running: boolean; fileCount: number; onRun: () => void }) {
  return (
    <Card className="p-5 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-surface border border-line bg-surface-2 text-muted">
        <FileSearch className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="t-label mt-3">Extraction has not run yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        The agent has not read the attachments for this quotation, so there are no fields to review. Run the extraction to get a first reading, then check what it found.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" icon={Play} loading={running} onClick={onRun} disabled={running || fileCount === 0}>
          {running ? "Reading the files" : "Run extraction"}
        </Button>
        <SimulatedTag />
      </div>
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {fileCount === 0 ? "Add an attachment in the email step first." : running ? `Reading ${fileCount} ${fileCount === 1 ? "file" : "files"}.` : `${fileCount} ${fileCount === 1 ? "file" : "files"} ready to read.`}
      </p>
    </Card>
  );
}

const SUGGESTED_INSTRUCTION = "The scan is skewed. Read printed dimension lines only and treat handwriting as low confidence.";

interface FailedProps {
  reason: string;
  prompt: string | undefined;
  running: boolean;
  fileCount: number;
  hasDraft: boolean;
  draftSent: boolean;
  onRerun: (instruction: string) => void;
  onManual: () => void;
  onAskBetterFile: () => void;
  onEditAgent: () => void;
}

/** The agent could not read the files. Three ways forward, each a card. */
export function FailedState({ reason, prompt, running, fileCount, hasDraft, draftSent, onRerun, onManual, onAskBetterFile, onEditAgent }: FailedProps) {
  const [instruction, setInstruction] = useState(SUGGESTED_INSTRUCTION);
  return (
    <div className="space-y-3">
      <Callout tone="danger" title="The agent could not extract any field" icon={TriangleAlert}>
        {reason}
      </Callout>
      <p className="text-xs font-medium text-ink-2">Choose how to continue</p>

      <Card className="p-3" as="div">
        <CardHead n={1} icon={RotateCcw} title="Re-run with different instructions" />
        <div className="mt-2 space-y-2">
          <TextArea label="Instruction for this run" rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} hint="This instruction applies to this run only and does not change the agent." />
          <details className="rounded-control border border-line bg-surface-2 p-2">
            <summary className="cursor-pointer text-xs font-medium text-ink-2">View the live extraction prompt (read only)</summary>
            <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-chip bg-surface p-2 text-sm leading-relaxed text-ink-2">{prompt?.trim() ? <HighlightedText text={prompt} /> : "The agent has no extraction prompt set."}</p>
            <p className="mt-1.5 text-xs text-muted">
              To change the prompt for every quotation,{" "}
              <button type="button" onClick={onEditAgent} className="font-medium text-accent-fg underline underline-offset-2 hover:text-accent-hover">
                edit the extraction instructions
              </button>
              .
            </p>
          </details>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={Play} loading={running} onClick={() => onRerun(instruction)} disabled={running || fileCount === 0}>
              {running ? "Reading the files" : "Re-run extraction"}
            </Button>
            <SimulatedTag />
          </div>
          <p className="text-xs text-muted" aria-live="polite">
            {running ? "Reading the files with your instruction." : "A stricter run usually returns a partial result that a person then completes."}
          </p>
        </div>
      </Card>

      <Card className="p-3" as="div">
        <CardHead n={2} icon={ListChecks} title="Enter fields manually" />
        <p className="mt-2 text-sm text-muted">Creates an empty field for every item the agent looks for, marked Missing. You type the values while looking at the file.</p>
        <Button className="mt-2" icon={ListChecks} onClick={onManual}>
          Create empty fields
        </Button>
      </Card>

      <Card className="p-3" as="div">
        <CardHead n={3} icon={MailQuestionMark} title="Ask the customer for a better file" />
        <p className="mt-2 text-sm text-muted">Writes a polite email asking for a clearer scan or photo with the dimensions visible. Nothing is sent from here.</p>
        {hasDraft ? (
          <Callout tone="ok" icon={CircleCheck} className="mt-2" title={draftSent ? "A clarification email was already sent" : "The clarification draft is ready"}>
            {draftSent ? "It is recorded in the RFQ approval step." : "Review and send it in the RFQ approval step."}
          </Callout>
        ) : (
          <Button className="mt-2" icon={MailQuestionMark} onClick={onAskBetterFile}>
            Create the email draft
          </Button>
        )}
      </Card>
    </div>
  );
}

function CardHead({ n, icon: Icon, title }: { n: number; icon: typeof RotateCcw; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2 ring-1 ring-line" aria-hidden="true">
        {n}
      </span>
      <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
      <h3 className="t-label">{title}</h3>
    </div>
  );
}

/** Summary of what is still open after a run, with a way to jump to it. */
export function AttentionBanner({ needsReview, missing, onNext }: { needsReview: number; missing: number; onNext: () => void }) {
  const total = needsReview + missing;
  if (total === 0) {
    return (
      <Callout tone="ok" icon={CircleCheck} title="Every field is resolved">
        Nothing is waiting for a person. The RFQ can move to approval.
      </Callout>
    );
  }
  const parts: string[] = [];
  if (needsReview > 0) parts.push(`${needsReview} ${needsReview === 1 ? "needs" : "need"} review`);
  if (missing > 0) parts.push(`${missing} ${missing === 1 ? "is" : "are"} missing`);
  return (
    <Callout tone="warn" icon={TriangleAlert} title={`${total} ${total === 1 ? "field is" : "fields are"} still open`}>
      <p>
        {parts.join(" and ")}. Check them against the document, or ask the customer for what is missing.
      </p>
      <Button className="mt-2" size="sm" icon={ArrowDownToLine} onClick={onNext}>
        Next field needing review
      </Button>
    </Callout>
  );
}
