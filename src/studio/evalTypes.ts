// Data model for Agent orchestration and Evaluation. Separate from the step inspector model on purpose.

/* ------------------------------ Behavior Spec ------------------------------ */

export type Severity = "critical" | "standard";
export type JudgeMethod = "deterministic" | "llm_judge";

/** One written rule an agent must follow. The judge checks every run against these. */
export interface SpecRule {
  id: string;
  stepId: number;
  title: string; // short, like "Never invent material prices"
  text: string; // the full rule
  severity: Severity;
  method: JudgeMethod; // how it is checked: code or an LLM judge
  locked: boolean; // locked rules cannot be edited or removed in the UI
}

/* ------------------------------ Orchestration ------------------------------ */

export interface OrchestrationConfig {
  stepId: number;
  paused: boolean; // kill switch. A paused agent only queues work for humans.
  requireApproval: boolean; // human gate after the agent finishes
  approverRole: string;
  maxRetries: number;
  timeoutSec: number;
  onFailure: "escalate" | "retry" | "stop";
  concurrency: number; // parallel runs
}

export interface DomainEvent {
  name: string; // OrderAwarded
  description: string;
  producerStep: number;
  consumerSteps: number[];
  delivery: "at_least_once";
  deadLetter: boolean;
}

/* ------------------------------ Runs and trajectories ------------------------------ */

export type Verdict = "pass" | "warn" | "fail" | "na";

export interface RuleCheck {
  ruleId: string;
  verdict: Verdict;
  evidence: string; // what the judge saw
}

export type TrajectoryKind = "input" | "context" | "model" | "tool_call" | "decision" | "output" | "human" | "error" | "retry";

export interface TrajectoryStep {
  id: string;
  kind: TrajectoryKind;
  label: string;
  detail: string;
  durationMs: number;
  tokensIn?: number;
  tokensOut?: number;
  ok: boolean;
}

export type RunStatus = "success" | "needs_review" | "failed" | "blocked";
export type HumanOutcome = "approved" | "edited" | "rejected" | "none";

export interface AgentRun {
  id: string;
  stepId: number;
  agentName: string;
  quotationId: string;
  startedAt: string;
  model: string;
  agentVersion: number;
  specVersion: number;
  status: RunStatus;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  retries: number;
  errors: number;
  humanOutcome: HumanOutcome;
  checks: RuleCheck[];
  trajectory: TrajectoryStep[];
}

/* ------------------------------ Scoring ------------------------------ */

export interface ScoringConfig {
  /** A run passes when score is at least this and no critical rule failed. */
  passScore: number;
  /** A critical rule counts this many times in the weighted score. Standard rules count once. */
  criticalWeight: number;
  /** Share of credit a warn gets. Pass gets 1, fail gets 0. */
  warnCredit: number;
  /** Trust model: an agent is a candidate for more autonomy only when ALL of these hold over its recent runs. */
  promotionMinRuns: number;
  promotionPassRatePct: number;
  promotionMaxOverrideRatePct: number;
  /** Below this pass rate an agent is recommended for demotion to Suggest only. */
  demotionPassRatePct: number;
}

export interface EvalSuite {
  id: string;
  stepId: number;
  name: string;
  description: string;
  cases: number;
  lastRunAt: string;
  passed: number; // of cases at last run
  agentVersion: number;
}

export interface RunFeedback {
  agree: boolean; // does the human agree with the judge
  note: string;
  inRegressionSet: boolean;
  at: string;
}
