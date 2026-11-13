import { useMemo, useState } from "react";
import { Funnel, Search, X } from "lucide-react";
import { Button, Segmented, Select, TextInput, relTime } from "../ui";
import { fmtMs, fmtUsd } from "../../studio/evalCalc";
import type { ScoringConfig, SpecRule } from "../../studio/evalTypes";
import { STEPS } from "../../data/steps";
import RunDetail from "./RunDetail";
import { EMPTY_FILTERS, EmptyState, HumanChip, ScoreChip, StatusChip, VerdictSummary, fmtNum, fmtWhen } from "./shared";
import type { RunFilters, ScoredRun } from "./shared";

const PAGE = 40;

interface Props {
  scored: ScoredRun[];
  rules: SpecRule[];
  scoring: ScoringConfig;
  filters: RunFilters;
  setFilters: (f: RunFilters) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function Runs({ scored, rules, scoring, filters, setFilters, selectedId, onSelect }: Props) {
  const [limit, setLimit] = useState(PAGE);
  const set = (patch: Partial<RunFilters>) => {
    setLimit(PAGE);
    setFilters({ ...filters, ...patch });
  };

  const rule = filters.ruleId ? rules.find((r) => r.id === filters.ruleId) : undefined;

  const list = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return scored
      .filter(({ run, s }) => {
        if (filters.stepId !== "all" && run.stepId !== filters.stepId) return false;
        if (filters.status !== "all" && run.status !== filters.status) return false;
        if (filters.verdict === "critical" && s.criticalFails === 0) return false;
        if (filters.verdict === "fail" && s.fails === 0) return false;
        if (filters.verdict === "warn" && s.warns === 0) return false;
        if (q && !run.id.toLowerCase().includes(q) && !run.quotationId.toLowerCase().includes(q)) return false;
        if (filters.ruleId) {
          const c = run.checks.find((x) => x.ruleId === filters.ruleId);
          if (!c || (c.verdict !== "fail" && c.verdict !== "warn")) return false;
        }
        return true;
      })
      .sort((a, b) => b.run.startedAt.localeCompare(a.run.startedAt));
  }, [scored, filters]);

  const active = filters.stepId !== "all" || filters.status !== "all" || filters.verdict !== "all" || filters.query !== "" || filters.ruleId !== null;
  const shown = list.slice(0, limit);
  const selected = selectedId ? scored.find((x) => x.run.id === selectedId) : undefined;

  return (
    <div className="space-y-4">
      <div className="surface p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Agent" value={String(filters.stepId)} onChange={(e) => set({ stepId: e.target.value === "all" ? "all" : Number(e.target.value) })}>
            <option value="all">All agents</option>
            {STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.agent}
              </option>
            ))}
          </Select>
          <Select label="Verdict" value={filters.verdict} onChange={(e) => set({ verdict: e.target.value as RunFilters["verdict"] })}>
            <option value="all">All verdicts</option>
            <option value="critical">Has critical fail</option>
            <option value="fail">Has any fail</option>
            <option value="warn">Has warn</option>
          </Select>
          <div className="sm:col-span-2">
            <TextInput label="Search by run or quotation id" type="search" value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Run id or quotation id" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Segmented
            label="Run status"
            value={filters.status}
            onChange={(v) => set({ status: v })}
            options={[
              { id: "all", label: "All" },
              { id: "success", label: "Success" },
              { id: "needs_review", label: "Needs review" },
              { id: "failed", label: "Failed" },
            ]}
          />
          {filters.ruleId ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-info-line bg-info-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-info-fg">
              <Funnel className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">Filtered by rule: {rule?.title ?? filters.ruleId}</span>
              <button type="button" onClick={() => set({ ruleId: null })} className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-info-line/40" aria-label="Remove rule filter">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ) : null}
          {active ? (
            <Button size="sm" variant="ghost" icon={X} onClick={() => set({ ...EMPTY_FILTERS })}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        Showing {Math.min(limit, list.length)} of {list.length} runs{active ? " that match the filters" : ""}.
      </p>

      {list.length === 0 ? (
        <EmptyState title="No runs match these filters">
          Try another agent or verdict, or clear the filters.
          <div className="mt-3">
            <Button icon={Search} onClick={() => set({ ...EMPTY_FILTERS })}>
              Clear filters
            </Button>
          </div>
        </EmptyState>
      ) : (
        <>
          {/* Narrow: cards */}
          <ul className="grid gap-3 sm:grid-cols-2 xl:hidden">
            {shown.map(({ run, s }) => (
              <li key={run.id}>
                <button
                  type="button"
                  onClick={() => onSelect(run.id)}
                  aria-haspopup="dialog"
                  className={`w-full rounded-surface border bg-surface p-3 text-left shadow-surface transition-colors hover:bg-surface-2 ${selectedId === run.id ? "border-accent" : "border-line"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{run.agentName}</div>
                      <div className="truncate font-mono text-xs text-muted">{run.id}</div>
                    </div>
                    <ScoreChip score={s.score} passed={s.passed} passScore={scoring.passScore} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusChip status={run.status} />
                    <HumanChip outcome={run.humanOutcome} />
                  </div>
                  <div className="mt-2">
                    <VerdictSummary s={s} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted">
                    <span>{run.quotationId}</span>
                    <span>{relTime(run.startedAt)}</span>
                    <span>{fmtMs(run.durationMs)}</span>
                    <span>{fmtNum(run.tokensIn + run.tokensOut)} tokens</span>
                    <span>{fmtUsd(run.costUsd)}</span>
                    <span>
                      {run.retries} retr{run.retries === 1 ? "y" : "ies"}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Wide: table */}
          <div className="surface hidden overflow-x-auto xl:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th scope="col" className="px-3 py-2 font-medium">Run</th>
                  <th scope="col" className="px-2 py-2 font-medium">Agent</th>
                  <th scope="col" className="px-2 py-2 font-medium">Time</th>
                  <th scope="col" className="px-2 py-2 font-medium">Status</th>
                  <th scope="col" className="px-2 py-2 font-medium">Judge score</th>
                  <th scope="col" className="px-2 py-2 font-medium">Verdicts</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Duration and tokens</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Cost and retries</th>
                  <th scope="col" className="px-3 py-2 font-medium">Human outcome</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ run, s }) => (
                  <tr key={run.id} onClick={() => onSelect(run.id)} className={`cursor-pointer border-b border-line align-top last:border-b-0 hover:bg-surface-2 ${selectedId === run.id ? "bg-surface-2" : ""}`}>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(run.id);
                        }}
                        aria-haspopup="dialog"
                        aria-label={`Open run ${run.id}`}
                        className="rounded-chip text-left"
                      >
                        <div className="font-mono text-xs font-medium text-ink">{run.id}</div>
                        <div className="text-xs text-muted">{run.quotationId}</div>
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-ink-2">
                      <span className="tabular-nums text-muted">{run.stepId}.</span> {run.agentName}
                    </td>
                    <td className="px-2 py-2.5 text-xs tabular-nums text-muted">
                      <div className="text-ink-2">{relTime(run.startedAt)}</div>
                      <div>{fmtWhen(run.startedAt)}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusChip status={run.status} />
                    </td>
                    <td className="px-2 py-2.5">
                      <ScoreChip score={s.score} passed={s.passed} passScore={scoring.passScore} />
                    </td>
                    <td className="px-2 py-2.5">
                      <VerdictSummary s={s} />
                    </td>
                    <td className="px-2 py-2.5 text-right text-xs tabular-nums">
                      <div className="text-ink-2">{fmtMs(run.durationMs)}</div>
                      <div className="text-muted">{fmtNum(run.tokensIn + run.tokensOut)} tokens</div>
                    </td>
                    <td className="px-2 py-2.5 text-right text-xs tabular-nums">
                      <div className="text-ink-2">{fmtUsd(run.costUsd)}</div>
                      <div className="text-muted">
                        {run.retries} retr{run.retries === 1 ? "y" : "ies"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <HumanChip outcome={run.humanOutcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {list.length > limit ? (
            <div className="flex justify-center">
              <Button onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, list.length - limit)} more runs</Button>
            </div>
          ) : null}
        </>
      )}

      {selected ? <RunDetail key={selected.run.id} item={selected} rules={rules} scoring={scoring} onClose={() => onSelect(null)} /> : null}
    </div>
  );
}

