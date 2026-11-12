import { useEffect, useMemo, useRef } from "react";
import { FileText, Lock, Pause, PencilLine, Play, UserCheck, X } from "lucide-react";
import { Button, Chip, SectionTitle, relTime } from "../ui";
import StepBadge from "./StepBadge";
import { AUTONOMY_META, METHOD_LABEL, SEVERITY_LABEL, TRUST_META, goto, pctText } from "./shared";
import type { AgentRow } from "./shared";
import { scoreRun } from "../../studio/evalCalc";
import { useEval } from "../../studio/evalStore";

const FOCUSABLE = "a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])";

/** Right drawer on wide screens, bottom sheet on phones. */
export default function AgentDrawer({ row, onClose }: { row: AgentRow; onClose: () => void }) {
  const { step, body, orch } = row;
  const runs = useEval((s) => s.runs);
  const rules = useEval((s) => s.rules);
  const scoring = useEval((s) => s.scoring);
  const updateOrchestration = useEval((s) => s.updateOrchestration);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Move focus into the panel, trap Tab inside, close on Escape, and give focus back on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  const lastRuns = useMemo(
    () =>
      runs
        .filter((r) => r.stepId === step.id)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 5)
        .map((r) => ({ run: r, score: scoreRun(r, rules, scoring) })),
    [runs, rules, scoring, step.id],
  );

  const meta = AUTONOMY_META[body.autonomy];
  const trust = TRUST_META[row.trust.trust];
  const promptLines = body.systemPrompt
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-end lg:items-stretch" role="presentation">
      <button type="button" tabIndex={-1} aria-label="Close summary" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-drawer-title"
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-lg lg:max-h-none lg:w-120 lg:rounded-none lg:border-y-0 lg:border-r-0"
      >
        <header className="flex items-start gap-3 border-b border-line p-4">
          <StepBadge id={step.id} />
          <div className="min-w-0 flex-1">
            <h2 id="agent-drawer-title" className="text-base font-semibold leading-snug text-ink">
              {step.agent}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-muted">
              {body.model} <span className="font-sans tabular-nums">· live version {row.version}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone={meta.tone} icon={meta.icon}>
                {meta.label}
              </Chip>
              {orch.paused ? (
                <Chip tone="danger" icon={Pause}>
                  Paused
                </Chip>
              ) : (
                <Chip tone="ok" icon={Play}>
                  Live
                </Chip>
              )}
              {row.hasDraft ? (
                <Chip tone="warn" icon={PencilLine}>
                  Unpublished edits
                </Chip>
              ) : null}
              {orch.requireApproval ? (
                <Chip tone="warn" icon={UserCheck}>
                  Approval: {orch.approverRole}
                </Chip>
              ) : null}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close summary"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section className="space-y-2">
            <SectionTitle title="System prompt" hint="First lines of the live version" />
            <div className="space-y-1 rounded-lg border border-line bg-surface-2 p-3 text-sm leading-relaxed text-ink-2">
              {promptLines.length === 0 ? <p className="text-muted">No system prompt written.</p> : promptLines.map((l, i) => <p key={i}>{l}</p>)}
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle title="Trust" hint={meta.blurb} />
            <div className="rounded-lg border border-line p-3 text-sm">
              <Chip tone={trust.tone}>{trust.label}</Chip>
              <p className="mt-2 text-ink-2">{row.trust.reason}</p>
              <p className="mt-1 text-xs text-muted">This is a recommendation from the evidence. A person decides, in the prompts editor.</p>
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle title={`Tools (${row.enabledTools} of ${body.tools.length} enabled)`} hint="Approved tools and their permission state" />
            {body.tools.length === 0 ? (
              <p className="text-sm text-muted">This agent has no tools.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {body.tools.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="break-all font-mono text-xs text-ink">{t.name}</div>
                      <div className="text-xs text-muted">{t.description}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Chip tone={t.enabled ? "ok" : "neutral"}>{t.enabled ? "Allowed" : "Off"}</Chip>
                      {t.locked ? (
                        <Chip tone="neutral" icon={Lock}>
                          Locked
                        </Chip>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle title={`Behavior spec (${row.rules.length} rules, ${row.critical} critical)`} hint="The judge scores every run against these" />
            {row.rules.length === 0 ? (
              <p className="text-sm text-muted">No rules written for this agent yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {row.rules.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-2">
                    <Chip tone={r.severity === "critical" ? "danger" : "neutral"}>{SEVERITY_LABEL[r.severity]}</Chip>
                    <span className="min-w-0 flex-1">
                      {r.title}
                      <span className="ml-1.5 text-xs text-muted">{METHOD_LABEL[r.method]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle title="Last 5 runs" hint={`Average score ${row.stats.avgScore ?? "none"}, pass rate ${pctText(row.stats.passRatePct)} over ${row.stats.runs} runs`} />
            {lastRuns.length === 0 ? (
              <p className="text-sm text-muted">No runs yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {lastRuns.map(({ run, score }) => {
                  const verdict =
                    run.status === "failed"
                      ? { tone: "danger" as const, label: "Failed" }
                      : score.criticalFails > 0
                        ? { tone: "danger" as const, label: "Critical fail" }
                        : score.passed
                          ? { tone: "ok" as const, label: "Pass" }
                          : { tone: "warn" as const, label: "Below the bar" };
                  return (
                    <li key={run.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium tabular-nums text-ink">{run.quotationId}</div>
                        <div className="text-xs text-muted">{relTime(run.startedAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tabular-nums text-ink">{score.score === null ? "No score" : score.score}</span>
                        <Chip tone={verdict.tone}>{verdict.label}</Chip>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-line p-4">
          <Button
            variant={orch.paused ? "primary" : "danger"}
            icon={orch.paused ? Play : Pause}
            onClick={() => updateOrchestration(step.id, { paused: !orch.paused })}
          >
            {orch.paused ? "Resume agent" : "Pause agent"}
          </Button>
          <Button
            icon={FileText}
            onClick={() => {
              onClose();
              goto({ tab: "workflow", stepId: step.id });
            }}
          >
            Open prompts
          </Button>
        </footer>
      </div>
    </div>
  );
}
