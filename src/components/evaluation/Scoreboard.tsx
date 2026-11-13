import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, ArrowDown, ArrowUp, ChevronsUpDown, CircleCheck, Coins, Gauge, ShieldAlert, Timer, UserRoundCheck, UserCheck } from "lucide-react";
import { Button, Callout, Card, Select, SectionTitle, Segmented, TONE_TEXT } from "../ui";
import { useStudio } from "../../studio/store";
import { STEPS } from "../../data/steps";
import { agentStats, fmtMs, fmtUsd, trustRecommendation, weeklyTrend } from "../../studio/evalCalc";
import type { AgentStats, Trust } from "../../studio/evalCalc";
import type { AgentRun, ScoringConfig, SpecRule } from "../../studio/evalTypes";
import type { Autonomy } from "../../studio/types";
import { BarChart, TrendChart } from "./Charts";
import { AutonomyChip, Kpi, ScoreBar, TrustChip, fmtDay, fmtPct, pctOf, quantile } from "./shared";
import type { ScoredRun } from "./shared";

type SortKey = "agent" | "runs" | "avgScore" | "passRate" | "critical" | "override" | "cost" | "p95" | "autonomy" | "trust";

interface Row {
  stepId: number;
  name: string;
  agent: string;
  st: AgentStats;
  trust: Trust;
  reason: string;
  autonomy: Autonomy;
}

const AUTONOMY_ORDER: Record<Autonomy, number> = { suggest: 0, draft: 1, auto: 2 };
const TRUST_ORDER: Record<Trust, number> = { demote: 0, hold: 1, insufficient: 2, promote: 3 };

function sortValue(r: Row, k: SortKey): number | null {
  switch (k) {
    case "agent":
      return r.stepId;
    case "runs":
      return r.st.runs;
    case "avgScore":
      return r.st.avgScore;
    case "passRate":
      return r.st.passRatePct;
    case "critical":
      return r.st.criticalFails;
    case "override":
      return r.st.overrideRatePct;
    case "cost":
      return r.st.runs ? r.st.avgCostUsd : null;
    case "p95":
      return r.st.runs ? r.st.p95Ms : null;
    case "autonomy":
      return AUTONOMY_ORDER[r.autonomy];
    case "trust":
      return TRUST_ORDER[r.trust];
  }
}

const SORT_LABEL: Record<SortKey, string> = {
  agent: "Agent order",
  runs: "Runs",
  avgScore: "Average score",
  passRate: "Pass rate",
  critical: "Critical violations",
  override: "Human override rate",
  cost: "Average cost",
  p95: "p95 latency",
  autonomy: "Current autonomy",
  trust: "Trust recommendation",
};

interface Props {
  scored: ScoredRun[];
  runs: AgentRun[];
  rules: SpecRule[];
  scoring: ScoringConfig;
  onOpenAgent: (stepId: number) => void;
}

export default function Scoreboard({ scored, runs, rules, scoring, onOpenAgent }: Props) {
  const agents = useStudio((s) => s.agents);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "avgScore", dir: "asc" });
  const [metric, setMetric] = useState<"runs" | "cost">("runs");

  const kpi = useMemo(() => {
    const total = runs.length;
    const passed = scored.filter((x) => x.s.passed).length;
    const scores = scored.map((x) => x.s.score).filter((v): v is number => v !== null);
    const crit = scored.reduce((a, x) => a + x.s.criticalFails, 0);
    const human = runs.filter((r) => r.humanOutcome !== "none");
    const overrides = human.filter((r) => r.humanOutcome === "edited" || r.humanOutcome === "rejected").length;
    return {
      total,
      passRate: pctOf(passed, total),
      avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      crit,
      override: pctOf(overrides, human.length),
      humanRuns: human.length,
      avgCost: total ? runs.reduce((a, r) => a + r.costUsd, 0) / total : 0,
      p95: quantile(runs.map((r) => r.durationMs), 0.95),
    };
  }, [runs, scored]);

  const trend = useMemo(() => weeklyTrend(runs, rules, scoring), [runs, rules, scoring]);

  const weekly = useMemo(() => {
    const map = new Map<string, { runs: number; cost: number }>();
    for (const r of runs) {
      const d = new Date(r.startedAt);
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))).toISOString().slice(0, 10);
      const cur = map.get(monday) ?? { runs: 0, cost: 0 };
      map.set(monday, { runs: cur.runs + 1, cost: cur.cost + r.costUsd });
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({ week, ...v }));
  }, [runs]);

  const rows = useMemo<Row[]>(() => {
    const base = STEPS.map((step) => {
      const st = agentStats(step.id, runs, rules, scoring);
      const t = trustRecommendation(st, scoring);
      return { stepId: step.id, name: step.name, agent: step.agent, st, trust: t.trust, reason: t.reason, autonomy: agents[step.id]?.live.autonomy ?? ("suggest" as Autonomy) };
    });
    const sign = sort.dir === "asc" ? 1 : -1;
    return base.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      if (va === null && vb === null) return a.stepId - b.stepId;
      if (va === null) return 1; // no data always last
      if (vb === null) return -1;
      return va === vb ? a.stepId - b.stepId : (va - vb) * sign;
    });
  }, [runs, rules, scoring, agents, sort]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "avgScore" || key === "passRate" || key === "agent" || key === "autonomy" || key === "trust" ? "asc" : "desc" }));

  const worst = rows.find((r) => r.st.avgScore !== null);

  const th = (k: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === k;
    return (
      <th key={k} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-2 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
        <button
          type="button"
          onClick={() => toggle(k)}
          className={`inline-flex items-center gap-1 rounded-chip text-xs font-medium hover:text-ink ${active ? "text-ink" : "text-muted"} ${align === "right" ? "flex-row-reverse" : ""}`}
        >
          {label}
          {active ? sort.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" /> : <ChevronsUpDown className="h-3 w-3 opacity-60" aria-hidden="true" />}
        </button>
      </th>
    );
  };

  const trendPoints = trend.map((t) => ({ label: fmtDay(t.week), fullLabel: fmtDay(t.week), value: t.avg, detail: `${t.runs} runs judged` }));
  const barPoints = weekly.map((t) => ({ label: fmtDay(t.week), fullLabel: fmtDay(t.week), value: metric === "runs" ? t.runs : t.cost, detail: metric === "runs" ? fmtUsd(t.cost) : `${t.runs} runs` }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Runs" value={kpi.total.toLocaleString("en-US")} hint="all agents" icon={Activity} />
        <Kpi label="Pass rate" value={fmtPct(kpi.passRate)} hint={`pass score ${scoring.passScore}`} icon={CircleCheck} tone={kpi.passRate === null ? "neutral" : kpi.passRate >= scoring.promotionPassRatePct ? "ok" : kpi.passRate >= scoring.demotionPassRatePct ? "warn" : "danger"} />
        <Kpi label="Average judge score" value={kpi.avgScore === null ? "n/a" : kpi.avgScore.toFixed(1)} hint="out of 100" icon={Gauge} />
        <Kpi label="Critical violations" value={String(kpi.crit)} hint="critical rules failed" icon={ShieldAlert} tone={kpi.crit > 0 ? "danger" : "ok"} />
        <Kpi label="Human override rate" value={fmtPct(kpi.override)} hint={`${kpi.humanRuns} runs had a gate`} icon={UserRoundCheck} />
        <Kpi label="Average cost per run" value={fmtUsd(kpi.avgCost)} hint="model and tokens" icon={Coins} />
        <Kpi label="p95 latency" value={fmtMs(kpi.p95)} hint="slowest 5 percent" icon={Timer} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 p-4 lg:col-span-3">
          <SectionTitle title="Average judge score per week" hint="Each run is scored against its agent's Behavior Spec. Dashed line is the pass score." />
          <div className="mt-3">
            {trendPoints.length === 0 ? (
              <p className="text-sm text-muted">No judged runs yet.</p>
            ) : (
              <TrendChart
                points={trendPoints}
                threshold={scoring.passScore}
                title="Average judge score per week"
                desc={`Weekly average judge score from ${trendPoints[0].fullLabel} to ${trendPoints[trendPoints.length - 1].fullLabel}. The latest week is ${trendPoints[trendPoints.length - 1].value.toFixed(1)}. Pass score is ${scoring.passScore}.`}
                valueHeader="Average score"
                detailHeader="Runs judged"
              />
            )}
          </div>
        </Card>
        <Card className="min-w-0 p-4 lg:col-span-2">
          <SectionTitle
            title={metric === "runs" ? "Runs per week" : "Model cost per week"}
            hint="Volume and spend, so reliability is read next to cost."
            action={
              <Segmented
                label="Chart metric"
                value={metric}
                onChange={setMetric}
                options={[
                  { id: "runs", label: "Runs" },
                  { id: "cost", label: "Cost" },
                ]}
              />
            }
          />
          <div className="mt-3">
            {barPoints.length === 0 ? (
              <p className="text-sm text-muted">No runs yet.</p>
            ) : (
              <BarChart
                points={barPoints}
                title={metric === "runs" ? "Runs per week" : "Model cost per week"}
                desc={`Bar chart of ${metric === "runs" ? "runs" : "model cost"} for each week, ${barPoints.length} weeks.`}
                valueHeader={metric === "runs" ? "Runs" : "Cost"}
                detailHeader={metric === "runs" ? "Cost" : "Runs"}
                fmt={metric === "runs" ? (n) => String(Math.round(n)) : fmtUsd}
              />
            )}
          </div>
        </Card>
      </div>

      <Callout tone="info" icon={UserCheck} title="This screen only recommends. A human decides.">
        Trust recommendations come from the numbers below and the thresholds under Scoring rules. Autonomy is changed by a person on the Agents screen, never by this score.
      </Callout>

      <Card className="p-4">
        <SectionTitle
          title="Agent scoreboard"
          hint={worst ? `Lowest average score first. ${worst.agent} is currently at ${worst.st.avgScore?.toFixed(1)}. Select an agent to see its runs.` : "Select an agent to see its runs."}
        />

        {/* Narrow: sort control plus stacked cards */}
        <div className="mt-3 flex items-end gap-2 xl:hidden">
          <div className="min-w-0 flex-1">
            <Select label="Sort agents by" value={sort.key} onChange={(e) => setSort((s) => ({ ...s, key: e.target.value as SortKey }))}>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </Select>
          </div>
          <Button icon={sort.dir === "asc" ? ArrowUp : ArrowDown} onClick={() => setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))} aria-label={`Sort direction: ${sort.dir === "asc" ? "ascending" : "descending"}. Press to reverse.`}>
            {sort.dir === "asc" ? "Low first" : "High first"}
          </Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:hidden" aria-live="polite">
          {rows.map((r) => (
            <article key={r.stepId} className="rounded-control border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">
                    <span className="tabular-nums text-muted">{r.stepId}.</span> {r.agent}
                  </div>
                  <div className="text-xs text-muted">{r.name}</div>
                </div>
                <TrustChip trust={r.trust} />
              </div>
              <p className="mt-1 text-xs text-muted">{r.reason}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <Stat label="Average score">
                  <ScoreBar value={r.st.avgScore} passScore={scoring.passScore} />
                </Stat>
                <Stat label="Pass rate">{fmtPct(r.st.passRatePct)}</Stat>
                <Stat label="Runs">{r.st.runs}</Stat>
                <Stat label="Critical violations">
                  {r.st.criticalFails > 0 ? <span className={`inline-flex items-center gap-1 font-semibold ${TONE_TEXT.danger}`}><ShieldAlert className="h-3 w-3" aria-hidden="true" />{r.st.criticalFails}</span> : "0"}
                </Stat>
                <Stat label="Override rate">{fmtPct(r.st.overrideRatePct)}</Stat>
                <Stat label="Average cost">{r.st.runs ? fmtUsd(r.st.avgCostUsd) : "n/a"}</Stat>
                <Stat label="p95 latency">{r.st.runs ? fmtMs(r.st.p95Ms) : "n/a"}</Stat>
                <Stat label="Current autonomy">
                  <AutonomyChip autonomy={r.autonomy} />
                </Stat>
              </dl>
              <Button size="sm" className="mt-3 w-full" onClick={() => onOpenAgent(r.stepId)}>
                View runs for {r.agent}
              </Button>
            </article>
          ))}
        </div>

        {/* Wide: sortable table */}
        <div className="mt-3 hidden overflow-x-auto xl:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {th("agent", "Agent")}
                {th("runs", "Runs", "right")}
                {th("avgScore", "Average score")}
                {th("passRate", "Pass rate", "right")}
                {th("critical", "Critical", "right")}
                {th("override", "Override rate", "right")}
                {th("cost", "Avg cost", "right")}
                {th("p95", "p95", "right")}
                {th("autonomy", "Autonomy")}
                {th("trust", "Trust recommendation")}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.stepId} onClick={() => onOpenAgent(r.stepId)} className="cursor-pointer border-b border-line align-top last:border-b-0 hover:bg-surface-2">
                  <td className="px-2 py-2.5">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onOpenAgent(r.stepId); }} className="rounded-chip text-left" aria-label={`View runs for ${r.agent}`}>
                      <div className="text-sm font-semibold text-ink">
                        <span className="tabular-nums text-muted">{r.stepId}.</span> {r.agent}
                      </div>
                      <div className="text-xs text-muted">{r.name}</div>
                    </button>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.st.runs}</td>
                  <td className="px-2 py-2.5">
                    <ScoreBar value={r.st.avgScore} passScore={scoring.passScore} />
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{fmtPct(r.st.passRatePct)}</td>
                  <td className="px-2 py-2.5 text-right">
                    {r.st.criticalFails > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-danger-line bg-danger-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-danger-fg">
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                        {r.st.criticalFails}
                      </span>
                    ) : (
                      <span className="tabular-nums text-muted">0</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{fmtPct(r.st.overrideRatePct)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.st.runs ? fmtUsd(r.st.avgCostUsd) : "n/a"}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.st.runs ? fmtMs(r.st.p95Ms) : "n/a"}</td>
                  <td className="px-2 py-2.5">
                    <AutonomyChip autonomy={r.autonomy} />
                  </td>
                  <td className="max-w-56 px-2 py-2.5" title={r.reason}>
                    <TrustChip trust={r.trust} />
                    <div className="mt-1 text-xs leading-snug text-muted">{r.reason}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-ink">{children}</dd>
    </div>
  );
}
