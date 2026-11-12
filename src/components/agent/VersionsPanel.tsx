import { useState } from "react";
import { GitCompare, History, RotateCcw } from "lucide-react";
import type { AgentBody, AgentState } from "../../studio/types";
import { Button, Callout, Card, Chip, relTime } from "../ui";
import { collapse, hasChanges, lineDiff } from "./diff";

interface Props {
  agent: AgentState;
  onRestore: (version: number) => void;
}

function DiffBlock({ title, from, to }: { title: string; from: string; to: string }) {
  const ops = lineDiff(from, to);
  const changed = hasChanges(ops);
  const rows = collapse(ops, 2);
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-xs font-semibold text-ink-2">{title}</h4>
      {!changed ? (
        <p className="text-xs text-muted">No differences.</p>
      ) : (
        <div tabIndex={0} className="max-h-72 overflow-auto rounded-lg border border-line bg-surface-2 py-1 font-mono text-xs leading-relaxed">
          {rows.map((r, i) =>
            r.type === "skip" ? (
              <div key={i} className="px-3 py-0.5 text-muted">
                {r.count} unchanged {r.count === 1 ? "line" : "lines"}
              </div>
            ) : (
              <div
                key={i}
                className={`whitespace-pre-wrap break-words px-3 ${r.type === "add" ? "bg-ok-soft text-ok-fg" : r.type === "del" ? "bg-danger-soft text-danger-fg" : "text-ink-2"}`}
              >
                {r.type === "add" ? "+ " : r.type === "del" ? "- " : "  "}
                {r.text || " "}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Comparison({ version, base, targetLabel }: { version: { version: number; body: AgentBody }; base: AgentBody; targetLabel: string }) {
  const a = version.body;
  const showExtraction = a.extractionPrompt !== undefined || base.extractionPrompt !== undefined;
  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      <p className="text-xs text-muted">
        Changes from v{version.version} to {targetLabel}. Lines with a plus are only in {targetLabel}. Lines with a minus are only in v{version.version}.
      </p>
      <DiffBlock title="System prompt" from={a.systemPrompt} to={base.systemPrompt} />
      <DiffBlock title="Instruction" from={a.instruction} to={base.instruction} />
      {showExtraction ? <DiffBlock title="Extraction prompt" from={a.extractionPrompt ?? ""} to={base.extractionPrompt ?? ""} /> : null}
    </div>
  );
}

export default function VersionsPanel({ agent, onRestore }: Props) {
  const [comparing, setComparing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const target = agent.draft ?? agent.live;
  const targetLabel = agent.draft ? "the draft" : `the live version (v${agent.version})`;

  const restore = (v: number) => {
    onRestore(v);
    setConfirming(null);
    setNotice(`Version ${v} is now in your draft. It is not live until you publish.`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Version history</h3>
        <p className="mt-0.5 text-xs text-muted">Restoring loads an old version into the draft. It does not go live until you publish it.</p>
      </div>

      <div aria-live="polite">{notice ? <Callout tone="ok">{notice}</Callout> : null}</div>

      <ol className="space-y-2">
        {agent.history.map((h) => {
          const isLive = h.version === agent.version;
          const open = comparing === h.version;
          return (
            <li key={h.version}>
              <Card as="div" className="p-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Chip tone="neutral" icon={History}>{`v${h.version}`}</Chip>
                  {isLive ? <Chip tone="ok">Live</Chip> : null}
                  <span className="text-xs text-ink-2">{h.author}</span>
                  <time dateTime={h.publishedAt} title={new Date(h.publishedAt).toLocaleString("en-US")} className="text-xs text-muted">
                    {relTime(h.publishedAt)}
                  </time>
                </div>
                <p className="mt-1.5 text-sm text-ink">{h.note}</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" icon={GitCompare} aria-expanded={open} onClick={() => setComparing(open ? null : h.version)}>
                    {open ? "Hide comparison" : "Compare"}
                  </Button>
                  <Button size="sm" icon={RotateCcw} disabled={isLive} onClick={() => (agent.draft ? setConfirming(h.version) : restore(h.version))}>
                    Restore to draft
                  </Button>
                </div>

                {confirming === h.version ? (
                  <Callout tone="warn" className="mt-3" title="Replace your unpublished edits?">
                    <p>Restoring v{h.version} overwrites the current draft.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="primary" onClick={() => restore(h.version)}>
                        Replace draft
                      </Button>
                      <Button size="sm" onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </div>
                  </Callout>
                ) : null}

                {open ? <Comparison version={h} base={target} targetLabel={targetLabel} /> : null}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
