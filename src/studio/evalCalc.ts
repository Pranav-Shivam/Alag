import type { AgentRun, RuleCheck, ScoringConfig, SpecRule } from "./evalTypes";

/* The scoring mechanism. Pure functions, so changing a weight or a rule updates every screen at once. */

export const DEFAULT_SCORING: ScoringConfig = {
  passScore: 90,
  criticalWeight: 3,
  warnCredit: 0.5,
  promotionMinRuns: 20,
  promotionPassRatePct: 97,
  promotionMaxOverrideRatePct: 10,
  demotionPassRatePct: 85,
};

const CREDIT = (v: RuleCheck["verdict"], cfg: ScoringConfig) => (v === "pass" ? 1 : v === "warn" ? cfg.warnCredit : 0);

export interface RunScore {
  score: number | null; // null when nothing could be judged
  criticalFails: number;
  fails: number;
  warns: number;
  passed: boolean;
  /** Per check weight and credit, for the breakdown table. */
  lines: { check: RuleCheck; rule: SpecRule | undefined; weight: number; credit: number }[];
}

/** Weighted share of rules followed: sum(weight * credit) / sum(weight), times 100. Verdict na is left out. */
export function scoreRun(run: AgentRun, rules: SpecRule[], cfg: ScoringConfig): RunScore {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const lines = run.checks
    .filter((c) => c.verdict !== "na" && byId.has(c.ruleId))
    .map((check) => {
      const rule = byId.get(check.ruleId);
      const weight = rule?.severity === "critical" ? cfg.criticalWeight : 1;
      return { check, rule, weight, credit: CREDIT(check.verdict, cfg) };
    });
  const totalW = lines.reduce((s, l) => s + l.weight, 0);
  const score = totalW === 0 ? null : Math.round((lines.reduce((s, l) => s + l.weight * l.credit, 0) / totalW) * 1000) / 10;
  const criticalFails = lines.filter((l) => l.rule?.severity === "critical" && l.check.verdict === "fail").length;
  const fails = lines.filter((l) => l.check.verdict === "fail").length;
  const warns = lines.filter((l) => l.check.verdict === "warn").length;
  const passed = run.status !== "failed" && criticalFails === 0 && score !== null && score >= cfg.passScore;
  return { score, criticalFails, fails, warns, passed, lines };
}

export interface AgentStats {
  stepId: number;
  runs: number;
  judged: number;
  avgScore: number | null;
  passRatePct: number | null;
  criticalFails: number;
  overrideRatePct: number | null; // human edited or rejected, of runs that had a human gate
  avgCostUsd: number;
  totalCostUsd: number;
  p50Ms: number;
  p95Ms: number;
  failedRuns: number;
  retries: number;
}

const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);
const quantile = (sorted: number[], q: number) => (sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);

export function agentStats(stepId: number, runs: AgentRun[], rules: SpecRule[], cfg: ScoringConfig): AgentStats {
  const mine = runs.filter((r) => r.stepId === stepId);
  const scored = mine.map((r) => scoreRun(r, rules, cfg));
  const judged = scored.filter((s) => s.score !== null);
  const human = mine.filter((r) => r.humanOutcome !== "none");
  const durations = mine.map((r) => r.durationMs).sort((a, b) => a - b);
  const cost = mine.reduce((s, r) => s + r.costUsd, 0);
  return {
    stepId,
    runs: mine.length,
    judged: judged.length,
    avgScore: judged.length ? Math.round((judged.reduce((s, x) => s + (x.score as number), 0) / judged.length) * 10) / 10 : null,
    passRatePct: pct(scored.filter((s) => s.passed).length, mine.length),
    criticalFails: scored.reduce((s, x) => s + x.criticalFails, 0),
    overrideRatePct: pct(human.filter((r) => r.humanOutcome === "edited" || r.humanOutcome === "rejected").length, human.length),
    avgCostUsd: mine.length ? cost / mine.length : 0,
    totalCostUsd: cost,
    p50Ms: quantile(durations, 0.5),
    p95Ms: quantile(durations, 0.95),
    failedRuns: mine.filter((r) => r.status === "failed").length,
    retries: mine.reduce((s, r) => s + r.retries, 0),
  };
}

export type Trust = "promote" | "hold" | "demote" | "insufficient";

/** Trust model: autonomy is earned from evidence and always decided by a human. This only recommends. */
export function trustRecommendation(stats: AgentStats, cfg: ScoringConfig): { trust: Trust; reason: string } {
  if (stats.runs < cfg.promotionMinRuns) return { trust: "insufficient", reason: `Only ${stats.runs} runs. Needs ${cfg.promotionMinRuns} before any change.` };
  const pass = stats.passRatePct ?? 0;
  const over = stats.overrideRatePct ?? 0;
  if (stats.criticalFails > 0) return { trust: pass < cfg.demotionPassRatePct ? "demote" : "hold", reason: `${stats.criticalFails} critical rule violation${stats.criticalFails > 1 ? "s" : ""}. Autonomy cannot rise.` };
  if (pass < cfg.demotionPassRatePct) return { trust: "demote", reason: `Pass rate ${pass}% is below ${cfg.demotionPassRatePct}%.` };
  if (pass >= cfg.promotionPassRatePct && over <= cfg.promotionMaxOverrideRatePct) return { trust: "promote", reason: `Pass rate ${pass}% and human override rate ${over}% meet the bar.` };
  return { trust: "hold", reason: `Pass rate ${pass}% (need ${cfg.promotionPassRatePct}%) and override rate ${over}% (max ${cfg.promotionMaxOverrideRatePct}%).` };
}

/** Average score per ISO week, oldest first. For trend charts. */
export function weeklyTrend(runs: AgentRun[], rules: SpecRule[], cfg: ScoringConfig): { week: string; avg: number; runs: number }[] {
  const buckets = new Map<string, number[]>();
  for (const r of runs) {
    const s = scoreRun(r, rules, cfg).score;
    if (s === null) continue;
    const d = new Date(r.startedAt);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
    const key = monday.toISOString().slice(0, 10);
    buckets.set(key, [...(buckets.get(key) ?? []), s]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, xs]) => ({ week, avg: Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10, runs: xs.length }));
}

export function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}
export function fmtUsd(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(n < 1 ? 3 : 2)}`;
}
