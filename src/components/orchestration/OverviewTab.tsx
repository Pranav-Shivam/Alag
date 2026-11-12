import { useMemo } from "react";
import { Activity, Gauge, ListChecks, Pause, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "../ui";
import OrchestratorDiagram from "./OrchestratorDiagram";
import TrustLadder from "./TrustLadder";
import AgentDrawer from "./AgentDrawer";
import { useAgentRows } from "./shared";
import { scoreRun } from "../../studio/evalCalc";
import { useEval } from "../../studio/evalStore";

function Kpi({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub: string }) {
  return (
    <Card as="div" className="p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      <div className="text-xs tabular-nums text-muted">{sub}</div>
    </Card>
  );
}

export default function OverviewTab({ openStep, onOpenStep }: { openStep: number | null; onOpenStep: (stepId: number | null) => void }) {
  const rows = useAgentRows();
  const runs = useEval((s) => s.runs);
  const rules = useEval((s) => s.rules);
  const scoring = useEval((s) => s.scoring);

  const avgScore = useMemo(() => {
    const scores = runs.map((r) => scoreRun(r, rules, scoring).score).filter((s): s is number => s !== null);
    return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  }, [runs, rules, scoring]);

  const paused = rows.filter((r) => r.orch.paused).length;
  const gates = rows.filter((r) => r.orch.requireApproval).length;
  const critical = rows.reduce((s, r) => s + r.critical, 0);
  const ruleCount = rows.reduce((s, r) => s + r.rules.length, 0);
  const open = rows.find((r) => r.step.id === openStep) ?? null;

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi icon={Activity} label="Agents live" value={String(rows.length - paused)} sub={`of ${rows.length} agents`} />
        <Kpi icon={Pause} label="Agents paused" value={String(paused)} sub={paused === 0 ? "none queued for humans" : "work waits for humans"} />
        <Kpi icon={UserCheck} label="Human gates" value={String(gates)} sub={`${rows.length - gates} run without a gate`} />
        <Kpi icon={ListChecks} label="Behavior spec rules" value={String(ruleCount)} sub={`${critical} critical`} />
        <Kpi icon={Gauge} label="Average judge score" value={avgScore === null ? "None" : String(avgScore)} sub={`pass bar ${scoring.passScore}, ${runs.length} runs`} />
      </div>

      <OrchestratorDiagram rows={rows} onOpen={onOpenStep} />
      <TrustLadder rows={rows} onOpen={onOpenStep} />

      {open ? <AgentDrawer row={open} onClose={() => onOpenStep(null)} /> : null}
    </div>
  );
}
