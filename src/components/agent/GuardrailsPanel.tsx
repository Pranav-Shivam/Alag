import { Lock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { AgentBody } from "../../studio/types";
import { Button, Callout, Card, SectionTitle, Switch, TextArea } from "../ui";

interface Props {
  body: AgentBody;
  update: (patch: Partial<AgentBody>) => void;
}

const LOCK_NOTE = "Locked: only an admin can change this";

export default function GuardrailsPanel({ body, update }: Props) {
  const { guardrails, tools } = body;

  const addGuardrail = () => update({ guardrails: [...guardrails, { id: `g-${Date.now().toString(36)}-${guardrails.length}`, text: "", locked: false }] });
  const patchGuardrail = (id: string, text: string) => update({ guardrails: guardrails.map((g) => (g.id === id ? { ...g, text } : g)) });
  const removeGuardrail = (id: string) => update({ guardrails: guardrails.filter((g) => g.id !== id) });
  const toggleTool = (id: string, enabled: boolean) => update({ tools: tools.map((t) => (t.id === id ? { ...t, enabled } : t)) });

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="guardrails-heading">
        <div id="guardrails-heading">
          <SectionTitle title="Guardrails" hint="Plain rules the agent must never break. They are added to every request." />
        </div>

        {guardrails.length === 0 ? <p className="text-sm text-muted">No guardrails yet.</p> : null}

        <ul className="space-y-2">
          {guardrails.map((g) =>
            g.locked ? (
              <li key={g.id}>
                <Card as="div" className="flex items-start gap-3 bg-surface-2 p-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{g.text}</p>
                    <p className="mt-0.5 text-xs text-muted">{LOCK_NOTE}</p>
                  </div>
                </Card>
              </li>
            ) : (
              <li key={g.id}>
                <Card as="div" className="p-3">
                  <TextArea label="Guardrail rule" rows={2} value={g.text} onChange={(e) => patchGuardrail(g.id, e.target.value)} placeholder="Never send an email to a customer." />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeGuardrail(g.id)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              </li>
            ),
          )}
        </ul>

        <Button icon={Plus} onClick={addGuardrail}>
          Add guardrail
        </Button>
      </section>

      <section className="space-y-3" aria-labelledby="tools-heading">
        <div id="tools-heading">
          <SectionTitle title="Tool permissions" hint="What the agent is allowed to read or do outside the conversation." />
        </div>

        <Callout tone="info" icon={ShieldCheck} title="Least privilege">
          Turn on only the tools this step really needs. A tool that is off cannot be used, even by mistake.
        </Callout>

        {tools.length === 0 ? <p className="text-sm text-muted">This agent has no tools.</p> : null}

        <ul className="space-y-2">
          {tools.map((t) => (
            <li key={t.id}>
              <Card as="div" className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="break-all font-mono text-xs font-semibold text-ink">{t.name}</span>
                    {t.locked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        {LOCK_NOTE}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2">{t.description}</p>
                  <p className="mt-0.5 text-xs text-muted">{t.enabled ? "On" : "Off"}</p>
                </div>
                <Switch checked={t.enabled} onChange={(v) => toggleTool(t.id, v)} label={`${t.name}${t.locked ? ", locked" : ""}`} disabled={t.locked} />
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
