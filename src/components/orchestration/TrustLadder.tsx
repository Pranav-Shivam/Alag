import { ArrowDown, ArrowUp } from "lucide-react";
import { Callout, Card, Chip, SectionTitle } from "../ui";
import StepBadge from "./StepBadge";
import { AUTONOMY_META, AUTONOMY_ORDER } from "./shared";
import type { AgentRow } from "./shared";
import { useEval } from "../../studio/evalStore";

/** Three trust levels, who is on each, and which agents the evidence says could move. Recommends only. */
export default function TrustLadder({ rows, onOpen }: { rows: AgentRow[]; onOpen: (stepId: number) => void }) {
  const scoring = useEval((s) => s.scoring);
  return (
    <Card className="space-y-4 p-4">
      <SectionTitle title="Trust ladder" hint="How much each agent is allowed to do without a person" />

      <div className="grid gap-3 md:grid-cols-3">
        {AUTONOMY_ORDER.map((level) => {
          const meta = AUTONOMY_META[level];
          const members = rows.filter((r) => r.body.autonomy === level);
          return (
            <section key={level} aria-labelledby={`ladder-${level}`} className="min-w-0 rounded-surface border border-line bg-surface-2 p-3">
              <header className="mb-2 flex items-center justify-between gap-2">
                <h4 id={`ladder-${level}`} className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <meta.icon className="h-4 w-4" aria-hidden="true" />
                  {meta.label}
                </h4>
                <Chip tone={meta.tone}>
                  <span className="tabular-nums">{members.length}</span>
                </Chip>
              </header>
              <p className="mb-2 text-xs text-muted">{meta.blurb}</p>
              {members.length === 0 ? (
                <p className="rounded-control border border-dashed border-line-strong p-3 text-xs text-muted">No agent is at this level.</p>
              ) : (
                <ul className="space-y-1.5">
                  {members.map((r) => {
                    const up = r.trust.trust === "promote" && level !== "auto";
                    const down = r.trust.trust === "demote" && level !== "suggest";
                    return (
                      <li key={r.step.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(r.step.id)}
                          className="flex w-full items-center gap-2 rounded-control border border-line bg-surface px-2.5 py-1.5 text-left text-sm text-ink transition-colors hover:border-line-strong"
                        >
                          <StepBadge id={r.step.id} />
                          <span className="min-w-0 flex-1 truncate">{r.step.agent}</span>
                          {up ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-ok-fg" title={r.trust.reason}>
                              <ArrowUp className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Evidence supports more autonomy. {r.trust.reason}</span>
                            </span>
                          ) : null}
                          {down ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-danger-fg" title={r.trust.reason}>
                              <ArrowDown className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Evidence supports less autonomy. {r.trust.reason}</span>
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="h-3.5 w-3.5 text-ok-fg" aria-hidden="true" /> Evidence supports more autonomy
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowDown className="h-3.5 w-3.5 text-danger-fg" aria-hidden="true" /> Evidence supports less autonomy
        </span>
      </div>

      <Callout tone="info" title="Autonomy is earned from evidence, and a person decides">
        An agent becomes a candidate for the next level only after{" "}
        <span className="tabular-nums">{scoring.promotionMinRuns}</span> runs with a pass rate of at least{" "}
        <span className="tabular-nums">{scoring.promotionPassRatePct}%</span> and a human override rate of at most{" "}
        <span className="tabular-nums">{scoring.promotionMaxOverrideRatePct}%</span>. Below{" "}
        <span className="tabular-nums">{scoring.demotionPassRatePct}%</span> the recommendation is to step down. This screen only recommends. Changing a trust level
        is a deliberate edit in the agent prompts, with a version and an author.
      </Callout>
    </Card>
  );
}
