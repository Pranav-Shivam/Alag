import { STEPS } from "../data/steps";
import type { Quotation } from "../types";
import { LIBRARY } from "./defaults";
import type {
  ActivityEvent,
  Attachment,
  BomCategory,
  BomLine,
  ClarificationDraft,
  EmailRecord,
  ExtractedField,
  ExtractionResult,
  LibraryItem,
  MarginDecision,
  QuotationCase,
  QuotationDraft,
} from "./types";

/* Deterministic fake data for every quotation. No randomness, so every load looks the same. */

const num = (q: Quotation) => Number(q.id.slice(4)) - 1000; // 1..26

function pickLibrary(q: Quotation): LibraryItem[] {
  const p = q.product.toLowerCase();
  const has = (...w: string[]) => w.some((x) => p.includes(x));
  let main: string;
  if (has("bed sketch", "bed (", "custom wooden bed")) main = "lib-bed";
  else if (has("wardrobe", "closet")) main = "lib-wardrobe";
  else if (has("kitchen", "door", "interior", "villa", "lobby", "staircase")) main = "lib-cabin";
  else if (has("apartment", "bathroom", "vanity", "condos")) main = "lib-farmhouse";
  else if (has("bed")) main = "lib-bed";
  else main = "lib-builtins";
  const items = [LIBRARY.find((l) => l.id === main)!];
  // Every third email carries a second file so the attachment list is not always one item.
  if (num(q) % 3 === 0) {
    const extra = LIBRARY.find((l) => l.id === (main === "lib-wardrobe" ? "lib-builtins" : "lib-wardrobe"))!;
    items.push(extra);
  }
  return items;
}

function toAttachment(l: LibraryItem, origin: Attachment["origin"], at: string): Attachment {
  return {
    id: `att-${l.id}`,
    name: l.file,
    title: l.title,
    kind: l.kind,
    url: `/samples/${l.file}`,
    mime: l.mime,
    sizeBytes: l.sizeBytes,
    pages: l.pages,
    origin,
    license: l.license,
    sourceUrl: l.sourceUrl,
    addedAt: at,
  };
}

const CITY: Record<string, string> = { California: "Sacramento, CA", Texas: "Austin, TX", "New York": "Brooklyn, NY" };

function parseQty(product: string): number {
  const m = product.match(/\(x(\d+)/i) ?? product.match(/\((\d+)\s*(?:rooms|villas|units)/i);
  return m ? Number(m[1]) : 1;
}

function dims(product: string, n: number): [number, number, number] {
  const p = product.toLowerCase();
  if (p.includes("bed")) return [78, 72, 18];
  if (p.includes("wardrobe") || p.includes("closet")) return [84 + (n % 3) * 6, 60, 90];
  if (p.includes("kitchen")) return [144, 96, 36];
  if (p.includes("door")) return [84, 36, 2];
  if (p.includes("tv")) return [60, 16, 20];
  if (p.includes("vanity")) return [36, 22, 34];
  if (p.includes("desk") || p.includes("table")) return [60 + (n % 4) * 6, 30, 30];
  return [72, 24, 40];
}

function email(q: Quotation, atts: Attachment[]): EmailRecord {
  const at = new Date(q.receivedOn + "T09:00:00Z");
  at.setUTCMinutes(at.getUTCMinutes() + num(q) * 7);
  const first = q.customer.split(" ")[0];
  const slug = q.customer.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
  const kind = atts[0]?.kind === "pdf" ? "attached PDF" : atts[0]?.kind === "photo" ? "attached photo" : "attached drawing";
  return {
    from: `${slug}@example.com`,
    fromName: q.customer,
    to: "rfq@alag.example.com",
    subject: `Request for quotation: ${q.product}`,
    receivedAt: at.toISOString(),
    forwardedBy: q.estimator,
    body: `Hello ALAG team,\n\nWe would like a quotation for ${q.product.toLowerCase()} in ${q.material.toLowerCase()}. Please see the ${kind} for the layout and sizes. Delivery and installation are needed in ${CITY[q.region] ?? q.region}.\n\nPlease let us know the price and the earliest delivery date.\n\nThank you,\n${first}`,
    signature: `${q.customer}\n${CITY[q.region] ?? q.region}`,
  };
}

/* ------------------------------ Extraction ------------------------------ */

const BOXES: Record<string, [number, number, number, number]> = {
  product_type: [0.08, 0.06, 0.5, 0.05],
  wood_type: [0.1, 0.14, 0.3, 0.04],
  length_in: [0.16, 0.42, 0.34, 0.05],
  width_in: [0.58, 0.58, 0.26, 0.05],
  height_in: [0.7, 0.28, 0.2, 0.05],
  quantity: [0.08, 0.9, 0.2, 0.04],
  finish: [0.12, 0.2, 0.36, 0.05],
  delivery_location: [0.1, 0.84, 0.46, 0.05],
};

function extraction(q: Quotation, atts: Attachment[]): ExtractionResult {
  const n = num(q);
  const primary = atts[0];
  const reviewed = q.outcome !== "in_progress" || q.currentStep > 3; // a human already approved the RFQ

  // Quote 14: email just arrived, extraction has not run yet.
  if (n === 14) return { status: "not_run", fields: [] };
  // Quote 15: the agent could not read the attachment.
  if (n === 15)
    return {
      status: "failed",
      ranAt: "2026-11-02T10:12:00Z",
      agentVersion: 1,
      model: "claude-sonnet-5-5",
      failureReason: "The attached scan is 96 dpi and skewed. Text and dimension lines could not be read with enough confidence to return any field.",
      fields: [],
    };

  const [L, W, H] = dims(q.product, n);
  const handwritten = primary?.kind === "sketch";
  const raw: { key: string; label: string; value: string | null; unit?: string; base: number; required: boolean; note?: string }[] = [
    { key: "product_type", label: "Product", value: q.product.replace(/\s*\(.*\)/, ""), base: 97, required: true },
    { key: "wood_type", label: "Wood type", value: q.material, base: 94, required: true },
    { key: "length_in", label: "Length", value: String(L), unit: "in", base: handwritten ? 72 : 93, required: true },
    { key: "width_in", label: "Width", value: String(W), unit: "in", base: handwritten ? 68 : 91, required: true },
    { key: "height_in", label: "Height", value: String(H), unit: "in", base: handwritten ? 64 : 90, required: true },
    { key: "quantity", label: "Quantity", value: String(parseQty(q.product)), base: 95, required: true },
    { key: "finish", label: "Finish", value: ["Natural polish", "Matte lacquer", "Walnut stain", "Spray, white"][n % 4], base: 78, required: false },
    { key: "delivery_location", label: "Delivery location", value: CITY[q.region] ?? q.region, base: 88, required: false },
  ];

  const fields: ExtractedField[] = raw.map((r, i) => {
    let confidence: number | null = Math.max(38, Math.min(99, r.base - ((n * 3 + i * 5) % 9)));
    let state: ExtractedField["state"] = confidence >= 85 ? "verified" : "needs_review";
    let value = r.value;
    let note = confidence < 85 ? (handwritten ? "Handwritten figure. Could be read two ways." : "Value is partly hidden or low contrast.") : undefined;
    let aiValue: string | null | undefined;

    // Quote 13: customer never gave the wardrobe height.
    if (n === 13 && r.key === "height_in") {
      value = null;
      confidence = null;
      state = "missing";
      note = "Not shown on the drawing and not in the email.";
    }
    // Quote 16: very unclear handwriting.
    if (n === 16 && ["length_in", "width_in", "height_in"].includes(r.key)) {
      confidence = 48 + i * 4;
      state = "needs_review";
      note = "Handwriting is unclear. The digit could be 1 or 7.";
    }
    // Already approved quotes: a human confirmed everything the AI was unsure about.
    if (reviewed && state === "needs_review") {
      aiValue = value;
      state = "edited";
      note = "Confirmed by estimator.";
    }
    const source = value === null ? undefined : { attachmentId: primary.id, page: 1, box: BOXES[r.key] };
    return { key: r.key, label: r.label, value, unit: r.unit, confidence, state, required: r.required, source, note, aiValue };
  });

  return { status: "done", ranAt: new Date(new Date(q.receivedOn + "T09:30:00Z").getTime() + n * 3600_000).toISOString(), agentVersion: 1, model: "claude-sonnet-5-5", fields };
}

/* ------------------------------ Cost lines ------------------------------ */

const WOOD_PRICE: Record<string, number> = { Teak: 78, Cedar: 54, Oak: 46 };

function bom(q: Quotation): BomLine[] {
  const n = num(q);
  const cost = q.value > 0 ? Math.round(q.value * (1 - q.marginPct / 100)) : 14000 + n * 450;
  const woodP = WOOD_PRICE[q.material] ?? 50;
  const mk = (category: BomCategory, item: string, unit: string, share: number, price: number, source: BomLine["source"] = "price_book"): BomLine => ({
    id: `bom-${n}-${item.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    category,
    item,
    unit,
    calcQty: Math.round(((cost * share) / price) * 100) / 100,
    calcUnitPrice: price,
    source,
  });
  const lines: BomLine[] = [
    mk("wood", `${q.material} timber`, "cu ft", 0.36, woodP, "supplier"),
    mk("wood", "Plywood backing 18 mm", "sheet", 0.04, 62),
    mk("labour", "Carpenter and assembly", "hour", 0.2, 42),
    mk("manufacturing", "Machine and shop time", "hour", 0.12, 65),
    mk("finishing", "Paint and polish", "litre", 0.05, 28),
    mk("finishing", "Spray finishing", "sq ft", 0.03, 3.2),
    mk("hardware", "Screws, hinges, runners", "lot", 0.04, 95),
    mk("hardware", "Glue and adhesives", "kg", 0.01, 18),
    mk("logistics", "Transport", "trip", 0.05, 180),
    mk("installation", "On-site installation", "hour", 0.1, 55),
  ];
  // One real-looking override so the audit trail is visible in the demo.
  if (n === 17) {
    const w = lines[0];
    w.override = { qty: w.calcQty, unitPrice: Math.round(w.calcUnitPrice * 1.08 * 100) / 100, reason: "Supplier quote received 2 Nov is 8 percent above the price book", by: "Ricky", at: "2026-11-02T14:05:00Z" };
  }
  return lines;
}

function margin(q: Quotation): MarginDecision {
  const n = num(q);
  const chosen = q.marginPct || 21;
  const rec = chosen + (n % 4 === 1 ? 2 : 0);
  return {
    recommendedPct: rec,
    modelConfidence: 62 + ((n * 7) % 33),
    chosenPct: chosen,
    reason: rec !== chosen ? "Repeat customer. Agreed 2 points below the model to keep the order." : undefined,
    approvedBy: q.outcome === "in_progress" && q.currentStep <= 5 ? undefined : q.estimator,
  };
}

function quotationDraft(q: Quotation): QuotationDraft {
  const sent = q.outcome !== "in_progress" || q.currentStep > 6 || (q.currentStep === 6 && !q.blocked && num(q) % 2 === 0);
  return {
    subject: `Quotation ${q.id} for ${q.product}`,
    body: `Dear ${q.customer.split(" ")[0]},\n\nThank you for your enquiry. Please find our quotation ${q.id} for ${q.product.toLowerCase()} in ${q.material.toLowerCase()}, including delivery and installation.\n\nThe price is valid for 30 days. We are happy to walk you through the design and finish options.\n\nKind regards,\n${q.estimator}\nALAG`,
    validityDays: 30,
    paymentTerms: "40% advance, 30% on manufacturing completion, 30% on delivery",
    status: sent ? "sent" : "draft",
    decision:
      q.outcome === "awarded"
        ? { result: "awarded", at: new Date(new Date(q.receivedOn).getTime() + 12 * 86400_000).toISOString() }
        : q.outcome === "rejected"
          ? { result: "rejected", reason: q.rejectReason, at: new Date(new Date(q.receivedOn).getTime() + 12 * 86400_000).toISOString() }
          : undefined,
  };
}

/* ------------------------------ Activity ------------------------------ */

const DONE_TEXT: Record<number, [ActivityEvent["actor"], string]> = {
  1: ["AI", "Classified email as RFQ, stored original and attachments, created RFQ record"],
  2: ["AI", "Extracted specification fields from the attachment and scored confidence"],
  3: ["Human", "Reviewed extracted fields and approved the RFQ for estimation"],
  4: ["Human", "Approved design and bill of materials. Cost engine produced the estimate"],
  5: ["AI", "Margin model recommended a target margin and explained it"],
  6: ["Human", "Sent the quotation and recorded the customer decision"],
  7: ["System", "Converted the accepted quotation into a sales order"],
  8: ["Human", "Approved purchase requests and sent purchase orders"],
  9: ["System", "Received material and reserved stock for the order"],
  10: ["Human", "Quality team approved the finished product"],
  11: ["System", "Delivery confirmed and installation signed off"],
  12: ["System", "Payment webhook verified and invoice reconciled"],
  13: ["Human", "No open service cases"],
  14: ["System", "Order closed and added to analytics"],
};

function activity(q: Quotation): ActivityEvent[] {
  const last = q.outcome === "rejected" ? 6 : q.currentStep === 14 && q.outcome === "awarded" ? 14 : q.currentStep - 1;
  const out: ActivityEvent[] = [];
  const base = new Date(q.receivedOn + "T09:00:00Z").getTime();
  for (let s = 1; s <= last; s++) {
    const [actor, text] = DONE_TEXT[s];
    const step = STEPS[s - 1];
    out.push({
      id: `act-${q.id}-${s}`,
      at: new Date(base + (s - 1) * 36 * 3600_000).toISOString(),
      stepId: s,
      actor,
      who: actor === "Human" ? q.estimator : step.agent,
      text: s === 6 && q.outcome === "rejected" ? `Customer rejected the quotation: ${q.rejectReason ?? "no reason recorded"}` : text,
    });
  }
  return out;
}

/* ------------------------------ Public ------------------------------ */

function clarification(q: Quotation): ClarificationDraft | null {
  if (num(q) !== 13) return null;
  return {
    to: `${q.customer.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    subject: `Quotation request: one measurement needed for your wardrobe`,
    body: `Hello Prakash,\n\nThank you for your request. To prepare an accurate quotation we need one more detail:\n\n- Wardrobe height (floor to top), for example 90 inches or 7 ft 6 in.\n\nYour drawing shows the width and depth, but not the height. Once we have it we will send the quotation within two working days.\n\nKind regards,\n${q.estimator}\nALAG`,
    status: "draft",
  };
}

export function seedCase(q: Quotation): QuotationCase {
  const at = new Date(q.receivedOn + "T09:00:00Z").toISOString();
  const attachments = pickLibrary(q).map((l) => toAttachment(l, "email", at));
  const priced = q.outcome !== "in_progress" || q.currentStep >= 4;
  const marginKnown = q.outcome !== "in_progress" || q.currentStep >= 5 || q.value > 0;
  return {
    quotationId: q.id,
    email: email(q, attachments),
    attachments,
    extraction: extraction(q, attachments),
    rfqApproved: q.outcome !== "in_progress" || q.currentStep > 3,
    clarification: clarification(q),
    bom: priced ? bom(q) : [],
    margin: marginKnown ? margin(q) : null,
    quotationDraft: q.outcome !== "in_progress" || q.currentStep >= 6 ? quotationDraft(q) : null,
    activity: activity(q),
  };
}
