import { Ban, CircleCheck, CircleDashed, PencilLine, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "../../components/ui";
import type { ExtractedField, FieldState, SchemaField } from "../../studio/types";

/** One place that says what each field state is called, what it looks like and which tone it uses. */
export const STATE_META: Record<FieldState, { label: string; tone: Tone; icon: LucideIcon }> = {
  verified: { label: "Verified", tone: "ok", icon: CircleCheck },
  edited: { label: "Edited", tone: "info", icon: PencilLine },
  needs_review: { label: "Needs review", tone: "warn", icon: TriangleAlert },
  missing: { label: "Missing", tone: "danger", icon: CircleDashed },
  na: { label: "Not applicable", tone: "neutral", icon: Ban },
};

/** Highlight box colors on the document. Class names are written out so Tailwind can see them. */
export const BOX_CLASS: Record<Tone, { idle: string; selected: string }> = {
  neutral: { idle: "border-line-strong bg-surface-2/30", selected: "border-ink-2 bg-surface-2/60 ring-2 ring-ring" },
  ok: { idle: "border-ok-solid bg-ok-soft/30", selected: "border-ok-solid bg-ok-soft/60 ring-2 ring-ring" },
  warn: { idle: "border-warn-solid bg-warn-soft/30", selected: "border-warn-solid bg-warn-soft/60 ring-2 ring-ring" },
  alert: { idle: "border-alert-solid bg-alert-soft/30", selected: "border-alert-solid bg-alert-soft/60 ring-2 ring-ring" },
  danger: { idle: "border-danger-solid bg-danger-soft/30", selected: "border-danger-solid bg-danger-soft/60 ring-2 ring-ring" },
  info: { idle: "border-info-solid bg-info-soft/30", selected: "border-info-solid bg-info-soft/60 ring-2 ring-ring" },
  violet: { idle: "border-violet-solid bg-violet-soft/30", selected: "border-violet-solid bg-violet-soft/60 ring-2 ring-ring" },
  teal: { idle: "border-teal-solid bg-teal-soft/30", selected: "border-teal-solid bg-teal-soft/60 ring-2 ring-ring" },
};

export const BOX_LABEL_CLASS: Record<Tone, { idle: string; selected: string }> = {
  neutral: { idle: "border-line-strong bg-surface text-ink-2", selected: "border-line-strong bg-ink-2 text-surface" },
  ok: { idle: "border-ok-line bg-surface text-ok-fg", selected: "border-ok-solid bg-ok-solid text-on-accent" },
  warn: { idle: "border-warn-line bg-surface text-warn-fg", selected: "border-warn-solid bg-warn-solid text-on-accent" },
  alert: { idle: "border-alert-line bg-surface text-alert-fg", selected: "border-alert-solid bg-alert-solid text-on-accent" },
  danger: { idle: "border-danger-line bg-surface text-danger-fg", selected: "border-danger-solid bg-danger-solid text-on-accent" },
  info: { idle: "border-info-line bg-surface text-info-fg", selected: "border-info-solid bg-info-solid text-on-accent" },
  violet: { idle: "border-violet-line bg-surface text-violet-fg", selected: "border-violet-solid bg-violet-solid text-on-accent" },
  teal: { idle: "border-teal-line bg-surface text-teal-fg", selected: "border-teal-solid bg-teal-solid text-on-accent" },
};

/** Per field threshold from the live agent schema, otherwise the agent wide one. */
export function thresholdFor(key: string, schema: SchemaField[], fallback: number): number {
  return schema.find((s) => s.name === key)?.threshold ?? fallback;
}

/** A field the human added is one the agent schema does not know. Only those can be removed. */
export function isHumanAdded(field: ExtractedField, schema: SchemaField[]): boolean {
  return !schema.some((s) => s.name === field.key);
}

/** The state a field goes back to when a human undoes a decision. */
export function restingState(field: ExtractedField, threshold: number): FieldState {
  if (field.value === null || field.value === "") return "missing";
  if (field.aiValue !== undefined && field.aiValue !== field.value) return "edited";
  if (field.confidence === null) return "edited";
  return field.confidence >= threshold ? "verified" : "needs_review";
}

/**
 * The agent's note can mean two different things: it could not read the value at all,
 * or it read it but more than one answer is possible. The person fixing it needs to know which.
 */
export function noteKind(note: string | undefined): "ambiguous" | "unreadable" | null {
  if (!note) return null;
  if (/two ways|two readings|ambigu|could be|may be|might be|disagree|conflict|either|converted|plausible/i.test(note)) return "ambiguous";
  if (/hidden|low contrast|illegible|cannot be read|could not|can't|blurred|blurry|cut off|too faint|faint|unreadable/i.test(note)) return "unreadable";
  return null;
}

export const NOTE_LABEL = { ambiguous: "Read, but ambiguous", unreadable: "Could not read" } as const;

/** length_in becomes Length with unit in. Used when a field is created from the agent schema. */
export function labelFromKey(key: string): { label: string; unit?: string } {
  const unit = key.endsWith("_in") ? "in" : undefined;
  const words = key.replace(/_in$/, "").replace(/_/g, " ").trim();
  return { label: words ? words.charAt(0).toUpperCase() + words.slice(1) : key, unit };
}

export function keyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f_$1");
}

export const BULK_ACCEPT_PCT = 90;
