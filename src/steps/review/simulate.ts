import type { Quotation } from "../../types";
import type { Attachment, ExtractedField, ExtractionResult, FieldState, SchemaField } from "../../studio/types";
import { labelFromKey } from "./fieldMeta";

/*
 * SIMULATED document intelligence. No model is called. Values come from the quotation product, material
 * and region, so the same quotation always gives the same result.
 */

const CITY: Record<string, string> = { California: "Sacramento, CA", Texas: "Austin, TX", "New York": "Brooklyn, NY" };
const FINISHES = ["Natural polish", "Matte lacquer", "Walnut stain", "Spray, white"];

/** Where each field sits on a page, normalised 0..1 as [x, y, width, height]. */
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

const DIMENSION_KEYS = ["length_in", "width_in", "height_in"];

function caseNumber(q: Quotation): number {
  const n = Number(q.id.replace(/\D/g, "")) - 1000;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

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

interface Row {
  key: string;
  label: string;
  value: string | null;
  unit?: string;
  required: boolean;
  confidence: number | null;
  /** Forced state. Without it the state follows the confidence (85 and up is verified). */
  state?: FieldState;
  note?: string;
}

function toFields(rows: Row[], attachments: Attachment[]): ExtractedField[] {
  const primary = attachments.find((a) => a.kind !== "pdf") ?? attachments[0];
  return rows.map((r) => {
    const state: FieldState = r.value === null ? "missing" : (r.state ?? ((r.confidence ?? 0) >= 85 ? "verified" : "needs_review"));
    let source: ExtractedField["source"];
    if (primary && r.value !== null) {
      // On a multi page PDF the dimensions sit on page 2, everything else on page 1.
      const page = primary.kind === "pdf" && (primary.pages ?? 1) > 1 && DIMENSION_KEYS.includes(r.key) ? 2 : 1;
      source = { attachmentId: primary.id, page, box: BOXES[r.key] };
    }
    return { key: r.key, label: r.label, value: r.value, unit: r.unit, confidence: r.value === null ? null : r.confidence, state, required: r.required, source, note: r.note };
  });
}

/** Full run: most fields are read well, a few are below 85 percent and one is missing. */
export function simulateExtraction(quotation: Quotation, attachments: Attachment[]): ExtractedField[] {
  const n = caseNumber(quotation);
  const [L, W, H] = dims(quotation.product, n);
  const sketch = attachments.find((a) => a.kind !== "pdf")?.kind === "sketch";
  const missingHeight = n % 2 === 0;
  const feetInches = `${Math.floor(L / 12)} ft ${L % 12} in`;

  const rows: Row[] = [
    { key: "product_type", label: "Product", value: quotation.product.replace(/\s*\(.*\)/, ""), required: true, confidence: 97 },
    { key: "wood_type", label: "Wood type", value: quotation.material, required: true, confidence: 94 },
    {
      key: "length_in",
      label: "Length",
      value: String(L),
      unit: "in",
      required: true,
      confidence: 91,
      state: "needs_review",
      note: `The drawing gives ${feetInches}, converted to ${L} in. Please check the conversion.`,
    },
    {
      key: "width_in",
      label: "Width",
      value: String(W),
      unit: "in",
      required: true,
      confidence: (sketch ? 62 : 74) + (n % 5),
      note: "The last digit has two readings and the drawing does not settle it.",
    },
    missingHeight
      ? { key: "height_in", label: "Height", value: null, unit: "in", required: true, confidence: null, note: "Not shown on the drawing and not in the email text." }
      : { key: "height_in", label: "Height", value: String(H), unit: "in", required: true, confidence: 90 },
    missingHeight
      ? { key: "quantity", label: "Quantity", value: String(parseQty(quotation.product)), required: true, confidence: 95 }
      : { key: "quantity", label: "Quantity", value: null, required: true, confidence: null, note: "The email and the drawing do not say how many units are needed." },
    { key: "finish", label: "Finish", value: FINISHES[n % 4], required: false, confidence: 76 + (n % 4), note: "The finish note is partly hidden by a fold in the scan." },
    {
      key: "delivery_location",
      label: "Delivery location",
      value: CITY[quotation.region] ?? quotation.region,
      required: false,
      confidence: 82 - (n % 3),
      note: "The email and the title block could both be the site address.",
    },
  ];
  return toFields(rows, attachments);
}

/** Re-run with a stricter instruction: printed lines only, handwriting is low confidence. Several fields go to a human and two are missing. */
export function simulatePartialExtraction(quotation: Quotation, attachments: Attachment[]): ExtractedField[] {
  const n = caseNumber(quotation);
  const [L, W] = dims(quotation.product, n);
  const rows: Row[] = [
    { key: "product_type", label: "Product", value: quotation.product.replace(/\s*\(.*\)/, ""), required: true, confidence: 91 },
    { key: "wood_type", label: "Wood type", value: quotation.material, required: true, confidence: 88 },
    { key: "length_in", label: "Length", value: String(L), unit: "in", required: true, confidence: 63, note: "The dimension line is faint and part of the figure is cut off by the skew." },
    { key: "width_in", label: "Width", value: String(W), unit: "in", required: true, confidence: 58, note: "The figure could be read two ways because the scan is blurred." },
    { key: "height_in", label: "Height", value: null, unit: "in", required: true, confidence: null, note: "No printed dimension line for height. Handwriting was ignored on this run." },
    { key: "quantity", label: "Quantity", value: String(parseQty(quotation.product)), required: true, confidence: 71, note: "Only a handwritten figure was found, so it was kept at low confidence." },
    { key: "finish", label: "Finish", value: null, required: false, confidence: null, note: "The finish note is handwritten and was skipped on this run." },
    { key: "delivery_location", label: "Delivery location", value: CITY[quotation.region] ?? quotation.region, required: false, confidence: 69, note: "The address is low contrast and may be the billing address." },
  ];
  return toFields(rows, attachments);
}

/** Manual entry: one empty field for every name in the agent schema. The human types the values. */
export function emptyFieldsFromSchema(schema: SchemaField[]): ExtractedField[] {
  return schema.map((s) => {
    const { label, unit } = labelFromKey(s.name);
    return { key: s.name, label, value: null, unit, confidence: null, state: "missing" as const, required: s.required, note: "Not read by the agent. Type the value from the file." };
  });
}

export function buildResult(fields: ExtractedField[], agentVersion: number | undefined, model: string | undefined): ExtractionResult {
  return { status: "done", ranAt: new Date().toISOString(), agentVersion, model, fields };
}

/** How long the fake model "thinks": between 900 and 1400 ms. */
export function simulatedDelay(): number {
  return 900 + Math.round(Math.random() * 500);
}
