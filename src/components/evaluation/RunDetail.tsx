import { useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  CircleX,
  Cpu,
  Database,
  FileOutput,
  LoaderCircle,
  LogIn,
  OctagonX,
  RotateCw,
  Scale,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Callout, Chip, SectionTitle, SimulatedTag, Switch, TextArea, TONE, TONE_SOLID, TONE_TEXT, relTime } from "../ui";
import type { Tone } from "../ui";
import { fmtMs, fmtUsd } from "../../studio/evalCalc";
import { useEval } from "../../studio/evalStore";
import type { RuleCheck, ScoringConfig, SpecRule, TrajectoryKind, TrajectoryStep } from "../../studio/evalTypes";
import { HumanChip, MethodChip, SeverityChip, StatusChip, VerdictChip, fmtCredit, fmtNum, fmtWhen, scoreTone } from "./shared";
import type { ScoredRun } from "./shared";

interface Props {
  item: ScoredRun;
  rules: SpecRule[];
  scoring: ScoringConfig;
  onClose: () => void;
}

/** Right drawer from lg up, bottom sheet on phones. Esc closes. */
export default function RunDetail({ item, rules, scoring, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const { run } = item;
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Run ${run.id}`}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border-t border-line bg-surface shadow-xl outline-none lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[46rem] lg:max-w-[100vw] lg:rounded-none lg:border-l lg:border-t-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-ink">{run.agentName}</h2>
              <StatusChip status={run.status} />
            </div>
            <p className="mt-0.5 text-xs text-muted">
              <span className="font-mono">{run.id}</span> · {run.quotationId} · {fmtWhen(run.startedAt)}
            </p>
          </div>
          <Button size="sm" variant="ghost" icon={X} onClick={onClose} aria-label="Close run details">
            Close
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-4 py-4">
          <Breakdown item={item} rules={rules} scoring={scoring} />
          <Timeline item={item} />
          <Feedback item={item} />
          <Rejudge item={item} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------ (a) Score breakdown ------------------------------ */

function passReason(item: ScoredRun, scoring: ScoringConfig): { passed: boolean; text: string } {
  const { run, s } = item;
  if (s.passed) return { passed: true, text: `No critical rule failed and the score ${s.score?.toFixed(1)} is at least the pass score ${scoring.passScore}.` };
  if (run.status === "failed") return { passed: false, text: "The run itself failed, and a failed run can never pass." };
  if (s.criticalFails > 0) return { passed: false, text: `${s.criticalFails} critical rule${s.criticalFails > 1 ? "s" : ""} failed. A critical fail blocks a pass whatever the score.` };
  if (s.score === null) return { passed: false, text: "No rule could be judged, so there is no score." };
  return { passed: false, text: `Score ${s.score.toFixed(1)} is below the pass score ${scoring.passScore}.` };
}

function Breakdown({ item, rules, scoring }: { item: ScoredRun; rules: SpecRule[]; scoring: ScoringConfig }) {
  const { run, s } = item;
  const reason = passReason(item, scoring);
  const byId = new Map(rules.map((r) => [r.id, r]));
  const lineFor = new Map(s.lines.map((l) => [l.check.ruleId, l]));
  const rows = run.checks.map((c) => {
    const line = lineFor.get(c.ruleId);
    return { check: c, rule: byId.get(c.ruleId), weight: line?.weight ?? null, credit: line?.credit ?? null };
  });
  const tone: Tone = s.passed ? "ok" : "danger";

  return (
    <section aria-label="Score breakdown">
      <SectionTitle title="Score breakdown" hint={`Judged against the Behavior Spec version ${run.specVersion}`} />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className={`text-5xl font-semibold tabular-nums ${s.score === null ? "text-muted" : TONE_TEXT[scoreTone(s.score, scoring.passScore)]}`}>{s.score === null ? "n/a" : s.score.toFixed(1)}</div>
        <div className="min-w-0 flex-1">
          <Chip tone={tone} icon={s.passed ? CircleCheck : CircleX}>
            {s.passed ? "Pass" : "Fail"}
          </Chip>
          <p className="mt-1 text-sm text-ink-2">{reason.text}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">This run has no rule checks.</p>
      ) : (
        <>
          {/* Narrow: one card per rule */}
          <ul className="mt-3 space-y-2 sm:hidden">
            {rows.map((r) => (
              <li key={r.check.ruleId} className="rounded-lg border border-line p-3">
                <div className="text-sm font-medium text-ink">{r.rule?.title ?? r.check.ruleId}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.rule ? <SeverityChip severity={r.rule.severity} /> : null}
                  {r.rule ? <MethodChip method={r.rule.method} /> : null}
                  <VerdictChip verdict={r.check.verdict} />
                </div>
                <div className="mt-1.5 text-xs tabular-nums text-muted">
                  {r.weight === null ? "Left out of the score" : `Weight ${fmtCredit(r.weight)} · credit ${fmtCredit(r.credit ?? 0)}`}
                </div>
                <p className="mt-1 text-xs text-ink-2">{r.check.evidence}</p>
              </li>
            ))}
          </ul>
          {/* Wide: real table, evidence on a second line per rule */}
          <div className="mt-3 hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th scope="col" className="py-1.5 pr-2 font-medium">Rule</th>
                  <th scope="col" className="py-1.5 pr-2 font-medium">Severity</th>
                  <th scope="col" className="py-1.5 pr-2 font-medium">Method</th>
                  <th scope="col" className="py-1.5 pr-2 font-medium">Verdict</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium">Weight</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Credit</th>
                </tr>
              </thead>
              {rows.map((r) => (
                <tbody key={r.check.ruleId} className="border-b border-line last:border-b-0">
                  <tr className="align-top">
                    <td className="pb-0.5 pr-2 pt-2 font-medium text-ink">{r.rule?.title ?? r.check.ruleId}</td>
                    <td className="pb-0.5 pr-2 pt-2">{r.rule ? <SeverityChip severity={r.rule.severity} /> : null}</td>
                    <td className="pb-0.5 pr-2 pt-2">{r.rule ? <MethodChip method={r.rule.method} /> : null}</td>
                    <td className="pb-0.5 pr-2 pt-2">
                      <VerdictChip verdict={r.check.verdict} />
                    </td>
                    <td className="pb-0.5 pr-2 pt-2 text-right tabular-nums">{r.weight === null ? "n/a" : fmtCredit(r.weight)}</td>
                    <td className="pb-0.5 pt-2 text-right tabular-nums">{r.credit === null ? "left out" : fmtCredit(r.credit)}</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="pb-2 text-xs text-muted">
                      {r.check.evidence}
                    </td>
                  </tr>
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}
      <EvidenceNote checks={run.checks} />
    </section>
  );
}

function EvidenceNote({ checks }: { checks: RuleCheck[] }) {
  const na = checks.filter((c) => c.verdict === "na").length;
  if (na === 0) return null;
  return <p className="mt-2 text-xs text-muted">{na} rule{na > 1 ? "s were" : " was"} not judged and left out of the score.</p>;
}

/* ------------------------------ (b) Trajectory ------------------------------ */

const KIND: Record<TrajectoryKind, { label: string; icon: LucideIcon; tone: Tone }> = {
  input: { label: "Input", icon: LogIn, tone: "neutral" },
  context: { label: "Context", icon: Database, tone: "neutral" },
  model: { label: "Model", icon: Cpu, tone: "violet" },
  tool_call: { label: "Tool call", icon: Wrench, tone: "info" },
  decision: { label: "Decision", icon: Scale, tone: "info" },
  output: { label: "Output", icon: FileOutput, tone: "ok" },
  human: { label: "Human", icon: UserCheck, tone: "teal" },
  error: { label: "Error", icon: OctagonX, tone: "danger" },
  retry: { label: "Retry", icon: RotateCw, tone: "warn" },
};

function Timeline({ item }: { item: ScoredRun }) {
  const { run } = item;
  const longest = Math.max(1, ...run.trajectory.map((t) => t.durationMs));
  const summary: [string, string][] = [
    ["Model", run.model],
    ["Agent version", `v${run.agentVersion}`],
    ["Spec version", `v${run.specVersion}`],
    ["Total duration", fmtMs(run.durationMs)],
    ["Total tokens", `${fmtNum(run.tokensIn + run.tokensOut)} (${fmtNum(run.tokensIn)} in, ${fmtNum(run.tokensOut)} out)`],
    ["Cost", fmtUsd(run.costUsd)],
  ];

  return (
    <section aria-label="Trajectory">
      <SectionTitle title="Trajectory" hint="Everything the agent did in this run, in order. Bars are scaled to the slowest step." />
      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface-2 p-3 text-xs sm:grid-cols-3">
        {summary.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-muted">{k}</dt>
            <dd className="mt-0.5 break-words font-medium tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Human outcome</span>
        <HumanChip outcome={run.humanOutcome} />
        {run.retries > 0 ? <span className="tabular-nums">{run.retries} retr{run.retries > 1 ? "ies" : "y"}</span> : null}
        {run.errors > 0 ? <span className="tabular-nums">{run.errors} error{run.errors > 1 ? "s" : ""}</span> : null}
      </div>

      <ol className="relative mt-4 ml-3 space-y-3 border-l border-line pl-6">
        {run.trajectory.map((t) => (
          <TimelineStep key={t.id} step={t} longest={longest} />
        ))}
      </ol>
    </section>
  );
}

function TimelineStep({ step, longest }: { step: TrajectoryStep; longest: number }) {
  const k = KIND[step.kind];
  const tone: Tone = !step.ok ? "danger" : k.tone;
  const highlight = step.kind === "error" || !step.ok ? "danger" : step.kind === "retry" ? "warn" : null;
  const Icon = k.icon;
  const pct = Math.max(2, Math.round((step.durationMs / longest) * 100));
  return (
    <li className="relative">
      <span className={`absolute -left-[2.35rem] top-2.5 grid h-6 w-6 place-items-center rounded-full border bg-surface ${TONE[tone]}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className={`rounded-lg border p-2.5 ${highlight ? TONE[highlight] : "border-line bg-surface"}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{step.label}</span>
          <Chip tone={tone}>{k.label}</Chip>
          <span className="ml-auto text-xs tabular-nums opacity-80">{fmtMs(step.durationMs)}</span>
        </div>
        <p className="mt-0.5 text-xs opacity-90">{step.detail}</p>
        {step.durationMs > 0 ? (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className={`h-full rounded-full ${TONE_SOLID[tone]}`} style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        {step.tokensIn !== undefined || step.tokensOut !== undefined ? (
          <p className="mt-1 text-xs tabular-nums opacity-80">
            Tokens in {fmtNum(step.tokensIn ?? 0)} · out {fmtNum(step.tokensOut ?? 0)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/* ------------------------------ (c) Human feedback on the judge ------------------------------ */

function Feedback({ item }: { item: ScoredRun }) {
  const { run } = item;
  const saved = useEval((s) => s.feedback[run.id]);
  const setFeedback = useEval((s) => s.setFeedback);
  const clearFeedback = useEval((s) => s.clearFeedback);
  const [agree, setAgree] = useState<boolean | null>(saved ? saved.agree : null);
  const [note, setNote] = useState(saved?.note ?? "");
  const [reg, setReg] = useState(saved?.inRegressionSet ?? false);

  const save = () => {
    if (agree === null) return;
    setFeedback(run.id, { agree, note: note.trim(), inRegressionSet: reg });
  };
  const clear = () => {
    clearFeedback(run.id);
    setAgree(null);
    setNote("");
    setReg(false);
  };

  return (
    <section aria-label="Human feedback on the judge">
      <SectionTitle title="Your feedback on the judge" hint="The judge can be wrong too. Your answer is stored with the run." />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button icon={ThumbsUp} aria-pressed={agree === true} onClick={() => setAgree(true)} variant={agree === true ? "primary" : "secondary"}>
          Agree with judge
        </Button>
        <Button icon={ThumbsDown} aria-pressed={agree === false} onClick={() => setAgree(false)} variant={agree === false ? "primary" : "secondary"}>
          Disagree
        </Button>
      </div>
      <div className="mt-3">
        <TextArea label="Note for the team" rows={3} value={note} onChange={(e) => setNote(e.target.value)} hint="Optional. Say what the judge missed or got right." />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Switch checked={reg} onChange={setReg} label="Add to regression set" />
        <span className="text-sm text-ink-2">Add to regression set</span>
      </div>
      <p className="mt-1 text-xs text-muted">Cases in the regression set are replayed in every test suite before an agent version can go live.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={save} disabled={agree === null}>
          Save feedback
        </Button>
        <Button variant="ghost" onClick={clear} disabled={!saved && agree === null && note === "" && !reg}>
          Clear feedback
        </Button>
      </div>
      <div aria-live="polite" className="mt-2">
        {saved ? (
          <Callout tone="ok" icon={CircleCheck} title="Feedback saved">
            You {saved.agree ? "agreed with" : "disagreed with"} the judge {relTime(saved.at)}.{saved.inRegressionSet ? " This run is in the regression set." : ""}
            {saved.note ? ` Note: ${saved.note}` : ""}
          </Callout>
        ) : (
          <p className="text-xs text-muted">No feedback saved for this run yet.</p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ (d) Simulated re-judge ------------------------------ */

function Rejudge({ item }: { item: ScoredRun }) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = () => {
    setState("running");
    timer.current = window.setTimeout(() => setState("done"), 900);
  };

  return (
    <section aria-labelledby="rd-rejudge" className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="rd-rejudge" className="text-sm font-semibold text-ink">
          Second opinion
        </h3>
        <SimulatedTag />
      </div>
      <p className="mt-1 text-xs text-muted">Ask a second judge model to score this trajectory again. No network call is made in this prototype.</p>
      <Button className="mt-2" icon={state === "running" ? undefined : ShieldCheck} onClick={go} disabled={state === "running"}>
        {state === "running" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {state === "running" ? "Re-judging" : "Re-judge with a second model"}
      </Button>
      <div aria-live="polite" className="mt-2">
        {state === "running" ? <p className="text-xs text-muted">The second judge is reading the trajectory.</p> : null}
        {state === "done" ? (
          <Callout tone="ok" icon={CircleCheck} title="A second judge model agreed">
            It reached the same verdicts and the same score of {item.s.score === null ? "n/a" : item.s.score.toFixed(1)}. This is a simulated result.
          </Callout>
        ) : null}
      </div>
    </section>
  );
}
