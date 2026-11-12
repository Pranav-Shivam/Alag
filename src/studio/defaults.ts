import { STEPS } from "../data/steps";
import type { AgentBody, Guardrail, LibraryItem, PricingRules, SchemaField, ToolPermission } from "./types";

export const MODELS = ["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];

/* ------------------------------ Sample file library ------------------------------ */
// All five files are in /public/samples and come from Wikimedia Commons. See manifest.json.

export const LIBRARY: LibraryItem[] = [
  {
    id: "lib-bed",
    file: "bed-sketch.jpg",
    title: "Design for a Bed, ca. 1800 (elevation drawing)",
    kind: "sketch",
    mime: "image/jpeg",
    sizeBytes: 514604,
    widthPx: 1280,
    heightPx: 1687,
    license: "Public domain",
    author: "Unknown artist, Cooper Hewitt",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Drawing,_Design_for_a_Bed,_ca._1800_(CH_18109709).jpg",
    keywords: ["bed", "sketch", "hand drawn", "drawing", "elevation", "headboard", "bedroom"],
  },
  {
    id: "lib-cabin",
    file: "cabin-plan.png",
    title: "Cabin floor plan with elevations and door and window details",
    kind: "drawing",
    mime: "image/png",
    sizeBytes: 163317,
    widthPx: 1280,
    heightPx: 853,
    license: "Public domain",
    author: "Historic American Buildings Survey, Library of Congress",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:First_floor_plan,_north_elevation,_east_elevation,_building_section,_door_details,_window_details,_crown_molding_and_location_map_-_Cedar_Pass_Lodge,_Cabin_9,_20681_South_HABS_SD-25-H_(sheet_1_of_1).png",
    keywords: ["plan", "floor plan", "architectural", "construction", "kitchen", "door", "window", "elevation", "layout", "interior"],
  },
  {
    id: "lib-wardrobe",
    file: "wardrobe-photo.jpg",
    title: "Oak wardrobe in Louis XV style (photograph)",
    kind: "photo",
    mime: "image/jpeg",
    sizeBytes: 704971,
    widthPx: 1024,
    heightPx: 1559,
    license: "CC BY-SA 4.0",
    author: "Kleon3",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Li%C3%A8ge,_Grand_Curtius,_garde-robe_en_ch%C3%AAne,_style_Louis_XV.JPG",
    keywords: ["wardrobe", "closet", "cupboard", "oak", "photo", "reference", "cabinet", "armoire"],
  },
  {
    id: "lib-builtins",
    file: "woodworking-plan.pdf",
    title: "Built-ins Useful All Over the House (USDA, 1936)",
    kind: "pdf",
    mime: "application/pdf",
    sizeBytes: 184948,
    pages: 4,
    license: "Public domain",
    author: "United States Department of Agriculture",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Built-ins_useful_all_over_the_house_(IA_builtinsusefulal1936unit).pdf",
    keywords: ["built-in", "builtin", "shelving", "shelf", "bookshelf", "cabinet", "storage", "pdf", "specification", "woodworking", "plans", "desk", "table"],
  },
  {
    id: "lib-farmhouse",
    file: "farmhouse-plan.pdf",
    title: "3-bedroom farmhouse with 2 full baths (USDA plan 7136)",
    kind: "pdf",
    mime: "application/pdf",
    sizeBytes: 362608,
    pages: 4,
    license: "Public domain",
    author: "United States Agricultural Research Service",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:3-bedroom_farmhouse_with_2_full_baths_(IA_3bedroomfarmhous812unit).pdf",
    keywords: ["house", "farmhouse", "bedroom", "bath", "bathroom", "vanity", "floor plan", "architectural", "apartment", "pdf", "layout"],
  },
];

/* ------------------------------ Default agent configurations ------------------------------ */

const t = (id: string, name: string, description: string, enabled = true, locked = false): ToolPermission => ({ id, name, description, enabled, locked });
const g = (id: string, text: string, locked = true): Guardrail => ({ id, text, locked });
const f = (name: string, type: SchemaField["type"], required: boolean, description: string, threshold?: number): SchemaField => ({
  id: `f-${name}`,
  name,
  type,
  required,
  description,
  threshold,
});

const COMMON_GUARDRAILS: Guardrail[] = [
  g("g-audit", "Log every tool call, input and output to the audit trail.", true),
  g("g-nopii", "Never put customer personal data in prompts sent to external services.", true),
];

const EXTRACTION_SCHEMA: SchemaField[] = [
  f("product_type", "string", true, "What the customer wants made: bed, wardrobe, kitchen, door, TV cabinet, vanity, full bedroom interior.", 80),
  f("wood_type", "enum", true, "Wood species named by the customer: teak (sagwan), cedar, oak, other. Use null if not stated.", 85),
  f("length_in", "number", true, "Overall length in inches. Convert from feet or cm. Never guess a missing number.", 90),
  f("width_in", "number", true, "Overall width in inches.", 90),
  f("height_in", "number", true, "Overall height in inches.", 90),
  f("quantity", "number", true, "Number of identical units. Default to null, not 1, when not stated.", 85),
  f("finish", "string", false, "Polish, paint, or spray finish and colour as written or drawn.", 70),
  f("delivery_location", "string", false, "City or site address for delivery and installation.", 70),
];

interface Seed {
  system: string;
  instruction: string;
  extraction?: string;
  schema?: SchemaField[];
  guardrails?: Guardrail[];
  tools?: ToolPermission[];
  autonomy?: AgentBody["autonomy"];
  threshold?: number;
  variables?: string[];
  model?: string;
  temperature?: number;
}

const SEEDS: Record<number, Seed> = {
  1: {
    system:
      "You are the RFQ Agent for ALAG, a custom wooden furniture and interiors manufacturer. You read emails forwarded by estimators and decide if they are customer requests for quotation (RFQs). You classify, summarise and organise. You never reply to customers.",
    instruction:
      "Email subject: {{email_subject}}\nEmail body:\n{{email_body}}\nAttachments: {{attachment_list}}\n\n1. Say whether this is an RFQ, a follow-up to an existing RFQ, or not an RFQ.\n2. Classify every attachment: sketch, construction drawing, specification PDF, photo, other.\n3. List what the customer asked for in one sentence per product.\n4. Flag if this looks like a duplicate of {{recent_rfqs}}.",
    schema: [
      f("is_rfq", "boolean", true, "True when the email asks for a price or quotation for made-to-order products."),
      f("customer_name", "string", true, "Customer or company name from the signature or sender."),
      f("duplicate_of", "string", false, "Existing RFQ id if this is a duplicate or follow-up."),
    ],
    tools: [t("t-graph", "outlook.read_message", "Read mail and attachments through Microsoft Graph", true, true), t("t-store", "blob.store_original", "Save the untouched original email and files", true, true)],
    autonomy: "auto",
    threshold: 85,
    variables: ["email_subject", "email_body", "attachment_list", "recent_rfqs", "estimator"],
    model: "claude-haiku-5-5",
    temperature: 0,
  },
  2: {
    system:
      "You are the Document Intelligence Agent for ALAG. You read handwritten sketches, construction drawings, PDFs and photos and extract furniture specifications into JSON. You report only what is visible or written. Missing information stays null.",
    instruction:
      "Attachment: {{attachment_name}} ({{attachment_kind}}, page {{page}})\nEmail context: {{email_body}}\n\nExtract the fields in the schema. For each field return: value, unit, confidence (0 to 100), the page and the box where you read it, and a short note when unsure. If the drawing and the email disagree, return both and set needs_review.",
    extraction:
      "Rules for reading drawings:\n- Dimensions may be in feet and inches (6'6\"), inches, or cm. Convert to inches and keep the original text in the note.\n- Handwriting: if a digit could be read two ways (1 or 7, 5 or 6), lower confidence below 60 and say which.\n- Wood names: sagwan means teak. Mahogany and sheesham map to other.\n- Never infer a missing dimension from the other two or from typical furniture sizes.\n- Return null with a note, not 0, when a value is not shown.",
    schema: EXTRACTION_SCHEMA,
    tools: [t("t-ocr", "azure_di.read", "OCR for printed and handwritten text", true, false), t("t-vision", "vision.describe", "Vision model for sketches and photos", true, false), t("t-rag", "rag.similar_projects", "Retrieve similar past RFQs for reference only", true, false)],
    guardrails: [g("g-nomiss", "Never assume or invent a missing dimension, material or quantity.", true), g("g-orig", "Never modify or overwrite the original customer document.", true), g("g-conf", "Always return a confidence score and the source location for each field.", true)],
    autonomy: "suggest",
    threshold: 85,
    variables: ["attachment_name", "attachment_kind", "page", "email_body", "schema"],
    model: "claude-sonnet-5-5",
    temperature: 0,
  },
  3: {
    system:
      "You are the Requirement Validation Agent for ALAG. You compare extracted specifications against what ALAG needs to quote a product, find missing or conflicting information, and draft polite clarification emails for a human to review and send.",
    instruction:
      "Product: {{product_type}}\nExtracted fields:\n{{fields_json}}\nRequired fields for this product: {{required_fields}}\n\n1. List missing and conflicting fields.\n2. Say if the RFQ is ready for estimation.\n3. If not, draft a short clarification email to {{customer_name}} that asks only for what is missing. Use plain words and give an example of the format we want.",
    schema: [f("ready_for_estimation", "boolean", true, "True only when every required field is verified or edited by a human."), f("missing_fields", "string", false, "Comma separated keys of fields that are missing or conflicting.")],
    tools: [t("t-mail", "outlook.create_draft", "Create a draft email. Sending needs a human.", true, true), t("t-send", "outlook.send", "Send email on behalf of an employee", false, true)],
    guardrails: [g("g-nosend", "Never send an email to a customer. Create a draft only.", true), g("g-noapprove", "Never approve an RFQ for estimation. A human decides.", true)],
    autonomy: "draft",
    threshold: 85,
    variables: ["product_type", "fields_json", "required_fields", "customer_name", "estimator"],
    model: "claude-sonnet-5-5",
    temperature: 0.3,
  },
  4: {
    system:
      "You are the Estimation Assistant Agent for ALAG. The cost engine does all arithmetic using the approved price book. You help the estimator by suggesting missing cost components, finding similar past estimates and explaining the numbers. You never invent a price.",
    instruction:
      "Approved design summary: {{design_summary}}\nBill of materials: {{bom_json}}\nRegion: {{region}}\nSimilar past estimates: {{similar_estimates}}\n\nCheck the BOM for missing components (paint, spray, screws, glue, transport, installation). Point out lines more than 15 percent away from similar past projects. Explain each cost line in one sentence with its source.",
    schema: [f("suggested_components", "string", false, "Components likely missing from the BOM."), f("outlier_lines", "string", false, "BOM line ids that look unusual.")],
    tools: [t("t-pb", "price_book.lookup", "Read the approved price book. Read only.", true, true), t("t-calc", "cost_engine.calculate", "Deterministic cost calculation", true, true), t("t-sim", "rag.similar_estimates", "Past estimates for comparison", true, false)],
    guardrails: [g("g-price", "Never invent a material price. Every price must come from the approved price book.", true), g("g-override", "Never override an approved estimate. Changes need an authorised revision.", true), g("g-explain", "Every cost line needs a source and a one line explanation.", true)],
    autonomy: "suggest",
    threshold: 80,
    variables: ["design_summary", "bom_json", "region", "similar_estimates"],
    model: "claude-sonnet-5-5",
    temperature: 0.2,
  },
  5: {
    system:
      "You are the Margin Intelligence Agent for ALAG. A machine learning model predicts the target margin. You explain the recommendation in plain words for the estimator and point to similar won and lost quotes. You do not set prices.",
    instruction:
      "Estimated cost: {{cost}}\nModel recommended margin: {{recommended_margin}} (confidence {{model_confidence}})\nRules: minimum margin {{min_margin}}, tolerance band {{tolerance}}\nSimilar quotes: {{similar_quotes}}\n\nExplain why this margin fits: product, material, region, customer and project size. Mention win rate of similar quotes. Warn if the margin is below the minimum or outside the tolerance band.",
    schema: [f("explanation", "string", true, "Three sentences at most."), f("risk_flags", "string", false, "Below minimum, outside tolerance, low model confidence, new customer.")],
    tools: [t("t-ml", "ml.margin_model", "Margin prediction endpoint", true, true), t("t-rules", "pricing_rules.read", "Read approved pricing rules", true, true), t("t-sim", "rag.similar_quotes", "Past quotes with outcomes", true, false)],
    guardrails: [g("g-ml", "The ML model recommends. The pricing engine calculates. The agent never computes a selling price.", true), g("g-min", "Never recommend a margin below the minimum margin rule.", true), g("g-low", "Flag every recommendation with model confidence under the threshold.", true)],
    autonomy: "suggest",
    threshold: 75,
    variables: ["cost", "recommended_margin", "model_confidence", "min_margin", "tolerance", "similar_quotes"],
    model: "claude-sonnet-5-5",
    temperature: 0.2,
  },
  6: {
    system:
      "You are the Quotation Agent for ALAG. You turn an approved estimate and price into a professional quotation document and a short cover email. All prices come from the pricing engine. You never change a price or a discount.",
    instruction:
      "Customer: {{customer_name}}\nProject: {{project_name}}\nLine items and prices: {{priced_items}}\nTotal: {{total}}\nPayment terms: {{payment_terms}}\nValid for: {{validity_days}} days\n\nWrite a cover email under 150 words. Summarise scope in plain language. Do not promise anything not in the quotation.",
    schema: [f("cover_email", "string", true, "Email body for the sales person to review."), f("scope_summary", "string", true, "Two sentence scope summary.")],
    tools: [t("t-doc", "quotation.render_pdf", "Render the quotation document", true, true), t("t-mail", "outlook.create_draft", "Draft only", true, true)],
    guardrails: [g("g-price", "All prices and discounts come from the pricing engine. Do not retype or round them.", true), g("g-send", "A human sends the quotation.", true)],
    autonomy: "draft",
    threshold: 85,
    variables: ["customer_name", "project_name", "priced_items", "total", "payment_terms", "validity_days"],
    model: "claude-sonnet-5-5",
    temperature: 0.4,
  },
  7: {
    system: "You are the order workflow assistant. The accepted quotation version is the commercial baseline. You summarise what changed between quotation and order and never edit the baseline.",
    instruction: "Accepted quotation: {{quotation_id}}\nOrder draft: {{order_json}}\nList differences from the accepted version. If there are any, stop and request a controlled revision.",
    autonomy: "suggest",
    variables: ["quotation_id", "order_json"],
    model: "claude-haiku-5-5",
    temperature: 0,
  },
  8: {
    system: "You are the Procurement Agent for ALAG. You compare supplier quotes and prepare purchase requests. You never create a purchase order without approval and you never choose a supplier on price alone.",
    instruction: "Required: {{required}}\nAvailable stock: {{available}}\nEligible incoming: {{incoming}}\nSupplier quotes: {{supplier_quotes}}\n\nCompute the shortfall as max(0, required - available - eligible incoming). Rank suppliers by price, quality, lead time and reliability. Explain with evidence.",
    guardrails: [g("g-po", "Never create or send a purchase order without approval.", true), g("g-inv", "Always check available and eligible in-transit stock first.", true)],
    tools: [t("t-inv", "inventory.read", "Read stock and in-transit quantities", true, true), t("t-po", "purchase_order.create", "Create a purchase order", false, true)],
    autonomy: "draft",
    variables: ["required", "available", "incoming", "supplier_quotes"],
    model: "claude-sonnet-5-5",
    temperature: 0.2,
  },
  9: {
    system: "You are the Inventory Agent. You watch stock, reservations and receipts and explain exceptions. Stock changes happen only through the stock ledger, never through you.",
    instruction: "Receipt: {{receipt}}\nPurchase order: {{purchase_order}}\nCompare quantities, flag rejected material and recommend a reorder quantity.",
    guardrails: [g("g-ledger", "Never change stock directly. Propose a ledger entry for a human or the ledger service.", true)],
    autonomy: "suggest",
    variables: ["receipt", "purchase_order"],
    model: "claude-haiku-5-5",
    temperature: 0,
  },
  10: {
    system: "You are the Manufacturing Agent. You summarise drawings and instructions for the shop floor, spot material shortages and help with scheduling. Quality release belongs to the quality team.",
    instruction: "Work order: {{work_order}}\nDrawing summary: {{drawing_summary}}\nList the production stages, material needs per stage and risks to the deadline {{deadline}}.",
    guardrails: [g("g-qc", "Never mark a product quality-approved. Only the quality team can.", true)],
    autonomy: "suggest",
    variables: ["work_order", "drawing_summary", "deadline"],
    model: "claude-sonnet-5-5",
    temperature: 0.2,
  },
  11: {
    system: "You are the Logistics Agent. You write delivery notifications, summarise exceptions and answer customer delivery questions from shipment events.",
    instruction: "Shipment events: {{events}}\nPromised date: {{promised_date}}\nWrite a short customer update. If delay risk is above {{risk_threshold}}, say so honestly and give the new estimate.",
    autonomy: "draft",
    variables: ["events", "promised_date", "risk_threshold"],
    model: "claude-haiku-5-5",
    temperature: 0.3,
  },
  12: {
    system: "You are the Finance Assistant Agent. You answer payment questions and explain invoices. The finance engine applies discounts and records payments. You never move money.",
    instruction: "Invoice: {{invoice}}\nPayment schedule: {{schedule}}\nCustomer question: {{question}}\nAnswer only from the data above.",
    guardrails: [g("g-money", "Never trigger, promise or approve a payment, refund or discount.", true)],
    autonomy: "suggest",
    variables: ["invoice", "schedule", "question"],
    model: "claude-haiku-5-5",
    temperature: 0.1,
  },
  13: {
    system: "You are the After-sales Agent. You classify complaints, assess photos of damage and recommend repair, replacement, rework or refund. A human approves every resolution.",
    instruction: "Complaint: {{complaint}}\nPhotos: {{photos}}\nOriginal order and warranty: {{order_terms}}\nClassify the issue, assess damage and recommend a resolution with the policy clause that supports it.",
    guardrails: [g("g-refund", "Never approve a refund or cancellation. Recommend only.", true)],
    autonomy: "suggest",
    variables: ["complaint", "photos", "order_terms"],
    model: "claude-sonnet-5-5",
    temperature: 0.2,
  },
  14: {
    system: "You are the Analytics Agent. You answer management questions using SQL on the reporting database and explain results in plain words. You never edit data.",
    instruction: "Question: {{question}}\nSchema: {{schema}}\nWrite one read-only SQL query, run it, and summarise the answer with the main driver.",
    guardrails: [g("g-ro", "Read-only access. No INSERT, UPDATE or DELETE.", true)],
    autonomy: "auto",
    variables: ["question", "schema"],
    model: "claude-haiku-5-5",
    temperature: 0,
  },
};

export function defaultAgentBody(stepId: number): AgentBody {
  const s = SEEDS[stepId];
  const step = STEPS[stepId - 1];
  return {
    model: s.model ?? "claude-sonnet-5-5",
    temperature: s.temperature ?? 0.2,
    systemPrompt: s.system,
    instruction: s.instruction,
    extractionPrompt: s.extraction,
    schema: s.schema ?? [],
    guardrails: [...(s.guardrails ?? []), ...COMMON_GUARDRAILS],
    tools: s.tools ?? [],
    autonomy: s.autonomy ?? "suggest",
    confidenceThreshold: s.threshold ?? 85,
    variables: s.variables ?? [`step_${step.id}_input`],
  };
}

/* ------------------------------ Default pricing rules ------------------------------ */

export const DEFAULT_RULES: PricingRules = {
  minMarginPct: 15,
  toleranceBandPct: 5,
  maxDiscountPct: 8,
  earlyPayDiscountPct: 5,
  advancePaymentPct: 40,
  regionModifiers: [
    { region: "California", labourPct: 12, materialPct: 4, transportPct: 6 },
    { region: "Texas", labourPct: -6, materialPct: -3, transportPct: 2 },
    { region: "New York", labourPct: 18, materialPct: 6, transportPct: 9 },
  ],
  marginTargets: [
    { id: "mt-1", material: "Teak", region: "California", targetPct: 24 },
    { id: "mt-2", material: "Cedar", region: "Texas", targetPct: 20 },
    { id: "mt-3", material: "Any", region: "New York", targetPct: 23 },
    { id: "mt-4", material: "Any", region: "Any", targetPct: 20 },
  ],
  approvalTiers: [
    { id: "at-1", upToValue: 10000, approver: "Estimator" },
    { id: "at-2", upToValue: 50000, approver: "Sales manager", escalateBelowMarginPct: 18 },
    { id: "at-3", upToValue: null, approver: "Director", escalateBelowMarginPct: 20 },
  ],
};
