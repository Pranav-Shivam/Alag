import type { Outcome, Quotation } from "../types";

// Fake data for the POC. Deterministic, no randomness, so the screen is the same on every load.

type Row = {
  customer: string;
  product: string;
  material: string;
  region: string;
  value: number;
  marginPct: number;
  estimator: string;
  receivedOn: string;
  outcome: Outcome;
  currentStep: number;
  blocked?: string; // reason, when waiting on someone
  reject?: string; // reason, when lost
};

const rows: Row[] = [
  // ---- Awarded: already an order, moving through steps 7..14 ----
  { customer: "Harper Residences", product: "Custom wooden bed (King)", material: "Teak", region: "California", value: 12820, marginPct: 22, estimator: "Tony", receivedOn: "2026-06-03", outcome: "awarded", currentStep: 14 },
  { customer: "Maple & Pine Hotels", product: "Bedroom interior (12 rooms)", material: "Cedar", region: "Texas", value: 96400, marginPct: 19, estimator: "Ricky", receivedOn: "2026-06-11", outcome: "awarded", currentStep: 12 },
  { customer: "Lena Ortiz", product: "Modular kitchen", material: "Teak", region: "New York", value: 31850, marginPct: 24, estimator: "Ma", receivedOn: "2026-06-19", outcome: "awarded", currentStep: 11 },
  { customer: "Brightwater Homes", product: "Wardrobe (sliding, 3 door)", material: "Cedar", region: "Texas", value: 7480, marginPct: 21, estimator: "Bob", receivedOn: "2026-07-02", outcome: "awarded", currentStep: 10 },
  { customer: "Redwood Studio", product: "TV cabinet (wall mounted)", material: "Teak", region: "California", value: 3260, marginPct: 26, estimator: "Ria", receivedOn: "2026-07-09", outcome: "awarded", currentStep: 10 },
  { customer: "Nadia Rahman", product: "Solid wood entrance door", material: "Teak", region: "New York", value: 4150, marginPct: 23, estimator: "Tony", receivedOn: "2026-07-14", outcome: "awarded", currentStep: 9 },
  { customer: "Summit Offices", product: "Reception desk and shelves", material: "Oak", region: "Texas", value: 18900, marginPct: 18, estimator: "Ricky", receivedOn: "2026-07-22", outcome: "awarded", currentStep: 8 },
  { customer: "Greenfield Villas", product: "Bathroom vanity (x6)", material: "Cedar", region: "California", value: 14220, marginPct: 20, estimator: "Ma", receivedOn: "2026-08-01", outcome: "awarded", currentStep: 8 },
  { customer: "Oliver Grant", product: "Study table and bookshelf", material: "Teak", region: "New York", value: 5940, marginPct: 25, estimator: "Bob", receivedOn: "2026-08-08", outcome: "awarded", currentStep: 7 },
  { customer: "Sunrise Apartments", product: "Wardrobes (x20 units)", material: "Cedar", region: "Texas", value: 58700, marginPct: 17, estimator: "Ria", receivedOn: "2026-08-15", outcome: "awarded", currentStep: 7 },
  { customer: "Ivy Lane Cafe", product: "Counter and seating set", material: "Oak", region: "California", value: 11360, marginPct: 22, estimator: "Tony", receivedOn: "2026-08-21", outcome: "awarded", currentStep: 13 },
  { customer: "Carter Family", product: "Complete bedroom interior", material: "Teak", region: "New York", value: 27500, marginPct: 23, estimator: "Ricky", receivedOn: "2026-05-27", outcome: "awarded", currentStep: 14 },

  // ---- In progress: still before the customer decision, steps 1..6 ----
  { customer: "Prakash Nair", product: "Wardrobe (height missing)", material: "Teak", region: "California", value: 0, marginPct: 0, estimator: "Ma", receivedOn: "2026-10-28", outcome: "in_progress", currentStep: 3, blocked: "Waiting for customer to send wardrobe height" },
  { customer: "Eastside Clinic", product: "Waiting room furniture", material: "Oak", region: "New York", value: 0, marginPct: 0, estimator: "Bob", receivedOn: "2026-11-03", outcome: "in_progress", currentStep: 1 },
  { customer: "Willow Creek School", product: "Library shelving", material: "Cedar", region: "Texas", value: 0, marginPct: 0, estimator: "Ria", receivedOn: "2026-11-02", outcome: "in_progress", currentStep: 2 },
  { customer: "Dana Whitfield", product: "Hand-drawn bed sketch", material: "Teak", region: "California", value: 0, marginPct: 0, estimator: "Tony", receivedOn: "2026-10-30", outcome: "in_progress", currentStep: 2, blocked: "Handwriting unclear, low confidence on 2 dimensions" },
  { customer: "Granite Bay Condos", product: "Kitchen (architect drawings)", material: "Teak", region: "California", value: 0, marginPct: 0, estimator: "Ricky", receivedOn: "2026-10-22", outcome: "in_progress", currentStep: 4 },
  { customer: "Mason & Co", product: "Boardroom table", material: "Oak", region: "New York", value: 9250, marginPct: 21, estimator: "Ma", receivedOn: "2026-10-18", outcome: "in_progress", currentStep: 5 },
  { customer: "Aurora Interiors", product: "Bedroom set (x4)", material: "Cedar", region: "Texas", value: 22600, marginPct: 20, estimator: "Bob", receivedOn: "2026-10-12", outcome: "in_progress", currentStep: 6 },
  { customer: "Felix Moreau", product: "Walk-in closet", material: "Teak", region: "New York", value: 16780, marginPct: 24, estimator: "Ria", receivedOn: "2026-10-09", outcome: "in_progress", currentStep: 6, blocked: "Negotiation: customer asked for 8% discount, needs manager approval" },

  // ---- Rejected: lost at step 6 ----
  { customer: "Hillcrest Builders", product: "Staircase and railings", material: "Oak", region: "Texas", value: 21400, marginPct: 22, estimator: "Tony", receivedOn: "2026-07-05", outcome: "rejected", currentStep: 6, reject: "Pricing too high" },
  { customer: "Zara Malik", product: "Dining table (8 seater)", material: "Teak", region: "California", value: 6890, marginPct: 24, estimator: "Ricky", receivedOn: "2026-07-29", outcome: "rejected", currentStep: 6, reject: "Competitor selected" },
  { customer: "Lakeview Resort", product: "Villa interiors (6 villas)", material: "Cedar", region: "Texas", value: 143000, marginPct: 18, estimator: "Ma", receivedOn: "2026-08-04", outcome: "rejected", currentStep: 6, reject: "Delivery timeline too long" },
  { customer: "Tom Becker", product: "Home office desk", material: "Oak", region: "New York", value: 2780, marginPct: 27, estimator: "Bob", receivedOn: "2026-09-02", outcome: "rejected", currentStep: 6, reject: "Customer cancelled" },
  { customer: "Orchid Hospitality", product: "Lobby seating", material: "Teak", region: "California", value: 33500, marginPct: 21, estimator: "Ria", receivedOn: "2026-09-10", outcome: "rejected", currentStep: 6, reject: "Design not accepted" },
  { customer: "Beacon Street Lofts", product: "Built-in wardrobes", material: "Cedar", region: "New York", value: 19200, marginPct: 20, estimator: "Tony", receivedOn: "2026-09-17", outcome: "rejected", currentStep: 6, reject: "Budget constraints" },
];

export const QUOTATIONS: Quotation[] = rows.map((r, i): Quotation => {
  const n = 1001 + i;
  return {
    id: `QUO-${n}`,
    rfqId: `RFQ-${n}`,
    estId: `EST-${n}`,
    orderId: r.outcome === "awarded" ? `ORD-${n}` : undefined,
    customer: r.customer,
    product: r.product,
    material: r.material,
    region: r.region,
    value: r.value,
    marginPct: r.marginPct,
    estimator: r.estimator,
    receivedOn: r.receivedOn,
    outcome: r.outcome,
    currentStep: r.currentStep,
    blocked: r.blocked !== undefined,
    blockedReason: r.blocked,
    rejectReason: r.reject,
  };
});
