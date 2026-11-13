import { useEffect, useMemo, useState } from "react";
import { Gauge, ListChecks, Scale, FlaskConical } from "lucide-react";
import { PageHeader, Segmented } from "../components/ui";
import Runs from "../components/evaluation/Runs";
import Scoreboard from "../components/evaluation/Scoreboard";
import ScoringRules from "../components/evaluation/ScoringRules";
import Suites from "../components/evaluation/Suites";
import { EMPTY_FILTERS, clearPendingGoto, hasTarget, peekPendingGoto, scoreAll } from "../components/evaluation/shared";
import type { GotoDetail, RunFilters, SubTab } from "../components/evaluation/shared";
import { useEval } from "../studio/evalStore";

function filtersFromGoto(d: GotoDetail): RunFilters {
  return { ...EMPTY_FILTERS, ruleId: d.ruleId ?? null, stepId: typeof d.stepId === "number" ? d.stepId : "all" };
}

export default function EvaluationPage() {
  const runs = useEval((s) => s.runs);
  const rules = useEval((s) => s.rules);
  const scoring = useEval((s) => s.scoring);
  const scored = useMemo(() => scoreAll(runs, rules, scoring), [runs, rules, scoring]);

  // A jump request may have arrived just before this page mounted. The module in shared.tsx keeps it for a moment.
  const [initial] = useState(() => {
    const d = peekPendingGoto();
    return d && hasTarget(d) ? d : null;
  });
  const [tab, setTab] = useState<SubTab>(initial ? "runs" : "scoreboard");
  const [filters, setFilters] = useState<RunFilters>(() => (initial ? filtersFromGoto(initial) : EMPTY_FILTERS));
  const [selectedId, setSelectedId] = useState<string | null>(initial?.runId ?? null);

  useEffect(() => {
    clearPendingGoto();
    const onGoto = (e: Event) => {
      const d = (e as CustomEvent<GotoDetail>).detail;
      if (!d || d.tab !== "evaluation" || !hasTarget(d)) return;
      clearPendingGoto();
      setFilters(filtersFromGoto(d));
      setSelectedId(d.runId ?? null);
      setTab("runs");
    };
    window.addEventListener("alag:goto", onGoto);
    return () => window.removeEventListener("alag:goto", onGoto);
  }, []);

  const openAgent = (stepId: number) => {
    setFilters({ ...EMPTY_FILTERS, stepId });
    setSelectedId(null);
    setTab("runs");
    window.scrollTo({ top: 0 });
  };

  const openRun = (runId: string) => {
    setFilters(EMPTY_FILTERS);
    setSelectedId(runId);
    setTab("runs");
  };

  return (
    <div className="page">
      <PageHeader
        title="Evaluation and observability"
        description="Every agent run is recorded as a trajectory and judged against its written Behavior Spec, so reliability is measured by rules followed and not by runs completed."
      />

      <div className="max-w-full">
        <Segmented
          label="Evaluation sections"
          value={tab}
          onChange={setTab}
          options={[
            { id: "scoreboard", label: "Scoreboard", icon: Gauge },
            { id: "runs", label: "Runs", icon: ListChecks },
            { id: "rules", label: "Scoring rules", icon: Scale },
            { id: "suites", label: "Test suites", icon: FlaskConical },
          ]}
        />
      </div>

      <div className="min-w-0">
        {tab === "scoreboard" && <Scoreboard scored={scored} runs={runs} rules={rules} scoring={scoring} onOpenAgent={openAgent} />}
        {tab === "runs" && <Runs scored={scored} rules={rules} scoring={scoring} filters={filters} setFilters={setFilters} selectedId={selectedId} onSelect={setSelectedId} />}
        {tab === "rules" && <ScoringRules runs={runs} rules={rules} scored={scored} scoring={scoring} />}
        {tab === "suites" && <Suites runs={runs} rules={rules} scored={scored} scoring={scoring} onOpenRun={openRun} />}
      </div>
    </div>
  );
}
