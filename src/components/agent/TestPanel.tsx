import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, GitCompare, Play } from "lucide-react";
import AppLoader from "../common/AppLoader";
import { estimateTokens } from "../../studio/calc";
import type { AgentBody } from "../../studio/types";
import { Button, Callout, Card, Chip, SectionTitle, SimulatedTag, TextArea } from "../ui";
import { sideBySide } from "./diff";
import { humanize } from "./logic";
import { PromptView, StructuredOutput } from "./ResponseView";
import { sampleFor, simulate } from "./simulate";
import type { SimResult } from "./simulate";

interface Props {
  stepName: string;
  live: AgentBody;
  draft: AgentBody | null;
}

type Mode = "live" | "draft" | "compare";
type Outcome = { mode: "live" | "draft"; result: SimResult } | { mode: "compare"; live: SimResult; draft: SimResult };

function Checks({ checks }: { checks: SimResult["checks"] }) {
  const passed = checks.filter((c) => c.pass).length;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-2">
        Checks: {passed} of {checks.length} passed
      </p>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2 text-sm">
            {c.pass ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok-fg" aria-hidden="true" /> : <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg" aria-hidden="true" />}
            <div className="min-w-0">
              <span className="font-medium text-ink">{c.label}: </span>
              <span className={c.pass ? "font-medium text-ok-fg" : "font-medium text-danger-fg"}>{c.pass ? "pass" : "fail"}</span>
              <p className="text-xs text-muted">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metrics({ r }: { r: SimResult }) {
  return (
    <p className="text-xs tabular-nums text-muted">
      {r.tokens.toLocaleString("en-US")} tokens, {r.latencyMs.toLocaleString("en-US")} ms
    </p>
  );
}

function Prompt({ r }: { r: SimResult }) {
  return <PromptView prompt={r.prompt} tokens={estimateTokens(r.prompt)} />;
}

function SingleResult({ title, r }: { title: string; r: SimResult }) {
  return (
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SimulatedTag />
        <span className="text-sm font-semibold text-ink">{title}</span>
        <Metrics r={r} />
      </div>
      <Prompt r={r} />
      <div>
        <p className="mb-1 text-xs font-medium text-ink-2">Output</p>
        <StructuredOutput output={r.output} label={`${title} output`} />
      </div>
      <Checks checks={r.checks} />
    </Card>
  );
}

function Lines({ lines, tone }: { lines: { text: string; changed: boolean }[]; tone: "danger" | "ok" }) {
  const hi = tone === "danger" ? "bg-danger-soft text-danger-fg" : "bg-ok-soft text-ok-fg";
  return (
    <pre tabIndex={0} className="max-h-80 overflow-auto rounded-control border border-line bg-surface-2 py-2 font-mono text-xs leading-relaxed text-ink">
      {lines.map((l, i) => (
        <div key={i} className={`whitespace-pre-wrap break-words px-3 ${l.changed ? hi : ""}`}>
          {l.changed ? (tone === "danger" ? "- " : "+ ") : "  "}
          {l.text || " "}
        </div>
      ))}
    </pre>
  );
}

function CompareResult({ live, draft }: { live: SimResult; draft: SimResult }) {
  const { left, right } = sideBySide(live.output, draft.output);
  const changed = left.some((l) => l.changed) || right.some((l) => l.changed);
  return (
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SimulatedTag />
        <span className="text-sm font-semibold text-ink">Live compared with draft</span>
      </div>
      <p className="text-xs text-muted">{changed ? "Changed lines are marked. Removed lines are on the left, added lines on the right." : "Both versions produced the same output for these inputs."}</p>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="ok">Live</Chip>
            <Metrics r={live} />
          </div>
          <Lines lines={left} tone="danger" />
          <Checks checks={live.checks} />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="warn">Draft</Chip>
            <Metrics r={draft} />
          </div>
          <Lines lines={right} tone="ok" />
          <Checks checks={draft.checks} />
        </div>
      </div>
    </Card>
  );
}

export default function TestPanel({ stepName, live, draft }: Props) {
  const body = draft ?? live;
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<Mode | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const values: Record<string, string> = {};
  for (const v of body.variables) values[v] = edited[v] ?? sampleFor(v, stepName);

  const run = (mode: Mode) => {
    if (running) return;
    setRunning(mode);
    setOutcome(null);
    const delay = 600 + Math.round(Math.random() * 600);
    timer.current = window.setTimeout(() => {
      if (mode === "compare" && draft) setOutcome({ mode, live: simulate(live, values), draft: simulate(draft, values) });
      else if (mode === "draft" && draft) setOutcome({ mode, result: simulate(draft, values) });
      else setOutcome({ mode: "live", result: simulate(live, values) });
      setRunning(null);
    }, delay);
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Test the agent" hint="Fill in sample data, then run. Nothing is saved and no real AI call is made." action={<SimulatedTag />} />

      <Card className="space-y-3 p-3">
        {body.variables.length === 0 ? <p className="text-sm text-muted">This agent has no variables, so there is nothing to fill in.</p> : null}
        {body.variables.map((v) => {
          const value = values[v];
          return <TextArea key={v} label={humanize(v)} rows={value.length > 70 || value.includes("\n") ? 3 : 1} value={value} onChange={(e) => setEdited((p) => ({ ...p, [v]: e.target.value }))} className="resize-y text-sm" />;
        })}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={Play} disabled={!!running} onClick={() => run("live")}>
          Run with live version
        </Button>
        <Button icon={Play} disabled={!draft || !!running} onClick={() => run("draft")}>
          Run with draft
        </Button>
        <Button icon={GitCompare} disabled={!draft || !!running} onClick={() => run("compare")}>
          Compare
        </Button>
      </div>
      {!draft ? <p className="text-xs text-muted">Run with draft and Compare turn on after you edit something.</p> : null}

      <div aria-live="polite" aria-busy={!!running}>
        {running ? (
          <div className="flex items-center gap-2 rounded-control border border-line bg-surface-2 p-3 text-sm text-ink-2">
            <AppLoader variant="icon" size="xs" />
            Running a simulated test
          </div>
        ) : outcome ? (
          outcome.mode === "compare" ? (
            <CompareResult live={outcome.live} draft={outcome.draft} />
          ) : (
            <SingleResult title={outcome.mode === "live" ? "Live version" : "Draft"} r={outcome.result} />
          )
        ) : (
          <Callout tone="neutral">Results appear here. Run the test before you publish a change to the schema, model, autonomy or guardrails.</Callout>
        )}
      </div>
    </div>
  );
}
