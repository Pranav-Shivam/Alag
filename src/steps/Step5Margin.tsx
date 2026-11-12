import { Calculator } from "lucide-react";
import type { CaseProps } from "../components/inspector/types";
import { Callout } from "../components/ui";
import { bomTotals } from "../studio/calc";
import { useAgent, useCase, useRules } from "../studio/store";
import DecisionCard from "./costing/DecisionCard";
import RecommendationCard from "./costing/RecommendationCard";

export default function Step5Margin({ quotation, status }: CaseProps) {
  const c = useCase(quotation.id);
  const rules = useRules();
  const threshold = useAgent(5).live.confidenceThreshold;

  if (!c || !c.margin || c.bom.length === 0) {
    return (
      <div className="@container">
        <Callout tone="info" icon={Calculator} title="Finish costing first">
          Margin advice needs an approved cost estimate. Complete the design and bill of materials in the costing step, and the recommended margin, the price and the approval route appear here.
        </Callout>
      </div>
    );
  }

  const margin = c.margin;
  const cost = bomTotals(c.bom).effective;

  return (
    <div className="@container space-y-4">
      <RecommendationCard quotation={quotation} margin={margin} cost={cost} rules={rules.live} threshold={threshold} />
      <DecisionCard
        key={`${margin.chosenPct}|${margin.reason ?? ""}|${margin.approvedBy ?? ""}|${cost}`}
        qid={quotation.id}
        margin={margin}
        cost={cost}
        rules={rules.live}
        rulesVersion={rules.version}
        approved={status === "done"}
      />
    </div>
  );
}
