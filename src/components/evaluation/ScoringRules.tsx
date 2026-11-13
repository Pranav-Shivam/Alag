import { useMemo, useState } from "react";
import { CircleCheck, CircleX, Lightbulb, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle, TextInput, TONE_TEXT } from "../ui";
import { STEPS } from "../../data/steps";
import { DEFAULT_SCORING, agentStats, scoreRun, trustRecommendation } from "../../studio/evalCalc";
import { useEval } from "../../studio/evalStore";
import type { AgentRun, ScoringConfig, SpecRule } from "../../studio/evalTypes";
import { MethodChip, SeverityChip, VerdictChip, fmtCredit, fmtPct, pctOf } from "./shared";
import type { ScoredRun } from "./shared";

type Key = keyof ScoringConfig;

interface FieldDef {
  key: Key;
  label: string;
  min: number;
  max: number;
  step: number;
  int: boolean;
  hint: string;
}

const SCORE_FIELDS: FieldDef[] = [
  { key: "passScore", label: "Pass score", min: 50, max: 100, step: 1, int: false, hint: "From 50 to 100. A run needs at least this score to pass." },
  { key: "criticalWeight", label: "Critical rule weight", min: 1, max: 10, step: 1, int: false, hint: "From 1 to 10. How many times a critical rule counts. Standard rules count once." },
  { key: "warnCredit", label: "Warn credit", min: 0, max: 1, step: 0.05, int: false, hint: "From 0 to 1. Share of credit a warn earns. Pass earns 1, fail earns 0." },
];

const TRUST_FIELDS: FieldDef[] = [
  { key: "promotionMinRuns", label: "Minimum runs before any change", min: 1, max: 500, step: 1, int: true, hint: "Whole number from 1 to 500." },
  { key: "promotionPassRatePct", label: "Promotion pass rate (percent)", min: 50, max: 100, step: 1, int: false, hint: "From 50 to 100. Pass rate an agent needs to be a candidate for more autonomy." },
  { key: "promotionMaxOverrideRatePct", label: "Maximum override rate (percent)", min: 0, max: 100, step: 1, int: false, hint: "From 0 to 100. Humans may edit or reject at most this share of gated runs." },
  { key: "demotionPassRatePct", label: "Demotion pass rate (percent)", min: 0, max: 100, step: 1, int: false, hint: "From 0 to 100. Below this an agent is recommended for less autonomy." },
];

const ALL_FIELDS = [...SCORE_FIELDS, ...TRUST_FIELDS];

const toDraft = (c: ScoringConfig) => Object.fromEntries(ALL_FIELDS.map((f) => [f.key, String(c[f.key])])) as Record<Key, string>;

/** Parse the text fields. Invalid fields fall back to the saved value so the preview below never breaks. */
function parseDraft(draft: Record<Key, string>, saved: ScoringConfig): { cfg: ScoringConfig; errors: Partial<Record<Key, string>> } {
  const cfg: ScoringConfig = { ...saved };
  const errors: Partial<Record<Key, string>> = {};
  for (const f of ALL_FIELDS) {
    const raw = draft[f.key].trim();
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) errors[f.key] = "Enter a number.";
    else if (n < f.min || n > f.max) errors[f.key] = `Must be between ${f.min} and ${f.max}.`;
    else if (f.int && !Number.isInteger(n)) errors[f.key] = "Use a whole number.";
    else cfg[f.key] = n;
  }
  if (!errors.demotionPassRatePct && !errors.promotionPassRatePct && cfg.demotionPassRatePct > cfg.promotionPassRatePct) {
    errors.demotionPassRatePct = "Must not be above the promotion pass rate.";
    cfg.demotionPassRatePct = saved.demotionPassRatePct;
  }
  return { cfg, errors };
}

interface Props {
  runs: AgentRun[];
  rules: SpecRule[];
  scored: ScoredRun[];
  scoring: ScoringConfig;
}

export default function ScoringRules({ runs, rules, scored, scoring }: Props) {
  const updateScoring = useEval((s) => s.updateScoring);
  const savedKey = JSON.stringify(scoring);
  const [draft, setDraft] = useState(() => toDraft(scoring));
  const [seenKey, setSeenKey] = useState(savedKey);
  const [flash, setFlash] = useState(false);
  if (seenKey !== savedKey) {
    setSeenKey(savedKey);
    setDraft(toDraft(scoring));
  }

  const { cfg, errors } = useMemo(() => parseDraft(draft, scoring), [draft, scoring]);
  const errorCount = Object.keys(errors).length;
  const dirty = ALL_FIELDS.some((f) => draft[f.key] !== String(scoring[f.key]));
  const cfgKey = JSON.stringify(cfg);

  /* What-if: score every run with the form values and compare with the saved settings. */
  const whatIf = useMemo(() => {
    const next = runs.map((r) => scoreRun(r, rules, cfg));
    let toFail = 0;
    let toPass = 0;
    scored.forEach((x, i) => {
      if (x.s.passed && !next[i].passed) toFail++;
      if (!x.s.passed && next[i].passed) toPass++;
    });
    const oldPass = scored.filter((x) => x.s.passed).length;
    const newPass = next.filter((x) => x.passed).length;
    const changedAgents = STEPS.filter((st) => trustRecommendation(agentStats(st.id, runs, rules, scoring), scoring).trust !== trustRecommendation(agentStats(st.id, runs, rules, cfg), cfg).trust).map((st) => st.agent);
    return { toFail, toPass, oldRate: pctOf(oldPass, runs.length), newRate: pctOf(newPass, runs.length), changedAgents };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, rules, scored, scoring, cfgKey]);

  /* Worked example: a real run with problems and many checks, so the arithmetic has something to show. */
  const example = useMemo(() => {
    const cands = scored.filter((x) => x.s.lines.length > 0);
    if (cands.length === 0) return null;
    const rank = (x: ScoredRun) => (x.s.fails > 0 ? 1000 : 0) + (x.s.warns > 0 ? 100 : 0) + x.s.lines.length;
    return cands.reduce((best, x) => (rank(x) > rank(best) ? x : best), cands[0]);
  }, [scored]);

  const save = () => {
    if (errorCount > 0) return;
    updateScoring(cfg);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 4000);
  };

  const field = (f: FieldDef) => (
    <TextInput
      key={f.key}
      label={f.label}
      hint={f.hint}
      error={errors[f.key]}
      type="number"
      inputMode="decimal"
      min={f.min}
      max={f.max}
      step={f.step}
      value={draft[f.key]}
      aria-invalid={errors[f.key] ? true : undefined}
      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
    />
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-4">
          <SectionTitle title="How a run is scored" hint="One written rule, one verdict, one number. Nothing is hidden." />
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
            <li>The judge checks the trajectory against every rule in the agent's Behavior Spec and gives each rule a verdict: pass, warn or fail.</li>
            <li>
              Each verdict earns credit. Pass earns 1, warn earns {fmtCredit(cfg.warnCredit)}, fail earns 0. A rule that could not be judged is left out.
            </li>
            <li>
              Each rule has a weight. A critical rule counts {fmtCredit(cfg.criticalWeight)} times, a standard rule counts once.
            </li>
            <li>The score is the weighted share of credit earned, from 0 to 100.</li>
            <li>
              A run passes only when no critical rule failed, the score is at least {fmtCredit(cfg.passScore)}, and the run itself did not fail.
            </li>
          </ol>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-control border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink">
{`score = 100 × sum(weight × credit) / sum(weight)

credit  pass = 1, warn = ${fmtCredit(cfg.warnCredit)}, fail = 0
        not judged = left out of both sums
weight  critical rule = ${fmtCredit(cfg.criticalWeight)}, standard rule = 1

passes  = no critical rule failed
          AND score >= ${fmtCredit(cfg.passScore)}
          AND run did not fail`}
          </pre>
          <p className="mt-2 text-xs text-muted">The formula shows the values currently in the form, so you can read the effect of an edit before saving.</p>
        </Card>

        <Card className="min-w-0 p-4">
          <SectionTitle title="Settings" hint="Edit, check the preview, then save. Every score on this screen follows the saved values." />
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">{SCORE_FIELDS.map(field)}</div>
          <h4 className="t-eyebrow mt-4">Trust model</h4>
          <p className="mt-0.5 text-xs text-muted">An agent is a candidate for more autonomy only when all promotion rules hold. A person always makes the change.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{TRUST_FIELDS.map(field)}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={Save} onClick={save} disabled={!dirty || errorCount > 0}>
              Save changes
            </Button>
            <Button icon={RotateCcw} onClick={() => setDraft(toDraft(DEFAULT_SCORING))}>
              Reset to defaults
            </Button>
          </div>
          <div aria-live="polite" className="mt-2 min-h-5 text-xs">
            {errorCount > 0 ? (
              <span className={`inline-flex items-center gap-1 font-medium ${TONE_TEXT.danger}`}>
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Fix {errorCount} field{errorCount > 1 ? "s" : ""} before saving.
              </span>
            ) : flash ? (
              <span className={`inline-flex items-center gap-1 font-medium ${TONE_TEXT.ok}`}>
                <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Saved. Every score now uses these settings.
              </span>
            ) : dirty ? (
              <span className="text-muted">Unsaved changes. Reset loads the defaults into the form, then Save changes applies them.</span>
            ) : (
              <span className="text-muted">Form matches the saved settings.</span>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle title="What would change if you saved now" hint="All runs are scored again here with the form values. Nothing is stored until you press Save changes." />
        <div className="mt-3 grid gap-3 sm:grid-cols-3" aria-live="polite">
          <WhatIfTile label="Pass to fail" value={String(whatIf.toFail)} tone={whatIf.toFail > 0 ? "danger" : "neutral"} hint="runs that stop passing" />
          <WhatIfTile label="Fail to pass" value={String(whatIf.toPass)} tone={whatIf.toPass > 0 ? "ok" : "neutral"} hint="runs that start passing" />
          <WhatIfTile label="Overall pass rate" value={fmtPct(whatIf.newRate)} hint={`saved settings: ${fmtPct(whatIf.oldRate)}`} tone="neutral" />
        </div>
        <p className="mt-3 text-sm text-ink-2">
          {whatIf.toFail === 0 && whatIf.toPass === 0
            ? "No run changes its result with these settings."
            : `With these settings ${whatIf.toFail} run${whatIf.toFail === 1 ? "" : "s"} change${whatIf.toFail === 1 ? "s" : ""} from pass to fail and ${whatIf.toPass} from fail to pass. The overall pass rate moves from ${fmtPct(whatIf.oldRate)} to ${fmtPct(whatIf.newRate)}.`}
        </p>
        <p className="mt-1 text-sm text-ink-2">
          {whatIf.changedAgents.length === 0 ? "No agent changes its trust recommendation." : `Trust recommendation changes for ${whatIf.changedAgents.length} agent${whatIf.changedAgents.length > 1 ? "s" : ""}: ${whatIf.changedAgents.join(", ")}.`}
        </p>
      </Card>

      {example ? <WorkedExample run={example.run} rules={rules} cfg={cfg} /> : null}
    </div>
  );
}

function WhatIfTile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "neutral" | "ok" | "danger" }) {
  return (
    <div className="rounded-control border border-line bg-surface-2 p-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${tone === "neutral" ? "text-ink" : TONE_TEXT[tone]}`}>{value}</div>
      <div className="text-xs text-muted">{hint}</div>
    </div>
  );
}

/* ------------------------------ Worked example ------------------------------ */

function WorkedExample({ run, rules, cfg }: { run: AgentRun; rules: SpecRule[]; cfg: ScoringConfig }) {
  const r = scoreRun(run, rules, cfg);
  const sumW = r.lines.reduce((a, l) => a + l.weight, 0);
  const sumWC = r.lines.reduce((a, l) => a + l.weight * l.credit, 0);
  const num = (n: number) => String(Math.round(n * 1000) / 1000);

  const altScore = (patch: Partial<ScoringConfig>) => scoreRun(run, rules, { ...cfg, ...patch }).score;
  const hints: string[] = [];
  if (r.lines.some((l) => l.check.verdict === "warn")) {
    const lo = altScore({ warnCredit: 0 });
    const hi = altScore({ warnCredit: 1 });
    hints.push(`Warn credit is ${fmtCredit(cfg.warnCredit)}. At 0 this run would score ${lo?.toFixed(1)}, at 1 it would score ${hi?.toFixed(1)}.`);
  }
  if (r.lines.some((l) => l.rule?.severity === "critical")) {
    const lo = altScore({ criticalWeight: 1 });
    const hi = altScore({ criticalWeight: 10 });
    hints.push(`Critical weight is ${fmtCredit(cfg.criticalWeight)}. At 1 this run would score ${lo?.toFixed(1)}, at 10 it would score ${hi?.toFixed(1)}.`);
  }
  if (r.criticalFails > 0) hints.push("A critical rule failed, so the pass score does not matter for this run. It cannot pass until the verdict changes.");
  else if (run.status === "failed") hints.push("The run itself failed, so no setting can make it pass.");
  else if (r.score !== null && r.score < cfg.passScore) hints.push(`Pass score is ${fmtCredit(cfg.passScore)}. Lowering it to ${Math.floor(r.score)} or less would let this run pass.`);
  else if (r.score !== null) hints.push(`Pass score is ${fmtCredit(cfg.passScore)}. Raising it above ${r.score.toFixed(1)} would make this run fail.`);

  return (
    <Card className="p-4">
      <SectionTitle title="Worked example from a real run" hint={`${run.id}, ${run.agentName}, ${run.quotationId}. Uses the values in the form.`} action={<Chip tone={r.passed ? "ok" : "danger"} icon={r.passed ? CircleCheck : CircleX}>{r.passed ? "Pass" : "Fail"}</Chip>} />

      <ul className="mt-3 space-y-2 sm:hidden">
        {r.lines.map((l) => (
          <li key={l.check.ruleId} className="rounded-control border border-line p-2.5">
            <div className="text-sm font-medium text-ink">{l.rule?.title ?? l.check.ruleId}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {l.rule ? <SeverityChip severity={l.rule.severity} /> : null}
              <VerdictChip verdict={l.check.verdict} />
            </div>
            <div className="mt-1.5 font-mono text-xs tabular-nums text-ink-2">
              {fmtCredit(l.weight)} × {fmtCredit(l.credit)} = {num(l.weight * l.credit)}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-1.5 pr-2 font-medium">Rule</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Severity</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Method</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Verdict</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">Weight</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">Credit</th>
              <th scope="col" className="py-1.5 text-right font-medium">Weight × credit</th>
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l) => (
              <tr key={l.check.ruleId} className="border-b border-line last:border-b-0">
                <td className="py-1.5 pr-2 text-ink">{l.rule?.title ?? l.check.ruleId}</td>
                <td className="py-1.5 pr-2">{l.rule ? <SeverityChip severity={l.rule.severity} /> : null}</td>
                <td className="py-1.5 pr-2">{l.rule ? <MethodChip method={l.rule.method} /> : null}</td>
                <td className="py-1.5 pr-2">
                  <VerdictChip verdict={l.check.verdict} />
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtCredit(l.weight)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtCredit(l.credit)}</td>
                <td className="py-1.5 text-right tabular-nums">{num(l.weight * l.credit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <pre className="mt-3 whitespace-pre-wrap break-words rounded-control border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed tabular-nums text-ink">
{`sum(weight × credit) = ${num(sumWC)}
sum(weight)          = ${num(sumW)}
score = 100 × ${num(sumWC)} / ${num(sumW)} = ${r.score === null ? "n/a" : r.score.toFixed(1)}
critical rules failed = ${r.criticalFails}
passes = ${r.criticalFails === 0 ? "no critical fail" : "critical fail"} AND ${r.score === null ? "n/a" : r.score.toFixed(1)} >= ${fmtCredit(cfg.passScore)} AND run status is ${run.status.replace("_", " ")}  =>  ${r.passed ? "PASS" : "FAIL"}`}
      </pre>

      {hints.length > 0 ? (
        <div className="mt-3">
          <Callout tone="info" icon={Lightbulb} title="Which setting would change this number">
            <ul className="list-disc space-y-1 pl-4">
              {hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </Callout>
        </div>
      ) : null}
    </Card>
  );
}
