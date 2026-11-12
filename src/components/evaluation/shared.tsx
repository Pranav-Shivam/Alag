import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CircleCheck,
  CircleMinus,
  CircleX,
  Cpu,
  Eye,
  Hand,
  Hourglass,
  Minus,
  Pencil,
  PencilLine,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Chip, TONE_SOLID, TONE_TEXT } from "../ui";
import type { Tone } from "../ui";
import { scoreRun } from "../../studio/evalCalc";
import type { RunScore, Trust } from "../../studio/evalCalc";
import type { AgentRun, HumanOutcome, JudgeMethod, RunStatus, ScoringConfig, Severity, SpecRule, Verdict } from "../../studio/evalTypes";
import type { Autonomy } from "../../studio/types";
import { STEPS } from "../../data/steps";

/* ------------------------------ Types shared by the tabs ------------------------------ */

export type SubTab = "scoreboard" | "runs" | "rules" | "suites";

export interface ScoredRun {
  run: AgentRun;
  s: RunScore;
}

export interface RunFilters {
  stepId: number | "all";
  status: "all" | "success" | "needs_review" | "failed";
  verdict: "all" | "critical" | "fail" | "warn";
  query: string;
  ruleId: string | null;
}

export const EMPTY_FILTERS: RunFilters = { stepId: "all", status: "all", verdict: "all", query: "", ruleId: null };

export function scoreAll(runs: AgentRun[], rules: SpecRule[], cfg: ScoringConfig): ScoredRun[] {
  return runs.map((run) => ({ run, s: scoreRun(run, rules, cfg) }));
}

/* ------------------------------ Look-up tables: always icon plus word plus tone ------------------------------ */

interface Meta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

export const VERDICT_META: Record<Verdict, Meta> = {
  pass: { label: "Pass", tone: "ok", icon: CircleCheck },
  warn: { label: "Warn", tone: "warn", icon: TriangleAlert },
  fail: { label: "Fail", tone: "danger", icon: CircleX },
  na: { label: "Not judged", tone: "neutral", icon: CircleMinus },
};

export const STATUS_META: Record<RunStatus, Meta> = {
  success: { label: "Success", tone: "ok", icon: CircleCheck },
  needs_review: { label: "Needs review", tone: "warn", icon: Eye },
  failed: { label: "Failed", tone: "danger", icon: CircleX },
  blocked: { label: "Blocked", tone: "alert", icon: Ban },
};

export const HUMAN_META: Record<HumanOutcome, Meta> = {
  approved: { label: "Approved", tone: "ok", icon: ThumbsUp },
  edited: { label: "Edited", tone: "info", icon: Pencil },
  rejected: { label: "Rejected", tone: "danger", icon: CircleX },
  none: { label: "No human gate", tone: "neutral", icon: CircleMinus },
};

export const AUTONOMY_META: Record<Autonomy, Meta> = {
  suggest: { label: "Suggest only", tone: "neutral", icon: Hand },
  draft: { label: "Draft", tone: "info", icon: PencilLine },
  auto: { label: "Autonomous", tone: "teal", icon: Zap },
};

export const TRUST_META: Record<Trust, Meta> = {
  promote: { label: "Promote", tone: "ok", icon: ArrowUp },
  hold: { label: "Hold", tone: "neutral", icon: Minus },
  demote: { label: "Demote", tone: "danger", icon: ArrowDown },
  insufficient: { label: "Not enough runs", tone: "info", icon: Hourglass },
};

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <Chip tone={m.tone} icon={m.icon}>
      {m.label}
    </Chip>
  );
}

export function StatusChip({ status }: { status: RunStatus }) {
  const m = STATUS_META[status];
  return (
    <Chip tone={m.tone} icon={m.icon}>
      {m.label}
    </Chip>
  );
}

export function HumanChip({ outcome }: { outcome: HumanOutcome }) {
  const m = HUMAN_META[outcome];
  return (
    <Chip tone={m.tone} icon={m.icon}>
      {m.label}
    </Chip>
  );
}

export function SeverityChip({ severity }: { severity: Severity }) {
  return severity === "critical" ? (
    <Chip tone="danger" icon={ShieldAlert}>
      Critical
    </Chip>
  ) : (
    <Chip tone="neutral">Standard</Chip>
  );
}

export function MethodChip({ method }: { method: JudgeMethod }) {
  return method === "deterministic" ? (
    <Chip tone="teal" icon={Cpu}>
      Code check
    </Chip>
  ) : (
    <Chip tone="violet" icon={Sparkles}>
      LLM judge
    </Chip>
  );
}

export function AutonomyChip({ autonomy }: { autonomy: Autonomy }) {
  const m = AUTONOMY_META[autonomy];
  return (
    <Chip tone={m.tone} icon={m.icon}>
      {m.label}
    </Chip>
  );
}

export function TrustChip({ trust }: { trust: Trust }) {
  const m = TRUST_META[trust];
  return (
    <Chip tone={m.tone} icon={m.icon}>
      {m.label}
    </Chip>
  );
}

/** Green at or above the pass score, amber within 10 points, red below. */
export function scoreTone(score: number | null, passScore: number): Tone {
  if (score === null) return "neutral";
  if (score >= passScore) return "ok";
  if (score >= passScore - 10) return "warn";
  return "danger";
}

export function ScoreChip({ score, passed, passScore }: { score: number | null; passed: boolean; passScore: number }) {
  if (score === null) return <Chip tone="neutral" icon={CircleMinus}>Not judged</Chip>;
  return (
    <Chip tone={scoreTone(score, passScore)} icon={passed ? CircleCheck : CircleX} className="tabular-nums">
      {score.toFixed(1)}
    </Chip>
  );
}

/** Number plus thin bar. The number carries the meaning, the bar is a visual aid. */
export function ScoreBar({ value, passScore, className = "" }: { value: number | null; passScore: number; className?: string }) {
  if (value === null) return <span className="text-xs text-muted">No data</span>;
  const tone = scoreTone(value, passScore);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className={`h-full rounded-full ${TONE_SOLID[tone]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{value.toFixed(1)}</span>
    </div>
  );
}

export function VerdictSummary({ s }: { s: RunScore }) {
  const pass = s.lines.filter((l) => l.check.verdict === "pass").length;
  const item = (n: number, word: string, tone: Tone, Icon: LucideIcon) => (
    <span className={`inline-flex items-center gap-1 text-xs tabular-nums ${n > 0 ? TONE_TEXT[tone] : "text-muted"}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {n} {word}
    </span>
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
      {item(pass, "pass", "ok", CircleCheck)}
      {item(s.warns, "warn", "warn", TriangleAlert)}
      {item(s.fails, "fail", "danger", CircleX)}
    </span>
  );
}

export function Kpi({ label, value, hint, icon: Icon, tone = "neutral" }: { label: string; value: string; hint?: string; icon: LucideIcon; tone?: Tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-3 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-xs font-medium text-muted">{label}</div>
        <Icon className={`h-4 w-4 shrink-0 ${TONE_TEXT[tone]}`} aria-hidden="true" />
      </div>
      <div className={`mt-1 truncate text-xl font-semibold tabular-nums ${tone === "neutral" ? "text-ink" : TONE_TEXT[tone]}`}>{value}</div>
      {hint ? <div className="mt-0.5 truncate text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
      <div className="text-sm font-semibold text-ink">{title}</div>
      {children ? <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/* ------------------------------ Formatting and math ------------------------------ */

export function agentLabel(stepId: number): string {
  const s = STEPS.find((x) => x.id === stepId);
  return s ? s.agent : `Step ${stepId}`;
}

export function fmtPct(n: number | null): string {
  return n === null ? "n/a" : `${n.toFixed(1)}%`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }) + " UTC";
}

export function fmtDay(iso: string): string {
  return new Date(iso + (iso.length === 10 ? "T00:00:00Z" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function pctOf(n: number, d: number): number | null {
  return d === 0 ? null : Math.round((n / d) * 1000) / 10;
}

/** Credit as a short number: 1, 0.5, 0. */
export function fmtCredit(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/* ------------------------------ Hooks ------------------------------ */

/** Width of an element in pixels, kept up to date. Lets the SVG charts draw at real size so text stays readable. */
export function useElementWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* ------------------------------ Jump requests from other screens ------------------------------ */

export interface GotoDetail {
  tab?: string;
  ruleId?: string;
  runId?: string;
  stepId?: number;
}

let pending: { detail: GotoDetail; at: number } | null = null;

// Registered when this module loads, so a jump that arrives just before the page mounts is not lost.
if (typeof window !== "undefined") {
  window.addEventListener("alag:goto", (e) => {
    const d = (e as CustomEvent<GotoDetail>).detail;
    if (d && d.tab === "evaluation") pending = { detail: d, at: Date.now() };
  });
}

export function peekPendingGoto(): GotoDetail | null {
  return pending && Date.now() - pending.at < 2500 ? pending.detail : null;
}

export function clearPendingGoto() {
  pending = null;
}

export function hasTarget(d: GotoDetail): boolean {
  return Boolean(d.ruleId || d.runId || typeof d.stepId === "number");
}
