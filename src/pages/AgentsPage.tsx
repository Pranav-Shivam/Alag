import { useEffect, useState } from "react";
import { BookOpen, LayoutDashboard, ListChecks, Workflow } from "lucide-react";
import { PageHeader, Segmented } from "../components/ui";
import OverviewTab from "../components/orchestration/OverviewTab";
import BehaviorSpecsTab from "../components/orchestration/BehaviorSpecsTab";
import OrchestrationTab from "../components/orchestration/OrchestrationTab";
import type { SubTab } from "../components/orchestration/shared";
import StepsPage from "./StepsPage";
import { useEval } from "../studio/evalStore";

const TABS: { id: SubTab; label: string; icon: typeof Workflow }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "specs", label: "Behavior specs", icon: ListChecks },
  { id: "orchestration", label: "Orchestration", icon: Workflow },
  { id: "catalog", label: "Catalog", icon: BookOpen },
];

/**
 * Agent engineering and orchestration.
 * Other screens can steer this one with window events:
 *   alag:open-tab  detail { tab: "overview" | "specs" | "orchestration" | "catalog", stepId?: number }
 *   alag:goto      detail { tab: "agents", stepId?: number, ruleId?: string }  (ruleId opens that rule's agent in Behavior specs)
 */
export default function AgentsPage() {
  const [sub, setSub] = useState<SubTab>("overview");
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [specStep, setSpecStep] = useState(1);

  useEffect(() => {
    const onOpenTab = (e: Event) => {
      const d = (e as CustomEvent<{ tab?: SubTab; stepId?: number }>).detail;
      if (!d?.tab || !TABS.some((t) => t.id === d.tab)) return;
      setSub(d.tab);
      if (d.stepId) {
        if (d.tab === "specs") setSpecStep(d.stepId);
        if (d.tab === "overview") setOpenStep(d.stepId);
      }
    };
    const onGoto = (e: Event) => {
      const d = (e as CustomEvent<{ tab?: string; stepId?: number; ruleId?: string }>).detail;
      if (d?.tab !== "agents") return;
      const rule = d.ruleId ? useEval.getState().rules.find((r) => r.id === d.ruleId) : undefined;
      if (rule) {
        setSub("specs");
        setSpecStep(rule.stepId);
      } else if (d.stepId) {
        setSub("overview");
        setOpenStep(d.stepId);
      }
    };
    window.addEventListener("alag:open-tab", onOpenTab);
    window.addEventListener("alag:goto", onGoto);
    return () => {
      window.removeEventListener("alag:open-tab", onOpenTab);
      window.removeEventListener("alag:goto", onGoto);
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="Agent engineering and orchestration"
        description="ALAG runs a supervised team of domain agents, not one giant agent. Each has a written behavior spec, approved tools, limited permissions and a trust level, and risky decisions keep a human gate."
      />

      <Segmented<SubTab>
        label="Agents sections"
        value={sub}
        onChange={(v) => {
          setSub(v);
          setOpenStep(null);
        }}
        options={TABS}
        className="w-full sm:w-auto"
      />

      <div className="min-w-0">
        {sub === "overview" && <OverviewTab openStep={openStep} onOpenStep={setOpenStep} />}
        {sub === "specs" && <BehaviorSpecsTab stepId={specStep} onStepChange={setSpecStep} />}
        {sub === "orchestration" && <OrchestrationTab />}
        {sub === "catalog" && <StepsPage />}
      </div>
    </div>
  );
}
