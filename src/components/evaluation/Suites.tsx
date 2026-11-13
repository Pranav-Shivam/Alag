import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CircleCheck, CircleX, FlaskConical, Play, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle, SimulatedTag, TONE_SOLID, TONE_TEXT, relTime } from "../ui";
import type { Tone } from "../ui";
import { agentStats } from "../../studio/evalCalc";
import { useEval } from "../../studio/evalStore";
import { useStudio } from "../../studio/store";
import type { AgentRun, ScoringConfig, SpecRule } from "../../studio/evalTypes";
import { EmptyState, ScoreChip, agentLabel, fmtPct, fmtWhen, pctOf } from "./shared";
import type { ScoredRun } from "./shared";

/** Release gate: a version may not go live under this suite pass rate, or with any critical rule failure. */
const GATE_PASS_RATE = 95;

interface Props {
  runs: AgentRun[];
  rules: SpecRule[];
  scored: ScoredRun[];
  scoring: ScoringConfig;
  onOpenRun: (runId: string) => void;
}

function rateTone(rate: number | null): Tone {
  if (rate === null) return "neutral";
  if (rate >= GATE_PASS_RATE) return "ok";
  if (rate >= 85) return "warn";
  return "danger";
}

export default function Suites({ runs, rules, scored, scoring, onOpenRun }: Props) {
  const suites = useEval((s) => s.suites);
  const feedback = useEval((s) => s.feedback);
  const runSuite = useEval((s) => s.runSuite);
  const agents = useStudio((s) => s.agents);
  const [running, setRunning] = useState<string[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const start = (id: string) => {
    setRunning((r) => [...r, id]);
    setLast(null);
    const t = window.setTimeout(() => {
      runSuite(id);
      setRunning((r) => r.filter((x) => x !== id));
      setLast(id);
    }, 900);
    timers.current.push(t);
  };

  const gates = useMemo(
    () =>
      suites.map((s) => {
        const rate = pctOf(s.passed, s.cases);
        const crit = agentStats(s.stepId, runs, rules, scoring).criticalFails;
        const reasons: string[] = [];
        if (rate === null || rate < GATE_PASS_RATE) reasons.push(`suite pass rate ${fmtPct(rate)} is under ${GATE_PASS_RATE}%`);
        if (crit > 0) reasons.push(`${crit} critical rule violation${crit > 1 ? "s" : ""} in recent runs`);
        return { suite: s, rate, crit, blocked: reasons.length > 0, reasons };
      }),
    [suites, runs, rules, scoring],
  );
  const blockedCount = gates.filter((g) => g.blocked).length;

  const regression = useMemo(
    () =>
      Object.entries(feedback)
        .filter(([, fb]) => fb.inRegressionSet)
        .map(([runId, fb]) => ({ runId, fb, item: scored.find((x) => x.run.id === runId) }))
        .sort((a, b) => b.fb.at.localeCompare(a.fb.at)),
    [feedback, scored],
  );

  const lastGate = last ? gates.find((g) => g.suite.id === last) : undefined;

  return (
    <div className="space-y-5">
      <Callout tone={blockedCount > 0 ? "warn" : "ok"} icon={blockedCount > 0 ? ShieldAlert : ShieldCheck} title="Release gate">
        An agent version is blocked from going live when its suite pass rate is under {GATE_PASS_RATE} percent or any critical rule fails. Right now {blockedCount} of {suites.length} suites are blocked and {suites.length - blockedCount} are clear.
      </Callout>

      <div aria-live="polite" className="min-h-0 text-sm text-ink-2">
        {lastGate ? (
          <p>
            {lastGate.suite.name} finished: {lastGate.suite.passed} of {lastGate.suite.cases} cases passed ({fmtPct(lastGate.rate)}). Gate is {lastGate.blocked ? "blocked" : "clear"}. This run was simulated.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gates.map(({ suite, rate, crit, blocked, reasons }) => {
          const tone = rateTone(rate);
          const isRunning = running.includes(suite.id);
          const live = agents[suite.stepId]?.version;
          const regCount = regression.filter((r) => r.item?.run.stepId === suite.stepId).length;
          return (
            <Card key={suite.id} as="article" className="flex min-w-0 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="t-label">{suite.name}</h3>
                  <p className="text-xs text-muted">
                    <span className="tabular-nums">{suite.stepId}.</span> {agentLabel(suite.stepId)}
                  </p>
                </div>
                {blocked ? (
                  <Chip tone="danger" icon={CircleX}>
                    Blocked
                  </Chip>
                ) : (
                  <Chip tone="ok" icon={CircleCheck}>
                    Clear
                  </Chip>
                )}
              </div>
              <p className="mt-2 text-sm text-ink-2">{suite.description}</p>

              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted">
                    <span className="tabular-nums">{suite.passed}</span> of <span className="tabular-nums">{suite.cases}</span> cases passed
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{fmtPct(rate)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`Pass rate ${fmtPct(rate)}, gate at ${GATE_PASS_RATE} percent`}>
                  <div className={`h-full rounded-full ${TONE_SOLID[tone]}`} style={{ width: `${rate ?? 0}%` }} />
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-muted">Last run</dt>
                  <dd className="mt-0.5 font-medium text-ink">{relTime(suite.lastRunAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Version tested</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-ink">
                    v{suite.agentVersion}
                    {live !== undefined && live !== suite.agentVersion ? <span className="ml-1 font-normal text-warn-fg">live is v{live}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Cases in suite</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-ink">{suite.cases}</dd>
                </div>
                <div>
                  <dt className="text-muted">Regression cases added</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-ink">{regCount}</dd>
                </div>
              </dl>

              <p className={`mt-3 text-xs ${blocked ? TONE_TEXT.danger : TONE_TEXT.ok}`}>
                {blocked ? `Blocked: ${reasons.join(" and ")}.` : crit === 0 ? "Clear: pass rate meets the gate and no critical rule failed." : ""}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <Button icon={Play} loading={isRunning} onClick={() => start(suite.id)} disabled={isRunning} aria-label={isRunning ? undefined : `Run suite ${suite.name}`}>
                  {isRunning ? "Running" : "Run suite"}
                </Button>
                <SimulatedTag />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <SectionTitle
          title="Regression set"
          hint="Cases you marked in the Runs view. Every suite replays them before an agent version can be published."
          action={
            <Chip tone="info" icon={FlaskConical}>
              <span className="tabular-nums">{regression.length}</span> case{regression.length === 1 ? "" : "s"}
            </Chip>
          }
        />
        {regression.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No cases in the regression set yet">Open a run, give feedback on the judge and switch on Add to regression set. That case will then be replayed in every suite.</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {regression.map(({ runId, fb, item }) => (
              <li key={runId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">
                    {item ? item.run.agentName : "Removed run"} {item ? <span className="font-normal text-muted">on {item.run.quotationId}</span> : null}
                  </div>
                  <div className="text-xs text-muted">
                    <span className="font-mono">{runId}</span> · saved {relTime(fb.at)} ({fmtWhen(fb.at)}) · you {fb.agree ? "agreed with" : "disagreed with"} the judge
                    {fb.note ? ` · ${fb.note}` : ""}
                  </div>
                </div>
                {item ? <ScoreChip score={item.s.score} passed={item.s.passed} passScore={scoring.passScore} /> : null}
                {item ? (
                  <Button size="sm" icon={ArrowRight} onClick={() => onOpenRun(runId)}>
                    Open run in Runs view
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
