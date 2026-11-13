import { Check, Circle, Clock, Minus, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "../ui";
import { bomTotals, fieldNeedsHuman } from "../../studio/calc";
import type { QuotationCase } from "../../studio/types";
import type { StepStatus, Tech } from "../../types";

/** Tabs of the step inspector. Also the detail of the "alag:open-tab" window event. */
export type InspectorTab = "overview" | "case" | "agent" | "rules" | "activity";

export const INSPECTOR_TABS: readonly InspectorTab[] = ["overview", "case", "agent", "rules", "activity"];

/** Icon per step status. Status is always shown as icon plus word, never color alone. */
export const STATUS_ICON: Record<StepStatus, LucideIcon> = {
  done: Check,
  current: Clock,
  blocked: TriangleAlert,
  rejected: X,
  pending: Circle,
  skipped: Minus,
};

export const STATUS_TONE: Record<StepStatus, Tone> = {
  done: "ok",
  current: "warn",
  blocked: "alert",
  rejected: "danger",
  pending: "neutral",
  skipped: "neutral",
};

/** Filled circle used for the status marker in the rail. Written out so Tailwind can see the names. */
export const STATUS_MARKER: Record<StepStatus, string> = {
  done: "border-ok-solid bg-ok-solid text-on-accent",
  current: "border-warn-solid bg-warn-solid text-on-accent",
  blocked: "border-alert-solid bg-alert-solid text-on-accent",
  rejected: "border-danger-solid bg-danger-solid text-on-accent",
  pending: "border-line-strong bg-surface text-muted",
  skipped: "border-dashed border-line-strong bg-surface text-muted",
};

export const TECH_TONE: Record<Tech, Tone> = {
  AI: "violet",
  ML: "info",
  Rules: "neutral",
  Human: "warn",
  Integration: "teal",
};

export interface Attention {
  id: string;
  tone: Tone;
  label: string;
  /** Longer sentence for tooltips and the overview. */
  detail: string;
}

export type ReviewIssue = { kind: "failed" | "not_run" | "review"; count: number; reason?: string };

/** What is wrong with the extraction, if anything. Drives badges on steps 2 and 3 and the overview card. */
export function reviewIssue(c: QuotationCase | undefined): ReviewIssue | null {
  if (!c) return null;
  const ex = c.extraction;
  if (ex.status === "failed") return { kind: "failed", count: 0, reason: ex.failureReason };
  if (ex.status === "not_run") return { kind: "not_run", count: 0 };
  const count = ex.fields.filter(fieldNeedsHuman).length;
  return count > 0 ? { kind: "review", count } : null;
}

/** Badges that tell the user a step needs something from them. Steps that have not started show none. */
export function getAttention(c: QuotationCase | undefined, stepId: number, status: StepStatus): Attention[] {
  if (!c || status === "pending" || status === "skipped") return [];
  const out: Attention[] = [];

  if (stepId === 2) {
    const issue = reviewIssue(c);
    if (issue?.kind === "failed") {
      out.push({ id: "extraction-failed", tone: "danger", label: "Extraction failed", detail: issue.reason ?? "The agent could not read the documents." });
    } else if (issue?.kind === "not_run") {
      out.push({ id: "extraction-not-run", tone: "warn", label: "Not run", detail: "Extraction has not been run for this quotation yet." });
    } else if (issue) {
      const missingRequired = c.extraction.fields.some((f) => f.state === "missing" && f.required);
      out.push({
        id: "fields-review",
        tone: missingRequired ? "danger" : "warn",
        label: `${issue.count} to review`,
        detail: `${issue.count} ${issue.count === 1 ? "field needs" : "fields need"} a human check.`,
      });
    }
  }

  if (stepId === 3 && c.clarification) {
    out.push(
      c.clarification.status === "sent"
        ? { id: "clarification-sent", tone: "info", label: "Clarification sent", detail: `Email sent to ${c.clarification.to}.` }
        : { id: "clarification-draft", tone: "warn", label: "Clarification draft", detail: "A clarification email is drafted and not sent yet." },
    );
  }

  if (stepId === 4 && c.bom.length > 0) {
    if (!c.lanes.manufacturing) {
      out.push({ id: "lane-mfg", tone: "warn", label: "Manufacturing input open", detail: "Manufacturing confirms routing and hours first. Procurement starts after that." });
    } else if (!c.lanes.procurement) {
      out.push({ id: "lane-proc", tone: "warn", label: "Procurement input open", detail: "Manufacturing is confirmed. Procurement still has to price materials and bought-in parts." });
    }
  }

  if (stepId === 4) {
    const { overrides } = bomTotals(c.bom);
    if (overrides > 0) {
      out.push({ id: "overrides", tone: "info", label: `${overrides} ${overrides === 1 ? "override" : "overrides"}`, detail: "Cost lines differ from the price book." });
    }
  }

  if (stepId === 5 && c.margin && c.margin.chosenPct !== c.margin.recommendedPct) {
    out.push({
      id: "margin-override",
      tone: "warn",
      label: "Margin override",
      detail: `Chosen ${c.margin.chosenPct}% differs from the recommended ${c.margin.recommendedPct}%.`,
    });
  }

  return out;
}

export function formatAbs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Short relative hint such as "5 min ago". Empty when the time is in the future. */
export function relativeHint(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}
