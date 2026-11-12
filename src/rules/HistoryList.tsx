import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { Button, Card, Chip, SectionTitle, relTime } from "../components/ui";
import type { RulesState } from "../studio/types";
import { diffRules } from "./diff";

export default function HistoryList({ state, onRestore }: { state: RulesState; onRestore: (version: number) => void }) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const hasDraft = state.draft !== null;

  return (
    <Card className="p-4">
      <SectionTitle title="Version history" hint="Published versions never change. Restoring loads one into the draft, and it goes live only when you publish." />
      <ol className="mt-3 divide-y divide-line">
        {state.history.map((v, i) => {
          const prev = state.history[i + 1];
          const changes = prev ? diffRules(prev.rules, v.rules) : [];
          const isLive = v.version === state.version;
          const asking = confirming === v.version;
          return (
            <li key={v.version} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-ink">
                  <History className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  Version {v.version}
                </span>
                {isLive ? <Chip tone="ok">Live</Chip> : null}
                <span className="text-xs text-muted">
                  {v.author}, {relTime(v.publishedAt)}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  {asking ? (
                    <>
                      <span className="text-xs text-warn-fg">Replace the current draft?</span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          onRestore(v.version);
                          setConfirming(null);
                        }}
                      >
                        Replace
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      icon={RotateCcw}
                      aria-label={`Restore version ${v.version} to draft`}
                      onClick={() => (hasDraft ? setConfirming(v.version) : onRestore(v.version))}
                    >
                      Restore to draft
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-ink-2">{v.note}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">
                {prev ? (
                  changes.length > 0 ? (
                    <>
                      {changes.slice(0, 3).map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                      {changes.length > 3 ? <li>and {changes.length - 3} more</li> : null}
                    </>
                  ) : (
                    <li>No rule values changed from version {prev.version}.</li>
                  )
                ) : (
                  <li>First version.</li>
                )}
              </ul>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
