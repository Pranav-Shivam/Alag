import { Inbox, Layers, Pause, PencilLine, Radio, RotateCcw, ScrollText, Workflow, UserCheck, Wrench } from "lucide-react";
import { Card, Chip, ConfidenceMeter } from "../ui";
import StepBadge from "./StepBadge";
import { AUTONOMY_META, GROUPS, pctText } from "./shared";
import type { AgentGroup, AgentRow } from "./shared";

const CORE = [
  { label: "Durable state machine", icon: Workflow },
  { label: "Event bus", icon: Radio },
  { label: "Retries", icon: RotateCcw },
  { label: "Dead-letter queue", icon: Inbox },
  { label: "Audit log", icon: ScrollText },
];

function AgentCard({ row, onOpen }: { row: AgentRow; onOpen: (stepId: number) => void }) {
  const { step, body, orch, stats } = row;
  const meta = AUTONOMY_META[body.autonomy];
  return (
    <button
      type="button"
      onClick={() => onOpen(step.id)}
      aria-label={`Step ${step.id}, ${step.agent}. Open summary`}
      className="flex w-full flex-col gap-2 rounded-lg border border-line bg-surface p-3 text-left shadow-xs transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <span className="flex items-start gap-2">
        <StepBadge id={step.id} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug text-ink">{step.agent}</span>
          <span className="block truncate font-mono text-xs text-muted">{body.model}</span>
        </span>
        {orch.requireApproval ? (
          <span className="mt-0.5 text-warn-fg" title={`Human gate: ${orch.approverRole} approves`}>
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Human approval required from {orch.approverRole}</span>
          </span>
        ) : null}
      </span>

      <span className="flex flex-wrap gap-1.5">
        <Chip tone={meta.tone} icon={meta.icon}>
          {meta.label}
        </Chip>
        {orch.paused ? (
          <Chip tone="danger" icon={Pause}>
            Paused
          </Chip>
        ) : null}
        {row.hasDraft ? (
          <Chip tone="warn" icon={PencilLine}>
            Unpublished edits
          </Chip>
        ) : null}
      </span>

      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="tabular-nums">
          {row.rules.length} {row.rules.length === 1 ? "rule" : "rules"}, {row.critical} critical
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Wrench className="h-3 w-3" aria-hidden="true" />
          {row.enabledTools} {row.enabledTools === 1 ? "tool" : "tools"}
        </span>
      </span>

      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {stats.avgScore === null ? (
          <span className="text-xs text-muted">Not scored yet</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-muted">Score</span>
            <ConfidenceMeter pct={Math.round(stats.avgScore)} />
          </span>
        )}
        <span className="text-xs tabular-nums text-muted">Pass rate {pctText(stats.passRatePct)}</span>
      </span>
    </button>
  );
}

function Group({ group, rows, onOpen }: { group: AgentGroup; rows: AgentRow[]; onOpen: (stepId: number) => void }) {
  const live = rows.filter((r) => !r.orch.paused).length;
  return (
    <section aria-labelledby={`group-${group.id}`} className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 id={`group-${group.id}`} className="text-sm font-semibold text-ink">
            {group.title}
          </h4>
          <p className="text-xs text-muted">
            Steps {group.from} to {group.to}. {group.hint}
          </p>
        </div>
        <Chip tone={group.tone}>
          <span className="tabular-nums">
            {live} of {rows.length} live
          </span>
        </Chip>
      </header>
      <ul className={`grid gap-2 ${group.id === "commercial" ? "sm:grid-cols-2" : ""}`}>
        {rows.map((r) => (
          <li key={r.step.id} className="min-w-0">
            <AgentCard row={r} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Orchestrator on top, three domain groups below, connected with SVG lines. */
export default function OrchestratorDiagram({ rows, onOpen }: { rows: AgentRow[]; onOpen: (stepId: number) => void }) {
  return (
    <Card className="p-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-accent bg-surface p-4 text-center shadow-xs">
        <div className="flex items-center justify-center gap-2">
          <Layers className="h-4 w-4 text-accent-fg" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-ink">Workflow orchestrator</h3>
        </div>
        <p className="mx-auto mt-1 max-w-xl text-xs text-muted">
          Passes work from one domain agent to the next. Agents never call each other directly, they publish events and the orchestrator routes them.
        </p>
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {CORE.map((c) => (
            <li key={c.label}>
              <Chip tone="neutral" icon={c.icon}>
                {c.label}
              </Chip>
            </li>
          ))}
        </ul>
      </div>

      {/* Connectors. Three branches on wide screens, one stem on phones. */}
      <div className="relative hidden h-10 lg:block" aria-hidden="true">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
          {[25, 62.5, 87.5].map((x) => (
            <path key={x} d={`M50 0 V16 H${x} V40`} fill="none" className="stroke-line-strong" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {[25, 62.5, 87.5].map((x) => (
          <span key={x} className="absolute bottom-0 h-2 w-2 -translate-x-1/2 rounded-full bg-line-strong" style={{ left: `${x}%` }} />
        ))}
      </div>
      <div className="mx-auto h-6 w-px bg-line-strong lg:hidden" aria-hidden="true" />

      <div className="grid gap-3 lg:grid-cols-4">
        {GROUPS.map((g) => (
          <div key={g.id} className={g.id === "commercial" ? "lg:col-span-2" : ""}>
            <Group group={g} rows={rows.filter((r) => r.step.id >= g.from && r.step.id <= g.to)} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </Card>
  );
}
