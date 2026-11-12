import type { ComponentType } from "react";
import Step1Email from "../../steps/Step1Email";
import Step2Review from "../../steps/Step2Review";
import Step3Approval from "../../steps/Step3Approval";
import Step4Costing from "../../steps/Step4Costing";
import Step5Margin from "../../steps/Step5Margin";
import Step6Quotation from "../../steps/Step6Quotation";
import type { CaseProps, RulesTabProps } from "./types";

export interface StepUi {
  /** Label of the per-quotation work tab. Omit when the step has no case editor. */
  caseLabel?: string;
  Case?: ComponentType<CaseProps>;
  /** Show the pricing Rules tab for this step and open this section. */
  rulesFocus?: RulesTabProps["focus"];
}

/** Which tabs each step gets. Overview, Agent and Activity are on every step. */
export const STEP_UI: Record<number, StepUi> = {
  1: { caseLabel: "Email and files", Case: Step1Email },
  2: { caseLabel: "Review extraction", Case: Step2Review },
  3: { caseLabel: "RFQ approval", Case: Step3Approval },
  4: { caseLabel: "Costing", Case: Step4Costing, rulesFocus: "region" },
  5: { caseLabel: "Margin", Case: Step5Margin, rulesFocus: "margin" },
  6: { caseLabel: "Quotation", Case: Step6Quotation, rulesFocus: "discount" },
  12: { rulesFocus: "discount" },
};
