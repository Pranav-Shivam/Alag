export type Tech = "AI" | "ML" | "Rules" | "Human" | "Integration";

export interface WorkflowStep {
  id: number; // 1..14
  name: string;
  short: string; // short label for small cards
  agent: string; // AI agent (or service) working on the step
  owner: string; // human team that approves / owns it
  tech: Tech[]; // what technology is used
  description: string;
  output: string;
}

export type Outcome = "in_progress" | "awarded" | "rejected";

export type StepStatus =
  | "done"
  | "current"
  | "blocked" // current step, waiting for human / customer input
  | "pending"
  | "rejected" // quotation lost at this step
  | "skipped"; // not reached because the quotation was rejected

export interface Quotation {
  id: string; // QUO-1001
  rfqId: string; // RFQ-1001
  estId: string; // EST-1001
  orderId?: string; // ORD-1001, only when awarded
  customer: string;
  product: string;
  material: string;
  region: string;
  value: number; // USD
  marginPct: number; // 0..100, target margin
  estimator: string;
  receivedOn: string; // ISO date
  outcome: Outcome;
  /** For in_progress / awarded: the step the quotation is on (1..14). */
  currentStep: number;
  /** In progress only: waiting on a human or on the customer. */
  blocked?: boolean;
  blockedReason?: string;
  /** Rejected only. */
  rejectReason?: string;
}
