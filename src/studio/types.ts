// Shared data model for the step inspector. Everything here is fake and kept in the browser (localStorage).

/* ------------------------------ Agent configuration ------------------------------ */

export interface SchemaField {
  id: string;
  name: string; // snake_case key the agent must return
  type: "string" | "number" | "boolean" | "enum" | "date";
  required: boolean;
  description: string; // doubles as the extraction instruction for this field
  /** Percent. Below this the field goes to a human. Falls back to the agent threshold. */
  threshold?: number;
}

export interface Guardrail {
  id: string;
  text: string;
  /** Locked guardrails are read-only in the UI. Only an admin could change them in a real product. */
  locked: boolean;
}

export interface ToolPermission {
  id: string;
  name: string; // e.g. "price_book.lookup"
  description: string;
  enabled: boolean;
  /** Locked = the agent must never lose or gain this permission from the UI. */
  locked: boolean;
}

export type Autonomy = "suggest" | "draft" | "auto";

/** The editable body of an agent. A draft and every published version is one of these. */
export interface AgentBody {
  model: string;
  temperature: number; // 0..1
  systemPrompt: string;
  instruction: string; // task template with {{variables}}
  /** Only agents that read documents have one (step 2). Same {{variables}} syntax. */
  extractionPrompt?: string;
  schema: SchemaField[];
  guardrails: Guardrail[];
  tools: ToolPermission[];
  autonomy: Autonomy;
  /** Percent. Fields or recommendations below this need a human. */
  confidenceThreshold: number;
  /** Variables the instruction may use. Shown as clickable chips in the editor. */
  variables: string[];
}

export interface AgentVersion {
  version: number;
  publishedAt: string; // ISO
  author: string;
  note: string;
  body: AgentBody;
}

export interface AgentState {
  stepId: number;
  live: AgentBody;
  /** Unpublished edits. null when there are none. */
  draft: AgentBody | null;
  version: number; // number of the live version
  history: AgentVersion[]; // newest first, includes the live version
}

/* ------------------------------ Pricing rules ------------------------------ */

export interface ApprovalTier {
  id: string;
  /** Quote value up to and including this amount. null = catch-all (must be the last tier). */
  upToValue: number | null;
  approver: string; // role, e.g. "Estimator"
  /** Also needs the next approver up when margin is below this percent. Optional. */
  escalateBelowMarginPct?: number;
}

export interface RegionModifier {
  region: string; // California, Texas, New York
  labourPct: number; // +/- percent on the price book labour rate
  materialPct: number;
  transportPct: number;
}

export interface MarginTarget {
  id: string;
  material: string; // a material name or "Any"
  region: string; // or "Any"
  targetPct: number; // fallback margin when the ML model has low confidence
}

export interface PricingRules {
  minMarginPct: number; // hard floor, AI and humans cannot go below without approval
  toleranceBandPct: number; // allowed +/- around the recommended margin, e.g. 5
  maxDiscountPct: number;
  earlyPayDiscountPct: number; // advance payment discount
  advancePaymentPct: number; // default advance share of the order
  regionModifiers: RegionModifier[];
  marginTargets: MarginTarget[];
  approvalTiers: ApprovalTier[];
}

export interface RulesVersion {
  version: number;
  publishedAt: string;
  author: string;
  note: string;
  rules: PricingRules;
}

export interface RulesState {
  live: PricingRules;
  draft: PricingRules | null;
  version: number;
  history: RulesVersion[]; // newest first
}

/* ------------------------------ Per quotation case data ------------------------------ */

export type AttachmentKind = "sketch" | "drawing" | "photo" | "pdf" | "upload";

export interface Attachment {
  id: string;
  name: string; // file name shown to the user
  title: string;
  kind: AttachmentKind;
  url: string; // /samples/... or an object URL for uploads
  mime: string; // image/jpeg, image/png, application/pdf
  sizeBytes: number;
  pages?: number;
  origin: "email" | "library" | "upload";
  license?: string;
  sourceUrl?: string;
  addedAt: string;
}

export interface LibraryItem {
  id: string;
  file: string;
  title: string;
  kind: Exclude<AttachmentKind, "upload">;
  mime: string;
  sizeBytes: number;
  pages?: number;
  widthPx?: number;
  heightPx?: number;
  license: string;
  author: string;
  sourceUrl: string;
  keywords: string[]; // what the search box matches on, besides title
}

export interface EmailRecord {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  receivedAt: string; // ISO
  forwardedBy: string; // estimator
  body: string;
  signature: string;
}

export type FieldState = "verified" | "edited" | "needs_review" | "missing" | "na";

export interface FieldSource {
  attachmentId: string;
  page?: number; // 1 based
  /** Normalised 0..1 box on the page: [x, y, width, height]. Omit when the agent found no location. */
  box?: [number, number, number, number];
}

export interface ExtractedField {
  key: string; // dimension_length ...
  label: string;
  value: string | null;
  unit?: string;
  confidence: number | null; // 0..100. null when missing
  state: FieldState;
  required: boolean;
  source?: FieldSource;
  /** Why the agent is unsure, or why it is missing. */
  note?: string;
  /** What the AI had before a human edited it. */
  aiValue?: string | null;
}

export type ExtractionStatus = "not_run" | "done" | "failed";

export interface ExtractionResult {
  status: ExtractionStatus;
  ranAt?: string;
  agentVersion?: number;
  model?: string;
  failureReason?: string;
  fields: ExtractedField[];
}

export type BomCategory = "material" | "labour" | "manufacturing" | "finishing" | "hardware" | "logistics" | "installation";

export interface BomLine {
  id: string;
  category: BomCategory;
  item: string;
  unit: string;
  /** What the deterministic engine computed from the design and the price book. Never edited. */
  calcQty: number;
  calcUnitPrice: number;
  source: "price_book" | "supplier" | "manual";
  override?: { qty: number; unitPrice: number; reason: string; by: string; at: string };
}

export interface MarginDecision {
  recommendedPct: number; // from the ML model
  modelConfidence: number; // 0..100
  chosenPct: number;
  reason?: string; // required when chosen differs from recommended
  approvedBy?: string;
}

export interface ClarificationDraft {
  to: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
  sentAt?: string;
}

export interface QuotationDraft {
  subject: string;
  body: string;
  validityDays: number;
  paymentTerms: string;
  status: "draft" | "sent";
  /** Recorded when the customer decides. */
  decision?: { result: "awarded" | "rejected"; reason?: string; at: string };
}

export interface ActivityEvent {
  id: string;
  at: string; // ISO
  stepId: number;
  actor: "AI" | "Human" | "System";
  who: string; // agent name or person
  text: string;
}

/** Estimate Desk lanes, in order. Procurement can only be confirmed after manufacturing. */
export interface EstimateLanes {
  manufacturing: boolean;
  procurement: boolean;
}

export interface QuotationCase {
  quotationId: string;
  email: EmailRecord;
  attachments: Attachment[];
  extraction: ExtractionResult;
  rfqApproved: boolean;
  clarification: ClarificationDraft | null;
  lanes: EstimateLanes;
  bom: BomLine[];
  margin: MarginDecision | null;
  quotationDraft: QuotationDraft | null;
  activity: ActivityEvent[];
}
