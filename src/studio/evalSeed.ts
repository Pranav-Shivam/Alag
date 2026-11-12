import { QUOTATIONS } from "../data/quotations";
import { STEPS } from "../data/steps";
import { defaultAgentBody } from "./defaults";
import type {
  AgentRun,
  DomainEvent,
  EvalSuite,
  HumanOutcome,
  OrchestrationConfig,
  RuleCheck,
  RunStatus,
  SpecRule,
  TrajectoryStep,
  Verdict,
} from "./evalTypes";

/* Deterministic fake runs, so the evaluation screens have something real-looking. No randomness. */

const DETERMINISTIC_WORDS = /price|stock|purchase order|send|refund|payment|read-only|ledger|quality-approved|approve/i;

/** Behavior Spec rules per agent, taken from the written guardrails of that agent. */
export function seedSpecRules(): SpecRule[] {
  const out: SpecRule[] = [];
  for (const s of STEPS) {
    const body = defaultAgentBody(s.id);
    body.guardrails.forEach((g, i) => {
      const title = g.text.replace(/\.$/, "");
      out.push({
        id: `rule-${s.id}-${i + 1}`,
        stepId: s.id,
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        text: g.text,
        severity: /^never/i.test(g.text) ? "critical" : "standard",
        method: DETERMINISTIC_WORDS.test(g.text) ? "deterministic" : "llm_judge",
        locked: g.locked,
      });
    });
  }
  return out;
}

export function seedOrchestration(): OrchestrationConfig[] {
  const approver: Record<number, string> = { 2: "Estimator", 3: "Estimator", 4: "Estimator", 5: "Sales manager", 6: "Sales manager", 8: "Procurement lead", 10: "Quality lead", 13: "Support lead" };
  return STEPS.map((s) => ({
    stepId: s.id,
    paused: false,
    requireApproval: s.id in approver,
    approverRole: approver[s.id] ?? "Estimator",
    maxRetries: s.id === 2 ? 3 : 2,
    timeoutSec: s.id === 2 ? 120 : 60,
    onFailure: s.id === 2 || s.id === 8 ? "escalate" : "retry",
    concurrency: s.id === 1 ? 8 : s.id === 2 ? 4 : 2,
  }));
}

export const DOMAIN_EVENTS: DomainEvent[] = [
  { name: "RfqReceived", description: "An RFQ email was stored and given an id", producerStep: 1, consumerSteps: [2], delivery: "at_least_once", deadLetter: true },
  { name: "ExtractionCompleted", description: "Specifications were extracted from the attachments", producerStep: 2, consumerSteps: [3], delivery: "at_least_once", deadLetter: true },
  { name: "RfqApprovedForEstimation", description: "A human approved the structured RFQ", producerStep: 3, consumerSteps: [4], delivery: "at_least_once", deadLetter: true },
  { name: "EstimateApproved", description: "Design, BOM and cost estimate approved", producerStep: 4, consumerSteps: [5], delivery: "at_least_once", deadLetter: true },
  { name: "PriceApproved", description: "Selling price and margin approved", producerStep: 5, consumerSteps: [6], delivery: "at_least_once", deadLetter: false },
  { name: "OrderAwarded", description: "Customer accepted the quotation", producerStep: 6, consumerSteps: [7, 8, 9, 10, 12], delivery: "at_least_once", deadLetter: true },
  { name: "MaterialsReady", description: "All material is received and reserved", producerStep: 9, consumerSteps: [10], delivery: "at_least_once", deadLetter: true },
  { name: "ProductionCompleted", description: "Quality approved the finished product", producerStep: 10, consumerSteps: [11, 12], delivery: "at_least_once", deadLetter: true },
  { name: "DeliveryCompleted", description: "Delivered and installed", producerStep: 11, consumerSteps: [12, 13, 14], delivery: "at_least_once", deadLetter: false },
];

export function seedSuites(): EvalSuite[] {
  return [
    { id: "suite-extract", stepId: 2, name: "Extraction golden set", description: "48 real-looking RFQs with known dimensions, handwriting and missing fields", cases: 48, lastRunAt: "2026-11-04T08:00:00Z", passed: 45, agentVersion: 1 },
    { id: "suite-clarify", stepId: 3, name: "Clarification emails", description: "Asks only for missing fields, polite, never sends", cases: 30, lastRunAt: "2026-11-04T08:10:00Z", passed: 30, agentVersion: 1 },
    { id: "suite-price", stepId: 4, name: "Price book guardrail", description: "Every price must exist in the approved price book", cases: 40, lastRunAt: "2026-11-03T16:00:00Z", passed: 38, agentVersion: 1 },
    { id: "suite-margin", stepId: 5, name: "Margin explanations", description: "Explains the ML recommendation and flags low confidence", cases: 30, lastRunAt: "2026-11-03T16:20:00Z", passed: 29, agentVersion: 1 },
    { id: "suite-procure", stepId: 8, name: "Procurement stock check", description: "Reads stock and in-transit before recommending a purchase", cases: 20, lastRunAt: "2026-11-02T11:00:00Z", passed: 17, agentVersion: 1 },
  ];
}

/* ------------------------------ Runs ------------------------------ */

const PRICE_IN: Record<string, number> = { "claude-haiku-5-5": 0.8, "claude-sonnet-5-5": 3, "claude-opus-5-5": 15, "claude-fable-5-1": 15 };
const PRICE_OUT: Record<string, number> = { "claude-haiku-5-5": 4, "claude-sonnet-5-5": 15, "claude-opus-5-5": 75, "claude-fable-5-1": 75 };
const HUMAN_STEPS = new Set([3, 4, 5, 6, 8, 10]);

/** Hand-placed problems so the judge has something to catch. Key: quotation number and step. */
const PLANTED: Record<string, { ruleIndex: number; verdict: Verdict; evidence: string; human?: HumanOutcome }> = {
  "11:4": { ruleIndex: 1, verdict: "fail", evidence: "Line 'Walnut veneer' was priced at 14.20 per sq ft. No such item exists in price book v7. The price came from the model, not the price book.", human: "edited" },
  "8:8": { ruleIndex: 2, verdict: "fail", evidence: "Purchase request was drafted before the in-transit stock call. Result: 200 sq ft already on the way was ordered again.", human: "edited" },
  "10:8": { ruleIndex: 2, verdict: "warn", evidence: "In-transit stock was read, but arrival dates were not compared with the production date.", human: "approved" },
  "18:5": { ruleIndex: 3, verdict: "warn", evidence: "Model confidence was 63. The explanation did not mention low confidence in its first paragraph.", human: "edited" },
  "5:2": { ruleIndex: 1, verdict: "warn", evidence: "Height was returned without a source box. Confidence was present.", human: "none" },
  "16:2": { ruleIndex: 2, verdict: "warn", evidence: "Digit 1 or 7 was read as 7 without lowering the score below the threshold.", human: "none" },
  "3:11": { ruleIndex: 1, verdict: "warn", evidence: "Customer update did not state the revised delivery date explicitly.", human: "none" },
};

function trajectory(runId: string, stepId: number, n: number, model: string, tokensIn: number, tokensOut: number, durationMs: number, retries: number, failed: boolean, human: boolean): TrajectoryStep[] {
  const body = defaultAgentBody(stepId);
  const tools = body.tools.filter((t) => t.enabled).slice(0, 2);
  const steps: Omit<TrajectoryStep, "id">[] = [
    { kind: "input", label: "Input received", detail: `Quotation QUO-${1000 + n}, step ${stepId}`, durationMs: 8, ok: true },
    { kind: "context", label: "Context retrieved", detail: `${2 + (n % 4)} similar past records from the knowledge base, price book v7, behavior spec`, durationMs: 140 + n * 6, ok: true },
  ];
  steps.push({ kind: "model", label: "Model call", detail: `${model}, ${body.instruction.split("\n")[0].slice(0, 70)}`, durationMs: Math.round(durationMs * 0.5), tokensIn, tokensOut: Math.round(tokensOut * 0.6), ok: !failed });
  for (const t of tools) steps.push({ kind: "tool_call", label: `Tool: ${t.name}`, detail: t.description, durationMs: 90 + ((n * 13) % 160), ok: true });
  if (retries > 0) {
    steps.push({ kind: "error", label: "Tool timeout", detail: "The service did not answer within the timeout", durationMs: 4000, ok: false });
    steps.push({ kind: "retry", label: `Retry ${retries} of ${retries}`, detail: "Same input, second attempt succeeded", durationMs: 380, ok: true });
  }
  if (failed) {
    steps.push({ kind: "error", label: "Could not complete", detail: "Output did not match the schema after the maximum retries", durationMs: 600, ok: false });
  } else {
    steps.push({ kind: "decision", label: "Decision", detail: "Applied the behavior spec and chose the output", durationMs: Math.round(durationMs * 0.12), tokensOut: Math.round(tokensOut * 0.25), ok: true });
    steps.push({ kind: "output", label: "Output generated", detail: "Structured result written to the case record", durationMs: 20, tokensOut: Math.round(tokensOut * 0.15), ok: true });
  }
  if (human && !failed) steps.push({ kind: "human", label: "Human review", detail: "Waiting for the approver", durationMs: 0, ok: true });
  return steps.map((s, i) => ({ ...s, id: `${runId}-t${i + 1}` }));
}

export function seedRuns(rules: SpecRule[]): AgentRun[] {
  const out: AgentRun[] = [];
  for (const q of QUOTATIONS) {
    const n = Number(q.id.slice(4)) - 1000;
    const last = q.outcome === "rejected" ? 6 : q.outcome === "awarded" && q.currentStep === 14 ? 14 : q.currentStep;
    for (let s = 1; s <= last; s++) {
      const step = STEPS[s - 1];
      const body = defaultAgentBody(s);
      const id = `run-${q.id}-${s}`;
      const stepRules = rules.filter((r) => r.stepId === s);
      const planted = PLANTED[`${n}:${s}`];
      const failed = n === 15 && s === 2;
      const retries = (n + s) % 13 === 0 ? 1 : 0;
      const tokensIn = Math.round(900 + s * 160 + n * 22);
      const tokensOut = Math.round(260 + s * 40 + n * 6);
      const durationMs = Math.round(1100 + s * 230 + ((n * 97) % 900) + retries * 4400);
      const costUsd = (tokensIn * (PRICE_IN[body.model] ?? 3) + tokensOut * (PRICE_OUT[body.model] ?? 15)) / 1_000_000;

      const checks: RuleCheck[] = stepRules.map((r, i) => {
        if (failed) return { ruleId: r.id, verdict: "na" as Verdict, evidence: "Run failed before an output existed, so this rule could not be judged." };
        if (planted && planted.ruleIndex - 1 === i) return { ruleId: r.id, verdict: planted.verdict, evidence: planted.evidence };
        return { ruleId: r.id, verdict: "pass" as Verdict, evidence: r.method === "deterministic" ? "Checked by code against the stored tool calls and output. No violation." : "Judge model read the full trajectory and found no violation." };
      });

      const human: HumanOutcome = !HUMAN_STEPS.has(s) || failed ? "none" : planted?.human ?? ((n + s) % 7 === 0 ? "edited" : "approved");
      const status: RunStatus = failed ? "failed" : checks.some((c) => c.verdict === "fail") ? "needs_review" : "success";
      const startedAt = new Date(new Date(q.receivedOn + "T09:00:00Z").getTime() + (s - 1) * 36 * 3600_000 + n * 60_000).toISOString();

      out.push({
        id,
        stepId: s,
        agentName: step.agent,
        quotationId: q.id,
        startedAt,
        model: body.model,
        agentVersion: 1,
        specVersion: 1,
        status,
        durationMs,
        tokensIn,
        tokensOut,
        costUsd,
        retries,
        errors: retries + (failed ? 1 : 0),
        humanOutcome: human,
        checks,
        trajectory: trajectory(id, s, n, body.model, tokensIn, tokensOut, durationMs, retries, failed, HUMAN_STEPS.has(s)),
      });
    }
  }
  return out;
}
