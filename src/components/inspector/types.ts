import type { Quotation, StepStatus } from "../../types";

/** Props for a step's "case" tab: the work done on ONE quotation at that step. */
export interface CaseProps {
  quotation: Quotation;
  status: StepStatus;
}

/** Props for the "Agent" tab: prompts and settings, shared by ALL quotations. */
export interface AgentTabProps {
  stepId: number;
}

/** Props for the "Rules" tab: pricing rules, shared by ALL quotations. */
export interface RulesTabProps {
  /** Which section of the rules editor to open first. */
  focus: "region" | "margin" | "discount";
}
