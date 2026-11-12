import { useMemo } from "react";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STEPS } from "../../data/steps";
import type { WorkflowStep } from "../../types";
import { agentStats, trustRecommendation } from "../../studio/evalCalc";
import type { AgentStats, Trust } from "../../studio/evalCalc";
import type { OrchestrationConfig, SpecRule } from "../../studio/evalTypes";
import { useEval } from "../../studio/evalStore";
import { useStudio } from "../../studio/store";
import type { Autonomy, AgentBody } from "../../studio/types";
import type { Tone } from "../ui";

export type SubTab = "overview" | "specs" | "orchestration" | "catalog";

export const AUTONOMY_ORDER: Autonomy[] = ["suggest", "draft", "auto"];

export const AUTONOMY_META: Record<Autonomy, { label: string; tone: Tone; icon: LucideIcon; blurb: string }> = {
  suggest: { label: "Suggest only", tone: "info", icon: Shield, blurb: "The agent proposes. A person does the work." },
  draft: { label: "Draft for approval", tone: "warn", icon: ShieldCheck, blurb: "The agent prepares the work. A person approves before anything changes." },
  auto: { label: "Auto", tone: "violet", icon: ShieldAlert, blurb: "The agent acts on its own inside its limits. Every action is audited." },
};

export const APPROVER_ROLES = ["Estimator", "Sales manager", "Procurement lead", "Quality lead", "Support lead", "Finance", "Director"];

export interface AgentGroup {
  id: string;
  title: string;
  hint: string;
  from: number;
  to: number;
  tone: Tone;
}

export const GROUPS: AgentGroup[] = [
  { id: "commercial", title: "Commercial", hint: "From the customer email to a signed order", from: 1, to: 7, tone: "info" },
  { id: "operational", title: "Operational", hint: "Buying, storing, making and delivering", from: 8, to: 11, tone: "teal" },
  { id: "financial", title: "Financial and customer", hint: "Money, service and learning", from: 12, to: 14, tone: "violet" },
];

export const TRUST_META: Record<Trust, { label: string; tone: Tone }> = {
  promote: { label: "Candidate for more autonomy", tone: "ok" },
  hold: { label: "Keep the current level", tone: "neutral" },
  demote: { label: "Candidate for less autonomy", tone: "danger" },
  insufficient: { label: "Not enough runs yet", tone: "neutral" },
};

export const METHOD_LABEL: Record<SpecRule["method"], string> = { deterministic: "Code check", llm_judge: "LLM judge" };
export const SEVERITY_LABEL: Record<SpecRule["severity"], string> = { critical: "Critical", standard: "Standard" };

export interface AgentRow {
  step: WorkflowStep;
  body: AgentBody;
  hasDraft: boolean;
  version: number;
  orch: OrchestrationConfig;
  rules: SpecRule[];
  critical: number;
  enabledTools: number;
  stats: AgentStats;
  trust: { trust: Trust; reason: string };
}

/** One row per agent, joined from both stores. Everything on the screen is derived from here. */
export function useAgentRows(): AgentRow[] {
  const agents = useStudio((s) => s.agents);
  const rules = useEval((s) => s.rules);
  const orchestration = useEval((s) => s.orchestration);
  const runs = useEval((s) => s.runs);
  const scoring = useEval((s) => s.scoring);
  return useMemo(
    () =>
      STEPS.map((step) => {
        const a = agents[step.id];
        const stepRules = rules.filter((r) => r.stepId === step.id);
        const stats = agentStats(step.id, runs, rules, scoring);
        const orch: OrchestrationConfig = orchestration.find((o) => o.stepId === step.id) ?? {
          stepId: step.id,
          paused: false,
          requireApproval: false,
          approverRole: APPROVER_ROLES[0],
          maxRetries: 2,
          timeoutSec: 60,
          onFailure: "escalate",
          concurrency: 1,
        };
        return {
          step,
          body: a.live,
          hasDraft: a.draft !== null,
          version: a.version,
          orch,
          rules: stepRules,
          critical: stepRules.filter((r) => r.severity === "critical").length,
          enabledTools: a.live.tools.filter((t) => t.enabled).length,
          stats,
          trust: trustRecommendation(stats, scoring),
        };
      }),
    [agents, rules, orchestration, runs, scoring],
  );
}

export const pctText = (n: number | null) => (n === null ? "No data" : `${Math.round(n * 10) / 10}%`);

export function goto(detail: { tab: "workflow" | "evaluation"; stepId?: number; ruleId?: string }) {
  window.dispatchEvent(new CustomEvent("alag:goto", { detail }));
}
