import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Ban, Check, FileText, MailQuestionMark, Pencil, SearchX, Trash2, Undo2 } from "lucide-react";
import { Button, Chip, ConfidenceMeter, TextInput, TONE } from "../../components/ui";
import type { Attachment, ExtractedField } from "../../studio/types";
import { NOTE_LABEL, STATE_META, noteKind } from "./fieldMeta";

export interface FieldRowProps {
  field: ExtractedField;
  threshold: number;
  selected: boolean;
  editing: boolean;
  tabbable: boolean;
  attachments: Attachment[];
  /** True for fields the human added. Only those can be removed, and they never had an AI reading. */
  humanAdded: boolean;
  inClarification: boolean;
  clarificationSent: boolean;
  rowRef: (el: HTMLLIElement | null) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (value: string) => void;
  onAccept: () => void;
  onToggleNa: () => void;
  onReset: () => void;
  onRemove: () => void;
  onAsk: () => void;
}

export default function FieldRow(p: FieldRowProps) {
  const { field: f } = p;
  const meta = STATE_META[f.state];
  const Icon = meta.icon;
  const att = f.source ? p.attachments.find((a) => a.id === f.source?.attachmentId) : undefined;
  const hasValue = f.value !== null && f.value !== "";
  const kind = f.state === "needs_review" ? noteKind(f.note) : null;
  const redundantNote = f.state === "edited" && /^edited by a human/i.test(f.note ?? "");
  const showAi = !p.humanAdded && f.aiValue !== undefined;
  const canReset = f.state === "edited" && showAi;

  return (
    <li
      ref={p.rowRef}
      tabIndex={p.tabbable ? 0 : -1}
      aria-current={p.selected ? "true" : undefined}
      aria-label={`${f.label}, ${meta.label}`}
      data-field={f.key}
      onClick={p.onSelect}
      className={`rounded-xl border bg-surface p-3 shadow-xs transition-colors ${p.selected ? "border-ring ring-2 ring-ring/40" : "border-line hover:border-line-strong"}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${TONE[meta.tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-ink">{f.label}</span>
            {f.required ? <span className="text-xs font-medium text-muted">Required</span> : null}
            <Chip tone={meta.tone} icon={meta.icon} className="ml-auto">
              {meta.label}
            </Chip>
          </div>

          {p.editing ? (
            <EditForm field={f} onSave={p.onSave} onCancel={p.onCancelEdit} />
          ) : (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  p.onSelect();
                  p.onStartEdit();
                }}
                aria-label={`Edit ${f.label}`}
                title="Click to edit"
                className="min-w-0 max-w-full rounded-md px-1 py-0.5 text-left hover:bg-surface-2"
              >
                {hasValue ? (
                  <>
                    <span className={`break-words text-base font-medium ${f.state === "na" ? "text-muted line-through" : "text-ink"}`}>{f.value}</span>
                    {f.unit ? <span className="ml-1 text-sm text-muted">{f.unit}</span> : null}
                  </>
                ) : (
                  <span className="text-sm text-muted">No value yet</span>
                )}
              </button>
              {f.state === "verified" || f.state === "needs_review" ? <ConfidenceMeter pct={f.confidence} /> : null}
              {f.state === "edited" ? <span className="text-xs text-muted">Checked by a person</span> : null}
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {att && f.source ? (
              <Chip tone="neutral" icon={FileText} className="min-w-0 max-w-full">
                <span className="truncate">
                  {att.name}
                  {f.source.page ? `, page ${f.source.page}` : ""}
                </span>
              </Chip>
            ) : (
              <Chip tone={hasValue ? "warn" : "neutral"} icon={SearchX}>
                No source found
              </Chip>
            )}
            {f.confidence !== null && f.state !== "edited" && f.state !== "na" ? <span className="text-xs text-muted">Review below {p.threshold}%</span> : null}
          </div>

          {f.note && !redundantNote ? (
            <p className="mt-1.5 text-xs text-ink-2">
              {kind ? <span className="font-semibold">{NOTE_LABEL[kind]}. </span> : null}
              {f.note}
            </p>
          ) : null}

          {showAi ? (
            <p className="mt-1 text-xs text-muted">
              AI read: <span className="font-medium text-ink-2">{f.aiValue ? `${f.aiValue}${f.unit ? ` ${f.unit}` : ""}` : "no value"}</span>
            </p>
          ) : null}

          {!p.editing ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.state === "na" ? (
                <Button size="sm" icon={Undo2} onClick={p.onToggleNa} aria-label={`Restore ${f.label}`}>
                  Restore field
                </Button>
              ) : (
                <>
                  {f.state === "missing" ? (
                    <>
                      <Button size="sm" variant="primary" icon={Pencil} onClick={p.onStartEdit} aria-label={`Type the value for ${f.label}`}>
                        Type the value
                      </Button>
                      <Button size="sm" icon={p.inClarification ? Check : MailQuestionMark} onClick={p.onAsk} disabled={p.inClarification || p.clarificationSent} aria-label={`Ask the customer for ${f.label}`}>
                        {p.inClarification ? "In the clarification draft" : "Ask the customer"}
                      </Button>
                    </>
                  ) : (
                    <>
                      {f.state === "needs_review" ? (
                        <Button size="sm" variant="primary" icon={Check} onClick={p.onAccept} aria-label={`Accept ${f.label}`}>
                          Accept
                        </Button>
                      ) : null}
                      <Button size="sm" icon={Pencil} onClick={p.onStartEdit} aria-label={`Edit ${f.label}`}>
                        Edit
                      </Button>
                      {canReset ? (
                        <Button size="sm" icon={Undo2} onClick={p.onReset} aria-label={`Reset ${f.label} to the AI value`}>
                          Reset to AI value
                        </Button>
                      ) : null}
                    </>
                  )}
                  <Button size="sm" variant="ghost" icon={Ban} onClick={p.onToggleNa} aria-label={`Mark ${f.label} as not applicable`}>
                    Not applicable
                  </Button>
                </>
              )}
              {p.humanAdded ? (
                <Button size="sm" variant="ghost" icon={Trash2} onClick={p.onRemove} aria-label={`Remove ${f.label}`}>
                  Remove
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function EditForm({ field, onSave, onCancel }: { field: ExtractedField; onSave: (v: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(field.value ?? "");
  const empty = draft.trim() === "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!empty) onSave(draft.trim());
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <form onSubmit={submit} onKeyDown={onKey} onClick={(e) => e.stopPropagation()} className="mt-1.5">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextInput label={`New value for ${field.label}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus onFocus={(e) => e.currentTarget.select()} />
        </div>
        {field.unit ? <span className="pb-2.5 text-sm text-muted">{field.unit}</span> : null}
      </div>
      <p className="mt-1 text-xs text-muted">Press Enter to save or Escape to cancel. If the field does not apply, use Not applicable.</p>
      <div className="mt-2 flex gap-1.5">
        <Button type="submit" size="sm" variant="primary" icon={Check} disabled={empty}>
          Save
        </Button>
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
