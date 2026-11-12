import { REJECT_STEP, STEPS } from "../data/steps";
import type { Outcome, Quotation, StepStatus } from "../types";

/**
 * Status of each of the 14 steps for one quotation. Index 0 = step 1.
 *
 * in_progress / awarded: steps before currentStep are done, currentStep is current (or blocked),
 *   later steps are pending. Awarded at step 14 means the order is closed, so step 14 is done.
 * rejected: steps before REJECT_STEP are done, REJECT_STEP is rejected, the rest are skipped.
 */
export function getStepStatuses(q: Quotation): StepStatus[] {
  return STEPS.map((s): StepStatus => {
    if (q.outcome === "rejected") {
      if (s.id < REJECT_STEP) return "done";
      if (s.id === REJECT_STEP) return "rejected";
      return "skipped";
    }
    if (q.outcome === "awarded" && q.currentStep === STEPS.length) return "done";
    if (s.id < q.currentStep) return "done";
    if (s.id === q.currentStep) return q.blocked ? "blocked" : "current";
    return "pending";
  });
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  in_progress: "In progress",
  awarded: "Awarded",
  rejected: "Rejected",
};

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  done: "Done",
  current: "In progress",
  blocked: "Needs attention",
  pending: "Pending",
  rejected: "Rejected",
  skipped: "Not reached",
};

/** "Closed" when the order finished step 14, otherwise the name of the step it is on. */
export function currentStepLabel(q: Quotation): string {
  const step = STEPS[q.currentStep - 1];
  if (q.outcome === "rejected") return `Rejected at ${step.name}`;
  if (q.outcome === "awarded" && q.currentStep === STEPS.length) return "Order closed";
  return step.name;
}

export function formatUSD(value: number): string {
  if (!value) return "Not priced yet";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
