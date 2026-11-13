import { useEffect, useId, useState } from "react";
import { Inbox, KeyRound, Pause, Play, RotateCcw, Send, UserCheck } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle, Segmented, Switch } from "../ui";
import StepBadge from "./StepBadge";
import EventFanOut from "./EventFanOut";
import { APPROVER_ROLES, useAgentRows } from "./shared";
import type { AgentRow } from "./shared";
import { STEPS } from "../../data/steps";
import { DOMAIN_EVENTS } from "../../studio/evalSeed";
import { useEval } from "../../studio/evalStore";
import type { OrchestrationConfig } from "../../studio/evalTypes";

const FAILURE_OPTIONS: { id: OrchestrationConfig["onFailure"]; label: string }[] = [
  { id: "escalate", label: "Escalate to human" },
  { id: "retry", label: "Retry" },
  { id: "stop", label: "Stop" },
];

const RANGES = {
  maxRetries: { min: 0, max: 5, label: "Max retries" },
  timeoutSec: { min: 10, max: 600, label: "Timeout in seconds" },
  concurrency: { min: 1, max: 16, label: "Concurrency" },
} as const;

const NUMBER_FIELD =
  "min-h-10 w-full rounded-lg border bg-surface px-2.5 text-sm tabular-nums text-ink transition-colors hover:border-muted focus:border-ring";

/** Whole number input that only commits values inside its range and says why otherwise. */
function NumField({ label, value, min, max, onCommit, hideLabel }: { label: string; value: number; min: number; max: number; onCommit: (n: number) => void; hideLabel?: boolean }) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Re-sync when the stored value changes from outside.
    setText(String(value));
    setError(null);
  }, [value]);

  const onChange = (raw: string) => {
    setText(raw);
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isInteger(n) || n < min || n > max) {
      setError(`Whole number from ${min} to ${max}`);
      return;
    }
    setError(null);
    onCommit(n);
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1 block text-xs font-medium text-ink-2"}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          setText(String(value));
          setError(null);
        }}
        className={`${NUMBER_FIELD} ${error ? "border-danger-line" : "border-line-strong"}`}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-xs text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RoleSelect({ row, hideLabel }: { row: AgentRow; hideLabel?: boolean }) {
  const id = useId();
  const update = useEval((s) => s.updateOrchestration);
  const roles = APPROVER_ROLES.includes(row.orch.approverRole) ? APPROVER_ROLES : [row.orch.approverRole, ...APPROVER_ROLES];
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1 block text-xs font-medium text-ink-2"}>
        {`Approver role for ${row.step.agent}`}
      </label>
      <select
        id={id}
        value={row.orch.approverRole}
        disabled={!row.orch.requireApproval}
        onChange={(e) => update(row.step.id, { approverRole: e.target.value })}
        className="min-h-10 w-full rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-ink transition-colors hover:border-muted focus:border-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}

function AgentCardRow({ row }: { row: AgentRow }) {
  const update = useEval((s) => s.updateOrchestration);
  const { step, orch } = row;
  const name = step.agent;
  return (
    <Card as="article" className="space-y-3 p-4">
      <div className="flex items-start gap-2">
        <StepBadge id={step.id} />
        <h4 className="min-w-0 flex-1 text-sm font-semibold text-ink">{name}</h4>
        {orch.paused ? (
          <Chip tone="danger" icon={Pause}>
            Paused
          </Chip>
        ) : (
          <Chip tone="ok" icon={Play}>
            Live
          </Chip>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={orch.paused} onChange={(v) => update(step.id, { paused: v })} label={`Pause ${name}`} />
          <span className="text-xs text-ink-2">Pause agent</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={orch.requireApproval} onChange={(v) => update(step.id, { requireApproval: v })} label={`Human approval required for ${name}`} />
          <span className="text-xs text-ink-2">Human approval required</span>
        </div>
      </div>
      <RoleSelect row={row} />
      <div className="grid grid-cols-3 gap-3">
        <NumField label={RANGES.maxRetries.label} value={orch.maxRetries} min={RANGES.maxRetries.min} max={RANGES.maxRetries.max} onCommit={(n) => update(step.id, { maxRetries: n })} />
        <NumField label={RANGES.timeoutSec.label} value={orch.timeoutSec} min={RANGES.timeoutSec.min} max={RANGES.timeoutSec.max} onCommit={(n) => update(step.id, { timeoutSec: n })} />
        <NumField label={RANGES.concurrency.label} value={orch.concurrency} min={RANGES.concurrency.min} max={RANGES.concurrency.max} onCommit={(n) => update(step.id, { concurrency: n })} />
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium text-ink-2">On failure</span>
        <Segmented label={`On failure for ${name}`} value={orch.onFailure} onChange={(v) => update(step.id, { onFailure: v })} options={FAILURE_OPTIONS} />
      </div>
    </Card>
  );
}

function AgentTable({ rows }: { rows: AgentRow[] }) {
  const update = useEval((s) => s.updateOrchestration);
  const th = "px-2 py-2 text-left text-xs font-medium text-muted";
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-250 border-collapse text-sm">
        <caption className="sr-only">Orchestration settings for each agent</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2">
            <th scope="col" className={`${th} pl-3`}>Agent</th>
            <th scope="col" className={th}>Paused</th>
            <th scope="col" className={th}>Human approval</th>
            <th scope="col" className={th}>Approver role</th>
            <th scope="col" className={th}>Max retries</th>
            <th scope="col" className={th}>Timeout (s)</th>
            <th scope="col" className={th}>On failure</th>
            <th scope="col" className={`${th} pr-3`}>Concurrency</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const { step, orch } = row;
            const name = step.agent;
            return (
              <tr key={step.id} className="align-top">
                <th scope="row" className="py-2 pl-3 pr-2 text-left font-normal">
                  <div className="flex items-center gap-2">
                    <StepBadge id={step.id} />
                    <span className="font-medium text-ink">{name}</span>
                  </div>
                </th>
                <td className="px-2 py-2">
                  <div className="flex min-h-10 items-center">
                    <Switch checked={orch.paused} onChange={(v) => update(step.id, { paused: v })} label={`Pause ${name}`} />
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex min-h-10 items-center">
                    <Switch checked={orch.requireApproval} onChange={(v) => update(step.id, { requireApproval: v })} label={`Human approval required for ${name}`} />
                  </div>
                </td>
                <td className="w-40 px-2 py-2">
                  <RoleSelect row={row} hideLabel />
                </td>
                <td className="w-24 px-2 py-2">
                  <NumField hideLabel label={`Max retries for ${name}`} value={orch.maxRetries} min={0} max={5} onCommit={(n) => update(step.id, { maxRetries: n })} />
                </td>
                <td className="w-24 px-2 py-2">
                  <NumField hideLabel label={`Timeout in seconds for ${name}`} value={orch.timeoutSec} min={10} max={600} onCommit={(n) => update(step.id, { timeoutSec: n })} />
                </td>
                <td className="px-2 py-2">
                  <div className="flex min-h-10 items-center">
                    <Segmented label={`On failure for ${name}`} value={orch.onFailure} onChange={(v) => update(step.id, { onFailure: v })} options={FAILURE_OPTIONS} />
                  </div>
                </td>
                <td className="w-24 py-2 pl-2 pr-3">
                  <NumField hideLabel label={`Concurrency for ${name}`} value={orch.concurrency} min={1} max={16} onCommit={(n) => update(step.id, { concurrency: n })} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function PauseAll({ rows }: { rows: AgentRow[] }) {
  const update = useEval((s) => s.updateOrchestration);
  const [confirm, setConfirm] = useState<"pause" | "resume" | null>(null);
  const paused = rows.filter((r) => r.orch.paused).length;

  const apply = (value: boolean) => {
    for (const r of rows) if (r.orch.paused !== value) update(r.step.id, { paused: value });
    setConfirm(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirm ? (
        <>
          <span className="text-sm text-ink-2" role="alert">
            {confirm === "pause" ? `Pause all ${rows.length} agents? New work will wait for humans.` : `Resume all ${paused} paused agents?`}
          </span>
          <Button variant={confirm === "pause" ? "danger" : "primary"} size="sm" onClick={() => apply(confirm === "pause")}>
            {confirm === "pause" ? "Yes, pause all" : "Yes, resume all"}
          </Button>
          <Button size="sm" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button variant="danger" size="sm" icon={Pause} disabled={paused === rows.length} onClick={() => setConfirm("pause")}>
            Pause all
          </Button>
          <Button size="sm" icon={Play} disabled={paused === 0} onClick={() => setConfirm("resume")}>
            Resume all
          </Button>
        </>
      )}
    </div>
  );
}

function EventBus() {
  const [selected, setSelected] = useState(DOMAIN_EVENTS.find((e) => e.name === "OrderAwarded")?.name ?? DOMAIN_EVENTS[0].name);
  const event = DOMAIN_EVENTS.find((e) => e.name === selected) ?? DOMAIN_EVENTS[0];
  const agentOf = (id: number) => STEPS.find((s) => s.id === id)?.agent ?? "Agent";

  return (
    <section aria-labelledby="bus-title" className="space-y-3">
      <div>
        <h3 id="bus-title" className="text-base font-semibold text-ink">
          Event bus
        </h3>
        <p className="text-sm text-muted">Agents publish domain events. Independent consumers react. Pick an event to see who receives it.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <ul className="space-y-2" role="radiogroup" aria-label="Domain events">
          {DOMAIN_EVENTS.map((e) => {
            const active = e.name === event.name;
            return (
              <li key={e.name}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(e.name)}
                  className={`w-full rounded-xl border p-3 text-left shadow-xs transition-colors ${active ? "border-accent bg-surface ring-1 ring-accent" : "border-line bg-surface hover:border-line-strong"}`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-ink">{e.name}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Chip tone="info" icon={Send}>
                        At least once
                      </Chip>
                      {e.deadLetter ? (
                        <Chip tone="warn" icon={Inbox}>
                          Dead letter queue
                        </Chip>
                      ) : null}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-ink-2">{e.description}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span>Producer</span>
                    <Chip tone="warn">
                      <span className="tabular-nums">{e.producerStep}</span> {agentOf(e.producerStep)}
                    </Chip>
                    <span className="ml-1">Consumers</span>
                    {e.consumerSteps.map((id) => (
                      <Chip key={id} tone="neutral">
                        <span className="tabular-nums">{id}</span> {agentOf(id)}
                      </Chip>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Card className="h-fit p-4 lg:sticky lg:top-20">
          <SectionTitle title={event.name} hint={`${event.consumerSteps.length} ${event.consumerSteps.length === 1 ? "consumer" : "consumers"} receive this event independently`} />
          <div className="mt-3" aria-live="polite">
            <EventFanOut key={event.name} event={event} />
          </div>
          <p className="mt-2 text-xs text-muted">If one consumer fails, the others are not affected. The failed delivery is retried on its own.</p>
        </Card>
      </div>
    </section>
  );
}

export default function OrchestrationTab() {
  const rows = useAgentRows();
  const paused = rows.filter((r) => r.orch.paused).length;

  return (
    <div className="space-y-8">
      <section aria-labelledby="runtime-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="runtime-title" className="text-base font-semibold text-ink">
              Runtime controls per agent
            </h3>
            <p aria-live="polite" className="text-sm tabular-nums text-muted">
              {rows.length - paused} live, {paused} paused. Changes apply to the next run.
            </p>
          </div>
          <PauseAll rows={rows} />
        </div>
        <div className="hidden xl:block">
          <AgentTable rows={rows} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
          {rows.map((r) => (
            <AgentCardRow key={r.step.id} row={r} />
          ))}
        </div>
      </section>

      <EventBus />

      <section aria-labelledby="policy-title" className="space-y-3">
        <h3 id="policy-title" className="text-base font-semibold text-ink">
          Delivery policy
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Callout tone="teal" icon={KeyRound} title="Idempotency keys on every event">
            Each event carries a key. A consumer that receives the same event twice does the work once.
          </Callout>
          <Callout tone="info" icon={RotateCcw} title="Retries with backoff">
            A failed delivery is retried with growing waits, up to the retry limit set for the agent above.
          </Callout>
          <Callout tone="warn" icon={Inbox} title="Dead letter queue a human can replay">
            An event that still fails goes to the dead letter queue. A person reads the reason, fixes it and replays the event.
          </Callout>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          A paused agent never loses work. Its events wait in the queue for a human to handle.
        </p>
      </section>
    </div>
  );
}
