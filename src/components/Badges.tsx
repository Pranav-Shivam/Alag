import { Check, Clock, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OUTCOME_LABEL, STEP_STATUS_LABEL, getStepStatuses } from "../lib/status";
import type { Outcome, Quotation, StepStatus } from "../types";

const OUTCOME_STYLE: Record<Outcome, string> = {
  in_progress: "bg-warn-soft text-warn-fg ring-warn-line",
  awarded: "bg-ok-soft text-ok-fg ring-ok-line",
  rejected: "bg-danger-soft text-danger-fg ring-danger-line",
};

const OUTCOME_ICON: Record<Outcome, LucideIcon> = {
  in_progress: Clock,
  awarded: Check,
  rejected: X,
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const Icon = OUTCOME_ICON[outcome];
  return (
    <span
      className={
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset " +
        OUTCOME_STYLE[outcome]
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}

const SEGMENT_STYLE: Record<StepStatus, string> = {
  done: "bg-ok-solid",
  current: "bg-warn-solid",
  blocked: "bg-alert-solid",
  rejected: "bg-danger-solid",
  pending: "bg-line-strong/60",
  skipped: "bg-line-strong/60",
};

/** 14-segment strip, one segment per workflow step. */
export function StepStrip({ quotation }: { quotation: Quotation }) {
  const statuses = getStepStatuses(quotation);
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Progress: step ${quotation.currentStep} of ${statuses.length}`}>
      {statuses.map((s, i) => (
        <span
          key={i}
          title={`Step ${i + 1}: ${STEP_STATUS_LABEL[s]}`}
          className={"h-1.5 min-w-0 flex-1 rounded-full " + SEGMENT_STYLE[s]}
        />
      ))}
    </div>
  );
}

export function NeedsAttention({ reason }: { reason?: string }) {
  return (
    <span
      title={reason}
      className="inline-flex items-center gap-1 rounded-md bg-alert-soft px-1.5 py-0.5 text-xs font-medium text-alert-fg ring-1 ring-inset ring-alert-line"
    >
      <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Needs attention
    </span>
  );
}
