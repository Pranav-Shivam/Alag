import { useState } from "react";
import { ArrowDownToLine, CheckCheck, Keyboard, X } from "lucide-react";
import { Button, Callout, Card, Chip } from "../../components/ui";
import type { FieldState } from "../../studio/types";
import { BULK_ACCEPT_PCT, STATE_META } from "./fieldMeta";

export type Counts = Record<FieldState, number>;

const ORDER: FieldState[] = ["verified", "edited", "needs_review", "missing"];

interface Props {
  counts: Counts;
  total: number;
  attention: number;
  bulkCount: number;
  shortcutsOpen: boolean;
  onToggleShortcuts: () => void;
  onNext: () => void;
  onBulkAccept: () => void;
}

export function Triage({ counts, total, attention, bulkCount, shortcutsOpen, onToggleShortcuts, onNext, onBulkAccept }: Props) {
  const [confirming, setConfirming] = useState(false);
  const resolved = counts.verified + counts.edited + counts.na;
  const pct = total === 0 ? 0 : Math.round((resolved / total) * 100);

  return (
    <Card className="p-3">
      <div aria-live="polite" aria-atomic="true">
        <div className="flex flex-wrap items-center gap-1.5">
          {ORDER.map((s) => (
            <Chip key={s} tone={counts[s] > 0 || s === "verified" ? STATE_META[s].tone : "neutral"} icon={STATE_META[s].icon}>
              {STATE_META[s].label} {counts[s]}
            </Chip>
          ))}
          {counts.na > 0 ? (
            <Chip tone="neutral" icon={STATE_META.na.icon}>
              {STATE_META.na.label} {counts.na}
            </Chip>
          ) : null}
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <div
            role="progressbar"
            aria-label="Fields resolved"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={`${resolved} of ${total} fields resolved`}
            className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-ok-solid transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-ink-2">
            {resolved} of {total} resolved
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" icon={ArrowDownToLine} onClick={onNext} disabled={attention === 0}>
          Next field needing review
        </Button>
        <Button size="sm" icon={CheckCheck} onClick={() => setConfirming(true)} disabled={bulkCount === 0} title={bulkCount === 0 ? `No field waiting for review is at ${BULK_ACCEPT_PCT} percent or higher` : undefined}>
          Accept all above {BULK_ACCEPT_PCT}%
          {bulkCount > 0 ? ` (${bulkCount})` : ""}
        </Button>
        <Button size="sm" variant="ghost" icon={Keyboard} onClick={onToggleShortcuts} aria-expanded={shortcutsOpen} aria-controls="review-shortcuts">
          Shortcuts
        </Button>
      </div>

      {confirming && bulkCount > 0 ? (
        <Callout tone="info" title={`Accept ${bulkCount} ${bulkCount === 1 ? "field" : "fields"} at ${BULK_ACCEPT_PCT}% or higher?`} className="mt-3">
          <p>They will be marked Verified. You can still edit any of them afterwards.</p>
          <div className="mt-2 flex gap-1.5">
            <Button
              size="sm"
              variant="primary"
              icon={CheckCheck}
              onClick={() => {
                onBulkAccept();
                setConfirming(false);
              }}
            >
              Accept {bulkCount}
            </Button>
            <Button size="sm" icon={X} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </Callout>
      ) : null}
    </Card>
  );
}

const KEYS: [string, string][] = [
  ["ArrowDown or j", "Next field"],
  ["ArrowUp or k", "Previous field"],
  ["e", "Edit the selected field"],
  ["Enter", "Accept the selected field (mark Verified)"],
  ["n", "Mark Not applicable, or restore it"],
  ["]", "Next field needing review"],
  ["?", "Show or hide this list"],
  ["Escape", "Cancel an edit or close this list"],
];

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Card className="p-3" as="div">
      <div id="review-shortcuts" role="region" aria-label="Keyboard shortcuts">
        <div className="flex items-center justify-between gap-2">
          <h3 className="t-label">Keyboard shortcuts</h3>
          <Button size="sm" variant="ghost" icon={X} onClick={onClose} aria-label="Close shortcuts" />
        </div>
        <p className="mt-0.5 text-xs text-muted">They work while focus is in the field list and not in a text box.</p>
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 @md:grid-cols-2">
          {KEYS.map(([k, what]) => (
            <div key={k} className="flex items-center gap-2">
              <dt>
                <kbd className="whitespace-nowrap rounded-chip border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink">{k}</kbd>
              </dt>
              <dd className="text-xs text-ink-2">{what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
