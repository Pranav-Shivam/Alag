import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Bot } from "lucide-react";
import type { CaseProps } from "../components/inspector/types";
import { Card, SimulatedTag, relTime } from "../components/ui";
import { useAgent, useCase, useStudio } from "../studio/store";
import type { ExtractedField, QuotationCase } from "../studio/types";
import type { Quotation } from "../types";
import AddFieldForm from "./review/AddFieldForm";
import { betterFileDraft, isAsked, withAskedField } from "./review/clarify";
import DocumentViewer from "./review/DocumentViewer";
import FieldRow from "./review/FieldRow";
import { BULK_ACCEPT_PCT, isHumanAdded, restingState, thresholdFor } from "./review/fieldMeta";
import { buildResult, emptyFieldsFromSchema, simulateExtraction, simulatePartialExtraction, simulatedDelay } from "./review/simulate";
import { AttentionBanner, FailedState, NotRunState } from "./review/States";
import { ShortcutsPanel, Triage } from "./review/Triage";
import type { Counts } from "./review/Triage";

export default function Step2Review({ quotation }: CaseProps) {
  const c = useCase(quotation.id);
  if (!c) return <p className="text-sm text-muted">No data was found for this quotation.</p>;
  return <Review quotation={quotation} c={c} />;
}

const openAgentTab = () => window.dispatchEvent(new CustomEvent("alag:open-tab", { detail: { tab: "agent" } }));

function Review({ quotation, c }: { quotation: Quotation; c: QuotationCase }) {
  const qid = quotation.id;
  const agent = useAgent(2);
  const setExtraction = useStudio((s) => s.setExtraction);
  const editFieldValue = useStudio((s) => s.editFieldValue);
  const setFieldState = useStudio((s) => s.setFieldState);
  const patchField = useStudio((s) => s.patchField);
  const addField = useStudio((s) => s.addField);
  const removeField = useStudio((s) => s.removeField);
  const setClarification = useStudio((s) => s.setClarification);

  const { extraction, attachments, clarification } = c;
  const fields = extraction.fields;
  const schema = agent.live.schema;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [attId, setAttId] = useState<string>(attachments[0]?.id ?? "");
  const [pages, setPages] = useState<Record<string, number>>({});
  const [viewerOpen, setViewerOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [announce, setAnnounce] = useState("");

  const rowEls = useRef<Record<string, HTMLLIElement | null>>({});
  const focusAfterSelect = useRef(false);

  const currentAttId = attachments.some((a) => a.id === attId) ? attId : (attachments[0]?.id ?? "");
  const currentAtt = attachments.find((a) => a.id === currentAttId);
  const thresholdOf = (key: string) => thresholdFor(key, schema, agent.live.confidenceThreshold);

  const counts = useMemo<Counts>(() => {
    const out: Counts = { verified: 0, edited: 0, needs_review: 0, missing: 0, na: 0 };
    for (const f of fields) out[f.state] += 1;
    return out;
  }, [fields]);
  const attention = counts.needs_review + counts.missing;
  const bulk = fields.filter((f) => f.state === "needs_review" && f.confidence !== null && f.confidence >= BULK_ACCEPT_PCT);

  // After a selection by keyboard or box click, move focus to the row so shortcuts keep working.
  useEffect(() => {
    if (!selectedKey) return;
    const el = rowEls.current[selectedKey];
    if (!el) return;
    if (focusAfterSelect.current) {
      focusAfterSelect.current = false;
      el.focus({ preventScroll: true });
    }
    el.scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  /* ------------------------------ Selection ------------------------------ */

  const select = (key: string, moveFocus = false) => {
    focusAfterSelect.current = moveFocus;
    setSelectedKey(key);
    if (editingKey && editingKey !== key) setEditingKey(null);
    const src = fields.find((f) => f.key === key)?.source;
    if (src) {
      if (attachments.some((a) => a.id === src.attachmentId)) setAttId(src.attachmentId);
      if (src.page) setPages((p) => ({ ...p, [src.attachmentId]: src.page as number }));
    }
  };

  const move = (delta: number) => {
    if (fields.length === 0) return;
    const i = fields.findIndex((f) => f.key === selectedKey);
    const next = i < 0 ? (delta > 0 ? 0 : fields.length - 1) : Math.min(fields.length - 1, Math.max(0, i + delta));
    select(fields[next].key, true);
  };

  const nextAttention = () => {
    if (attention === 0) return;
    const start = fields.findIndex((f) => f.key === selectedKey);
    for (let step = 1; step <= fields.length; step++) {
      const f = fields[(start + step + fields.length) % fields.length];
      if (f.state === "needs_review" || f.state === "missing") {
        select(f.key, true);
        return;
      }
    }
  };

  /* ------------------------------ Field actions ------------------------------ */

  const returnFocus = (key: string) => requestAnimationFrame(() => rowEls.current[key]?.focus({ preventScroll: true }));

  const accept = (f: ExtractedField) => {
    if (f.state === "missing" || f.state === "na") return;
    setFieldState(qid, f.key, "verified");
    setAnnounce(`${f.label} marked Verified.`);
  };

  const save = (f: ExtractedField, value: string) => {
    editFieldValue(qid, f.key, value);
    setEditingKey(null);
    setAnnounce(`${f.label} saved as ${value}. Marked Edited.`);
    returnFocus(f.key);
  };

  const cancelEdit = (key: string) => {
    setEditingKey(null);
    returnFocus(key);
  };

  const toggleNa = (f: ExtractedField) => {
    if (f.state === "na") {
      setFieldState(qid, f.key, restingState(f, thresholdOf(f.key)));
      setAnnounce(`${f.label} restored.`);
    } else {
      setFieldState(qid, f.key, "na");
      setAnnounce(`${f.label} marked Not applicable.`);
    }
  };

  const reset = (f: ExtractedField) => {
    if (f.aiValue === undefined) return;
    editFieldValue(qid, f.key, f.aiValue);
    // editFieldValue always says "edited". Going back to the AI value puts the field back where the AI had it.
    const back: ExtractedField = { ...f, value: f.aiValue, aiValue: undefined };
    patchField(qid, f.key, { state: restingState(back, thresholdOf(f.key)), aiValue: undefined, note: "Restored to the AI reading." });
    setAnnounce(`${f.label} reset to the AI value.`);
  };

  const remove = (f: ExtractedField) => {
    removeField(qid, f.key);
    if (selectedKey === f.key) setSelectedKey(null);
    setAnnounce(`${f.label} removed.`);
  };

  const ask = (f: ExtractedField) => {
    if (clarification?.status === "sent") return;
    setClarification(qid, withAskedField(c, quotation, f));
    setAnnounce(`${f.label} added to the clarification draft in the RFQ approval step.`);
  };

  const acceptAll = () => {
    for (const f of bulk) setFieldState(qid, f.key, "verified");
    setAnnounce(`Accepted ${bulk.length} ${bulk.length === 1 ? "field" : "fields"} at ${BULK_ACCEPT_PCT} percent or higher.`);
  };

  /* ------------------------------ Simulated runs and recovery ------------------------------ */

  const runSimulated = (partial: boolean) => {
    if (running) return;
    setRunning(true);
    window.setTimeout(() => {
      const list = partial ? simulatePartialExtraction(quotation, attachments) : simulateExtraction(quotation, attachments);
      setExtraction(qid, buildResult(list, agent.version, agent.live.model));
      setSelectedKey(null);
      setRunning(false);
      setAnnounce(`Extraction finished with ${list.length} fields.`);
    }, simulatedDelay());
  };

  const enterManually = () => {
    setExtraction(qid, buildResult(emptyFieldsFromSchema(schema), undefined, undefined));
    setSelectedKey(null);
    setAnnounce("Created empty fields. Type the values from the file.");
  };

  const askBetterFile = () => {
    setClarification(qid, betterFileDraft(c, quotation));
    setAnnounce("Clarification draft created. It is in the RFQ approval step.");
  };

  /* ------------------------------ Keyboard ------------------------------ */

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (extraction.status !== "done") return;
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, select, [contenteditable='true'], [data-viewer]")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const selected = fields.find((f) => f.key === selectedKey);
    const onControl = !!t.closest("button, a, summary");

    switch (e.key) {
      case "ArrowDown":
      case "j":
        move(1);
        break;
      case "ArrowUp":
      case "k":
        move(-1);
        break;
      case "]":
        nextAttention();
        break;
      case "e":
        if (!selected || selected.state === "na") return;
        setEditingKey(selected.key);
        break;
      case "n":
        if (!selected) return;
        toggleNa(selected);
        break;
      case "Enter":
        if (onControl || !selected) return;
        if (selected.state === "missing") setEditingKey(selected.key);
        else accept(selected);
        break;
      case "?":
        setShortcutsOpen((v) => !v);
        break;
      case "Escape":
        if (!shortcutsOpen) return;
        setShortcutsOpen(false);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  /* ------------------------------ Render ------------------------------ */

  const done = extraction.status === "done";
  const hasRun = !!extraction.model;

  return (
    <div className="@container space-y-3" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        {hasRun ? (
          <span>
            Agent version {extraction.agentVersion ?? agent.version}, {extraction.model}
            {extraction.ranAt ? `, ${relTime(extraction.ranAt)}` : ""}
          </span>
        ) : done ? (
          <span>No agent run. The values were entered by hand.</span>
        ) : (
          <span>
            Agent version {agent.version}, {agent.live.model}
          </span>
        )}
        <SimulatedTag />
        <button type="button" onClick={openAgentTab} className="font-medium text-accent-fg underline underline-offset-2 hover:text-accent-hover">
          Edit extraction instructions
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {extraction.status === "not_run" ? <NotRunState running={running} fileCount={attachments.length} onRun={() => runSimulated(false)} /> : null}

      {extraction.status === "failed" ? (
        <FailedState
          reason={extraction.failureReason ?? "The agent could not read the attachments."}
          prompt={agent.live.extractionPrompt}
          running={running}
          fileCount={attachments.length}
          hasDraft={!!clarification}
          draftSent={clarification?.status === "sent"}
          onRerun={() => runSimulated(true)}
          onManual={enterManually}
          onAskBetterFile={askBetterFile}
          onEditAgent={openAgentTab}
        />
      ) : null}

      {done ? (
        <>
          <Triage
            counts={counts}
            total={fields.length}
            attention={attention}
            bulkCount={bulk.length}
            shortcutsOpen={shortcutsOpen}
            onToggleShortcuts={() => setShortcutsOpen((v) => !v)}
            onNext={nextAttention}
            onBulkAccept={acceptAll}
          />
          {shortcutsOpen ? <ShortcutsPanel onClose={() => setShortcutsOpen(false)} /> : null}
          {fields.length > 0 ? <AttentionBanner needsReview={counts.needs_review} missing={counts.missing} onNext={nextAttention} /> : null}
        </>
      ) : null}

      <div className={`grid gap-3 ${done ? "@2xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @2xl:items-start" : ""}`}>
        <DocumentViewer
          attachments={attachments}
          currentId={currentAttId}
          onChangeAttachment={setAttId}
          fields={fields}
          selectedKey={selectedKey}
          onSelectField={(key) => select(key, true)}
          page={currentAtt ? (pages[currentAtt.id] ?? 1) : 1}
          onPageChange={(p) => currentAtt && setPages((prev) => ({ ...prev, [currentAtt.id]: p }))}
          open={viewerOpen}
          onToggle={() => setViewerOpen((v) => !v)}
        />

        {done ? (
          <section aria-label="Extracted fields" className="min-w-0 space-y-3">
            <p className="text-xs text-muted">Select a field to see where it was read. Select a box on the document to jump to its field. Press ? for keyboard shortcuts.</p>
            {fields.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted" as="div">
                There are no fields yet. Add the ones you need below.
              </Card>
            ) : (
              <ul className="space-y-2" aria-label="Fields">
                {fields.map((f, i) => {
                  const firstTabbable = selectedKey === null ? i === 0 : f.key === selectedKey;
                  return (
                    <FieldRow
                      key={f.key}
                      field={f}
                      threshold={thresholdOf(f.key)}
                      selected={f.key === selectedKey}
                      editing={f.key === editingKey}
                      tabbable={firstTabbable}
                      attachments={attachments}
                      humanAdded={isHumanAdded(f, schema)}
                      inClarification={isAsked(clarification, f)}
                      clarificationSent={clarification?.status === "sent"}
                      rowRef={(el) => {
                        rowEls.current[f.key] = el;
                      }}
                      onSelect={() => select(f.key)}
                      onStartEdit={() => {
                        select(f.key);
                        setEditingKey(f.key);
                      }}
                      onCancelEdit={() => cancelEdit(f.key)}
                      onSave={(v) => save(f, v)}
                      onAccept={() => accept(f)}
                      onToggleNa={() => toggleNa(f)}
                      onReset={() => reset(f)}
                      onRemove={() => remove(f)}
                      onAsk={() => ask(f)}
                    />
                  );
                })}
              </ul>
            )}
            <AddFieldForm
              existingKeys={fields.map((f) => f.key)}
              onAdd={(field) => {
                addField(qid, field);
                setAnnounce(`${field.label} added.`);
              }}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
