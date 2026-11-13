import { estimateTokens, fillTemplate } from "../../studio/calc";
import type { AgentBody, SchemaField } from "../../studio/types";
import { fieldLabel, humanize } from "./logic";

/* Everything here is SIMULATED. No network call is made. Output is deterministic for the same inputs. */

const SAMPLE_INPUTS: Record<string, string> = {
  email_subject: "RFQ: 3-door teak wardrobe for our Austin home",
  email_body:
    "Hi team, we would like a quote for a 3-door wardrobe in teak, about 78 inches wide and 84 inches tall. Natural polish please. Delivery to Austin, Texas. Sketch attached. Thanks, Maya Patel",
  attachment_list: "wardrobe-sketch.jpg (image), room-photo.jpg (image)",
  recent_rfqs: "RFQ-2026-0138 (teak bed, Dallas), RFQ-2026-0141 (oak TV cabinet, Austin)",
  estimator: "Daniel Brooks",
  attachment_name: "wardrobe-sketch.jpg",
  attachment_kind: "sketch",
  page: "1",
  schema: "product_type, wood_type, length_in, width_in, height_in, quantity, finish",
  product_type: "Wardrobe",
  fields_json: '{"product_type":"Wardrobe","wood_type":"teak","width_in":78,"height_in":84,"depth_in":null}',
  required_fields: "product_type, wood_type, length_in, width_in, height_in, quantity",
  customer_name: "Maya Patel",
  design_summary: "3-door wardrobe, teak frame with veneer panels, soft-close hinges, natural polish",
  bom_json: '[{"item":"Teak planks","qty":42,"unit":"board ft"},{"item":"Hinges","qty":6,"unit":"pcs"}]',
  region: "Texas",
  similar_estimates: "EST-2025-0912 wardrobe 76x84, EST-2026-0044 wardrobe 80x84",
  cost: "$12,300",
  recommended_margin: "22%",
  model_confidence: "78%",
  min_margin: "15%",
  tolerance: "5%",
  similar_quotes: "Q-2026-0088 won at 21%, Q-2026-0102 lost at 27%",
  project_name: "Patel residence wardrobe",
  priced_items: "Wardrobe, 3 door, teak: $14,900; Delivery and installation: $1,200",
  total: "$16,100",
  payment_terms: "40% advance, balance on delivery",
  validity_days: "30",
  quotation_id: "Q-2026-0142",
  order_json: '{"items":[{"sku":"WRD-3D-TEAK","qty":1}],"delivery":"2026-12-12"}',
  required: "120 board feet of teak",
  available: "40 board feet",
  incoming: "30 board feet arriving 2026-11-20",
  supplier_quotes: "Supplier A: $9.40 per board ft, 14 days. Supplier B: $9.10 per board ft, 25 days.",
  receipt: "GRN-5521: 60 board feet teak received, 4 rejected for cracks",
  purchase_order: "PO-2026-0317: 70 board feet teak",
  work_order: "WO-2026-0075: 3-door wardrobe, teak",
  drawing_summary: "Frame 78 x 84 x 24 in, three hinged doors, two fixed shelves",
  deadline: "2026-12-10",
  events: "Dispatched 2026-11-28; at hub 2026-11-30; out for delivery 2026-12-02",
  promised_date: "2026-12-02",
  risk_threshold: "30%",
  invoice: "INV-2026-0210, total $16,100, advance paid $6,440",
  schedule: "40% advance on order, 60% on delivery",
  question: "Which region had the lowest margin last quarter?",
  complaint: "A hinge on the left door is loose and the door does not close flush.",
  photos: "hinge-closeup.jpg, door-gap.jpg",
  order_terms: "Order ORD-2026-0061, 24 month warranty on joinery and hardware",
};

/** Realistic sample text for one variable. Falls back to a readable line built from the name and the step. */
export function sampleFor(variable: string, stepName: string): string {
  return SAMPLE_INPUTS[variable] ?? `${humanize(variable)} for ${stepName.toLowerCase()}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const SAMPLE_VALUES: Record<string, string | number | boolean> = {
  product_type: "Wardrobe",
  wood_type: "teak",
  length_in: 78,
  width_in: 24,
  height_in: 84,
  quantity: 1,
  finish: "Natural teak polish",
  delivery_location: "Austin, Texas",
  is_rfq: true,
  customer_name: "Maya Patel",
  ready_for_estimation: false,
  cover_email: "Dear Maya, thank you for your enquiry. Please find our quotation attached.",
};

function sampleValue(f: SchemaField): string | number | boolean {
  if (f.name in SAMPLE_VALUES) return SAMPLE_VALUES[f.name];
  switch (f.type) {
    case "number":
      return 10 + (hash(f.name) % 90);
    case "boolean":
      return true;
    case "enum":
      return "teak";
    case "date":
      return "2026-12-01";
    default:
      return `Sample ${f.name.replace(/_/g, " ")}`;
  }
}

export interface SimCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export interface SimResult {
  prompt: string;
  output: string;
  tokens: number;
  latencyMs: number;
  checks: SimCheck[];
}

const STATUS: Record<AgentBody["autonomy"], string> = {
  suggest: "suggestion_only",
  draft: "awaiting_approval",
  auto: "completed",
};

export function renderPrompt(body: AgentBody, values: Record<string, string>): string {
  const parts = [`SYSTEM\n${body.systemPrompt}`];
  if (body.extractionPrompt !== undefined && body.extractionPrompt.trim()) parts.push(`EXTRACTION RULES\n${body.extractionPrompt}`);
  parts.push(`INSTRUCTION\n${body.instruction}`);
  return fillTemplate(parts.join("\n\n"), values);
}

export function simulate(body: AgentBody, values: Record<string, string>): SimResult {
  const prompt = renderPrompt(body, values);
  const fields = body.schema.filter((f) => f.name.trim());

  const out: Record<string, unknown> = {};
  const needsHuman: string[] = [];
  let nullCount = 0;

  if (fields.length === 0) {
    out.summary = "Reviewed the input and followed the instruction.";
  } else {
    const fieldOut: Record<string, { value: string | number | boolean | null; confidence: number | null }> = {};
    for (const f of fields) {
      const missing = /missing/i.test(f.name);
      const confidence = missing ? null : 62 + (hash(f.name + body.model) % 36);
      fieldOut[f.name] = { value: missing ? null : sampleValue(f), confidence };
      if (missing) nullCount++;
      const limit = f.threshold ?? body.confidenceThreshold;
      if (confidence === null ? f.required : confidence < limit) needsHuman.push(f.name);
    }
    out.fields = fieldOut;
  }
  out.needs_human = needsHuman;
  out.status = STATUS[body.autonomy];
  const output = JSON.stringify(out, null, 2);

  const tokens = estimateTokens(prompt + output);
  const base = body.model.includes("haiku") ? 420 : body.model.includes("sonnet") ? 900 : body.model.includes("opus") ? 1400 : 1700;
  const latencyMs = base + (tokens % 300);

  const guards = body.guardrails.map((g) => g.text.toLowerCase());
  const has = (re: RegExp) => guards.some((g) => re.test(g));
  const blank = Object.entries(values).filter(([k, v]) => body.variables.includes(k) && !v.trim()).map(([k]) => k);

  const checks: SimCheck[] = [];
  checks.push(
    fields.length === 0
      ? { label: "Followed the instruction", pass: true, detail: "This agent returns a summary, so there is no schema to match." }
      : { label: "Returned every schema field", pass: new Set(fields.map((f) => f.name)).size === fields.length, detail: `${fields.length} fields in the output, same names as the schema.` },
  );

  const noInvent = has(/invent|assume|guess|never.*(price|value)/);
  if (blank.length > 0 && !noInvent) {
    checks.push({ label: "Did not invent a missing value", pass: false, detail: `Input ${blank.map(humanize).join(", ").toLowerCase()} was empty and no guardrail stops the agent from filling it in.` });
  } else {
    checks.push({ label: "Did not invent a missing value", pass: true, detail: nullCount > 0 ? `${nullCount} missing ${nullCount === 1 ? "field was" : "fields were"} left as null.` : "Every value came from the input." });
  }

  checks.push({
    label: "Sent low-confidence fields to a human",
    pass: true,
    detail: needsHuman.length ? `${needsHuman.length} below the threshold: ${needsHuman.map(fieldLabel).join(", ")}.` : "No field fell below its threshold.",
  });

  const risky = body.tools.filter((t) => t.enabled && /send|create|purchase|payment|refund/i.test(t.name));
  const heldBack = body.autonomy !== "auto" || risky.length === 0;
  checks.push({
    label: "Stayed within its autonomy level",
    pass: heldBack,
    detail: heldBack
      ? `Autonomy is "${body.autonomy}", so a person stays in the loop.`
      : `Autonomy is Auto while ${risky.map((t) => t.name).join(", ")} is enabled. The agent could act without review.`,
  });

  const audited = has(/audit|log/);
  checks.push({
    label: "Logged tool calls to the audit trail",
    pass: audited,
    detail: audited ? "An audit guardrail is in place." : "No guardrail asks for an audit trail.",
  });

  return { prompt, output, tokens, latencyMs, checks };
}
