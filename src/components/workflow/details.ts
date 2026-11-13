import { formatDate, formatUSD } from "../../lib/status";
import type { Quotation, StepStatus } from "../../types";

export interface DetailRow {
  label: string;
  value: string;
}

/** Number part of the quotation id, used as a deterministic seed for fake values. */
function seed(q: Quotation): number {
  const n = parseInt(q.id.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 1;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "customer";
}

function pick<T>(list: T[], n: number): T {
  return list[n % list.length];
}

const SUPPLIERS = [
  ["Cascade Supply Co", "Northern Materials", "Pacific Components"],
  ["Lone Star Supply", "Heritage Imports", "Bayou Industrial"],
  ["Empire Traders", "Hudson Supply Group", "GreenGrain Supply"],
  ["Summit Supply Yard", "Redline Hardware", "Oakridge Industrial"],
];
const CARRIERS = ["Pioneer Freight", "BlueLine Logistics", "Summit Haulers", "Coastal Movers"];
const STAGES = ["Cutting", "Forming", "Assembly", "Finishing", "Quality inspection"];

function cost(q: Quotation): number {
  return q.value * (1 - q.marginPct / 100);
}

function pct(n: number): string {
  return `${n.toFixed(1).replace(/\.0$/, "")}%`;
}

/** Shown (as a muted en dash plus this text) for values that have not been priced yet. */
export const PENDING_TEXT = "Estimate pending";

function money(n: number): string {
  return n > 0 ? formatUSD(n) : PENDING_TEXT;
}

/**
 * Fake, deterministic detail rows for one step of one quotation.
 * Rows only make sense for steps that were started. Use getStepDetailRows for the status aware version.
 */
export function getStepDetails(q: Quotation, stepId: number): DetailRow[] {
  const n = seed(q);
  const priced = q.value > 0;
  const price = money(q.value);
  const suppliers = pick(SUPPLIERS, n);

  switch (stepId) {
    case 1:
      return [
        { label: "Email subject", value: `RFQ: ${q.product} for ${q.customer}` },
        { label: "From", value: `buyer@${slug(q.customer)}.example` },
        { label: "Received on", value: formatDate(q.receivedOn) },
        { label: "Attachments", value: `${1 + (n % 4)} files (PDF, sketch, photo)` },
        { label: "Lead source", value: pick(["Shared mailbox", "Web form", "Partner referral", "Customer portal"], n) },
        { label: "Duplicate check", value: "No duplicate found" },
      ];
    case 2: {
      const lowConf = q.blockedReason && q.currentStep === 2 ? 2 : n % 3;
      return [
        { label: "Fields extracted", value: `${9 + (n % 4)} of 12` },
        { label: "Average confidence", value: `${84 + (n % 13)}%` },
        { label: "Material", value: `${q.material} (${90 + (n % 9)}% confidence)` },
        { label: "Low confidence fields", value: lowConf === 0 ? "None" : `${lowConf} flagged for review` },
      ];
    }
    case 3: {
      const missing = q.blockedReason && q.currentStep === 3 ? q.blockedReason : "None";
      return [
        { label: "Missing information", value: missing },
        { label: "Clarification email", value: missing === "None" ? "Not needed" : "Drafted by AI, waiting for customer" },
        { label: "Lead score", value: `${60 + (n % 36)} of 100` },
        { label: "Reviewed by", value: q.estimator },
        { label: "Approved on", value: formatDate(addDays(q.receivedOn, 2)) },
      ];
    }
    case 4:
      return [
        { label: "Manufacturing input", value: q.outcome !== "in_progress" || q.currentStep > 4 ? "Confirmed" : "Confirmed, routing and hours set" },
        { label: "Procurement input", value: q.outcome !== "in_progress" || q.currentStep > 4 ? "Confirmed" : "In progress, waiting on supplier quotes" },
        { label: "BOM lines", value: `${14 + (n % 21)} items` },
        { label: "Main material", value: q.material },
        { label: "Total cost", value: priced ? money(cost(q)) : "Calculation in progress" },
        { label: "Price book", value: `PB-2026-Q${1 + (n % 4)}` },
        { label: "Design reviewed by", value: q.estimator },
      ];
    case 5: {
      const suggested = Math.max(0, q.marginPct + ((n % 3) - 1));
      return [
        { label: "Margin", value: q.marginPct > 0 ? pct(q.marginPct) : PENDING_TEXT },
        { label: "Selling price", value: price },
        { label: "ML suggested margin", value: priced ? pct(suggested) : "Waiting for cost" },
        { label: "Minimum margin rule (15%)", value: priced ? (q.marginPct >= 15 ? "Passed" : "Needs manager approval") : "Not checked yet" },
      ];
    }
    case 6: {
      const sent = formatDate(addDays(q.receivedOn, 6 + (n % 5)));
      let result = "Awaiting customer decision";
      if (q.outcome === "rejected") result = `Rejected: ${q.rejectReason ?? "no reason recorded"}`;
      else if (q.outcome === "awarded" || q.currentStep > 6) result = "Awarded";
      else if (q.blockedReason && q.currentStep === 6) result = `Negotiation: ${q.blockedReason}`;
      return [
        { label: "Sent on", value: sent },
        { label: "Version", value: `v${1 + (n % 3)}, valid for 30 days` },
        { label: "Quoted value", value: price },
        { label: "Result", value: result },
      ];
    }
    case 7:
      return [
        { label: "Order", value: q.orderId ?? "Not created" },
        { label: "Baseline", value: `Frozen from quotation v${1 + (n % 3)}` },
        { label: "Order value", value: price },
        { label: "Linked records", value: [q.rfqId, q.id, q.estId, q.orderId].filter(Boolean).join(" / ") },
      ];
    case 8:
      return [
        { label: "Suppliers compared", value: suppliers.join(", ") },
        { label: "Selected", value: suppliers[n % suppliers.length] },
        { label: "Purchase orders", value: `${2 + (n % 3)} approved` },
        { label: "Lead time", value: `${7 + (n % 12)} days` },
      ];
    case 9:
      return [
        { label: "Goods received", value: q.currentStep > 9 ? "100%" : `${60 + (n % 4) * 10}%` },
        { label: "Inspection", value: "Passed" },
        { label: "Stock reserved", value: `${40 + (n % 60)} units of ${q.material}` },
        { label: "Warehouse", value: `${q.region} main warehouse` },
      ];
    case 10:
      return [
        { label: "Work order", value: `WO-${n}` },
        { label: "Current stage", value: q.currentStep > 10 ? "Quality approved" : pick(STAGES, n) },
        { label: "Rework items", value: n % 4 === 0 ? "1 item reworked" : "None" },
        { label: "Quality inspector", value: pick(["Dan", "Priya", "Marcus", "Elena"], n) },
      ];
    case 11:
      return [
        { label: "Shipment", value: `SHP-${n}` },
        { label: "Carrier", value: pick(CARRIERS, n) },
        { label: "ETA", value: formatDate(addDays(q.receivedOn, 70 + (n % 14))) },
        { label: "Delay risk (ML)", value: pick(["Low", "Low", "Medium"], n) },
        { label: "Installation", value: q.currentStep > 11 ? "Signed off by customer" : "Scheduled" },
      ];
    case 12: {
      const paidPct = q.currentStep > 12 || (q.outcome === "awarded" && q.currentStep === 14) ? 100 : 70;
      return [
        { label: "Payment schedule", value: "40% advance / 30% milestone / 30% on delivery" },
        { label: "Advance (40%)", value: money(q.value * 0.4) },
        { label: "Milestone (30%)", value: money(q.value * 0.3) },
        { label: "Final (30%)", value: money(q.value * 0.3) },
        { label: "Paid so far", value: `${paidPct}%, gateway webhook verified` },
      ];
    }
    case 13:
      return [
        { label: "Service cases", value: n % 3 === 0 ? "1 open (minor scratch)" : "None" },
        { label: "Returns", value: "0" },
        { label: "Warranty", value: "24 months" },
        { label: "Support owner", value: pick(["Alicia", "Jordan", "Sam"], n) },
      ];
    case 14: {
      const actual = q.marginPct + ((n % 5) - 2) * 0.4;
      return [
        { label: "Target margin", value: q.marginPct > 0 ? pct(q.marginPct) : PENDING_TEXT },
        { label: "Actual margin", value: q.marginPct > 0 ? pct(actual) : PENDING_TEXT },
        { label: "Delivery delay", value: `${n % 4} days` },
        { label: "Order status", value: "Closed and added to dashboards" },
      ];
    }
    default:
      return [];
  }
}

/** Status aware version: steps that were never started show a plain note instead of rows. */
export function getStepDetailRows(q: Quotation, stepId: number, status: StepStatus): { rows: DetailRow[]; note?: string } {
  if (status === "pending") return { rows: [], note: "Not started" };
  if (status === "skipped") return { rows: [], note: "Not reached because quotation was rejected" };
  return { rows: getStepDetails(q, stepId) };
}
