import { useMemo, useState } from "react";
import { Check, Download, ExternalLink, Lock, Pencil, Plus, ScrollText, Trash2, X } from "lucide-react";
import { Button, Callout, Card, Chip, ConfidenceMeter, SectionTitle, Segmented, Select, TextArea, TextInput } from "../ui";
import StepBadge from "./StepBadge";
import { METHOD_LABEL, SEVERITY_LABEL, goto, useAgentRows } from "./shared";
import type { JudgeMethod, Severity, SpecRule } from "../../studio/evalTypes";
import { useEval } from "../../studio/evalStore";
import { STEPS } from "../../data/steps";

const SEVERITY_OPTIONS: { id: Severity; label: string }[] = [
  { id: "critical", label: "Critical" },
  { id: "standard", label: "Standard" },
];
const METHOD_OPTIONS: { id: JudgeMethod; label: string }[] = [
  { id: "deterministic", label: "Code check" },
  { id: "llm_judge", label: "LLM judge" },
];

interface RuleStat {
  pass: number;
  warn: number;
  fail: number;
  judged: number;
}

function RuleEditorFields({
  title,
  text,
  severity,
  method,
  onChange,
  errors,
}: {
  title: string;
  text: string;
  severity: Severity;
  method: JudgeMethod;
  onChange: (patch: Partial<{ title: string; text: string; severity: Severity; method: JudgeMethod }>) => void;
  errors: { title?: string; text?: string };
}) {
  return (
    <div className="space-y-3">
      <TextInput label="Rule title" value={title} onChange={(e) => onChange({ title: e.target.value })} error={errors.title} maxLength={120} />
      <TextArea label="Rule text" rows={3} value={text} onChange={(e) => onChange({ text: e.target.value })} error={errors.text} />
      <div className="flex flex-wrap gap-4">
        <div>
          <span className="mb-1 block text-xs font-medium text-ink-2">Severity</span>
          <Segmented label="Severity" value={severity} onChange={(v) => onChange({ severity: v })} options={SEVERITY_OPTIONS} />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-ink-2">How it is checked</span>
          <Segmented label="How it is checked" value={method} onChange={(v) => onChange({ method: v })} options={METHOD_OPTIONS} />
        </div>
      </div>
    </div>
  );
}

function RuleCard({ rule, stat }: { rule: SpecRule; stat: RuleStat }) {
  const updateRule = useEval((s) => s.updateRule);
  const removeRule = useEval((s) => s.removeRule);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState({ title: rule.title, text: rule.text, severity: rule.severity, method: rule.method });
  const [errors, setErrors] = useState<{ title?: string; text?: string }>({});

  const startEdit = () => {
    setDraft({ title: rule.title, text: rule.text, severity: rule.severity, method: rule.method });
    setErrors({});
    setEditing(true);
  };
  const save = () => {
    const next = { title: draft.title.trim(), text: draft.text.trim() };
    const e: { title?: string; text?: string } = {};
    if (!next.title) e.title = "Give the rule a short title.";
    if (!next.text) e.text = "Write the full rule.";
    setErrors(e);
    if (e.title || e.text) return;
    updateRule(rule.id, { ...next, severity: draft.severity, method: draft.method });
    setEditing(false);
  };

  const passPct = stat.judged === 0 ? null : Math.round((stat.pass / stat.judged) * 100);

  return (
    <Card as="article" className="p-4">
      {editing ? (
        <div className="space-y-3">
          <RuleEditorFields {...draft} errors={errors} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" icon={Check} onClick={save}>
              Save rule
            </Button>
            <Button size="sm" icon={X} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted">Saving changes how future runs are scored. Past runs keep their verdicts.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="min-w-0 flex-1 text-sm font-semibold text-ink">{rule.title}</h4>
            <div className="flex flex-wrap gap-1.5">
              <Chip tone={rule.severity === "critical" ? "danger" : "neutral"}>{SEVERITY_LABEL[rule.severity]}</Chip>
              <Chip tone="info">{METHOD_LABEL[rule.method]}</Chip>
              {rule.locked ? (
                <Chip tone="neutral" icon={Lock}>
                  Locked
                </Chip>
              ) : null}
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{rule.text}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Recent pass rate</span>
              {passPct === null ? <span className="text-xs text-muted">No judged runs</span> : <ConfidenceMeter pct={passPct} />}
            </div>
            <span className="text-xs tabular-nums text-muted">
              {stat.fail} {stat.fail === 1 ? "failure" : "failures"}, {stat.warn} {stat.warn === 1 ? "warning" : "warnings"}, {stat.judged} judged
            </span>
            <button
              type="button"
              onClick={() => goto({ tab: "evaluation", ruleId: rule.id })}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg underline-offset-2 hover:underline"
            >
              Show failing runs
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          {rule.locked ? (
            <p className="mt-2 text-xs text-muted">Locked rules are read only. Only an admin could change this one.</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="text-xs text-danger-fg" role="alert">
                    Remove this rule? The judge will stop scoring it.
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => {
                      removeRule(rule.id);
                      setConfirming(false);
                    }}
                  >
                    Yes, remove rule
                  </Button>
                  <Button size="sm" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" icon={Pencil} onClick={startEdit}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirming(true)}>
                    Remove
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function AddRuleForm({ stepId, agentName }: { stepId: number; agentName: string }) {
  const addRule = useEval((s) => s.addRule);
  const [form, setForm] = useState<{ title: string; text: string; severity: Severity; method: JudgeMethod }>({ title: "", text: "", severity: "standard", method: "llm_judge" });
  const [errors, setErrors] = useState<{ title?: string; text?: string }>({});
  const [added, setAdded] = useState<string | null>(null);

  const submit = () => {
    const title = form.title.trim();
    const text = form.text.trim();
    const e: { title?: string; text?: string } = {};
    if (!title) e.title = "Give the rule a short title.";
    if (!text) e.text = "Write the full rule.";
    setErrors(e);
    if (e.title || e.text) return;
    addRule({ stepId, title, text, severity: form.severity, method: form.method, locked: false });
    setAdded(title);
    setForm({ title: "", text: "", severity: "standard", method: "llm_judge" });
  };

  return (
    <Card className="p-4">
      <SectionTitle title={`Add a rule for ${agentName}`} hint="New rules take part in scoring from the next run" />
      <div className="mt-3 space-y-3">
        <RuleEditorFields {...form} errors={errors} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={Plus} onClick={submit}>
            Add rule
          </Button>
          <span aria-live="polite" className="text-xs text-ok-fg">
            {added ? `Added: ${added}` : ""}
          </span>
        </div>
      </div>
    </Card>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Plain markdown. Hash headings and dashes only. */
function buildMarkdown(agentName: string, stepId: number, rules: SpecRule[]): string {
  const lines = [`# ${agentName} Behavior Spec`, "", `Step: ${stepId}`, `Rules: ${rules.length}`, `Critical rules: ${rules.filter((r) => r.severity === "critical").length}`, ""];
  for (const r of rules) {
    lines.push(`## ${r.title}`, "", `- Severity: ${SEVERITY_LABEL[r.severity]}`, `- Method: ${METHOD_LABEL[r.method]}`, `- Locked: ${r.locked ? "Yes" : "No"}`, `- Rule: ${r.text}`, "");
  }
  return lines.join("\n");
}

function exportSpec(agentName: string, stepId: number, rules: SpecRule[]) {
  const blob = new Blob([buildMarkdown(agentName, stepId, rules)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `behavior-spec-${slug(agentName)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BehaviorSpecsTab({ stepId, onStepChange }: { stepId: number; onStepChange: (id: number) => void }) {
  const rows = useAgentRows();
  const runs = useEval((s) => s.runs);
  const row = rows.find((r) => r.step.id === stepId) ?? rows[0];
  const step = row.step;

  const stats = useMemo(() => {
    const map = new Map<string, RuleStat>();
    for (const run of runs) {
      if (run.stepId !== step.id) continue;
      for (const c of run.checks) {
        const s = map.get(c.ruleId) ?? { pass: 0, warn: 0, fail: 0, judged: 0 };
        if (c.verdict === "na") continue;
        s.judged += 1;
        if (c.verdict === "pass") s.pass += 1;
        else if (c.verdict === "warn") s.warn += 1;
        else s.fail += 1;
        map.set(c.ruleId, s);
      }
    }
    return map;
  }, [runs, step.id]);

  return (
    <div className="space-y-4">
      <Callout tone="info" icon={ScrollText} title="This is exactly what the judge scores against">
        Every rule here is checked on every run, either by code or by an LLM judge. Editing a rule changes future scores, and so the trust ladder. Locked rules are read only.
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <Select label="Agent" value={step.id} onChange={(e) => onStepChange(Number(e.target.value))}>
            {STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.agent}
              </option>
            ))}
          </Select>
        </div>
        <nav aria-label="Agents" className="hidden lg:block">
          <ul className="sticky top-32 space-y-1">
            {rows.map((r) => {
              const active = r.step.id === step.id;
              return (
                <li key={r.step.id}>
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => onStepChange(r.step.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                      active ? "border-line bg-surface font-medium text-ink shadow-xs ring-1 ring-line" : "border-transparent text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <StepBadge id={r.step.id} />
                    <span className="min-w-0 flex-1 truncate">{r.step.agent}</span>
                    <span className="text-xs tabular-nums text-muted">{r.rules.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ink">{step.agent}</h3>
              <p aria-live="polite" className="text-xs tabular-nums text-muted">
                {row.rules.length} {row.rules.length === 1 ? "rule" : "rules"}, {row.critical} critical
              </p>
            </div>
            <Button icon={Download} onClick={() => exportSpec(step.agent, step.id, row.rules)} disabled={row.rules.length === 0}>
              Export Behavior Spec
            </Button>
          </div>

          {row.rules.length === 0 ? (
            <Card className="p-4 text-sm text-muted">No rules written for this agent yet. Add the first one below.</Card>
          ) : (
            <ul className="space-y-3">
              {row.rules.map((r) => (
                <li key={r.id}>
                  <RuleCard rule={r} stat={stats.get(r.id) ?? { pass: 0, warn: 0, fail: 0, judged: 0 }} />
                </li>
              ))}
            </ul>
          )}

          <AddRuleForm key={step.id} stepId={step.id} agentName={step.agent} />
        </div>
      </div>
    </div>
  );
}
