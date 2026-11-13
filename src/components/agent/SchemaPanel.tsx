import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Plus, Trash2 } from "lucide-react";
import type { AgentBody, SchemaField } from "../../studio/types";
import { Button, Callout, Card, Segmented, Select, Switch, TextArea, TextInput } from "../ui";
import { NumberField } from "./NumberField";
import { duplicateNames, jsonSchemaOf, toSnakeCase } from "./logic";

interface Props {
  body: AgentBody;
  update: (patch: Partial<AgentBody>) => void;
}

const TYPES: { id: SchemaField["type"]; label: string }[] = [
  { id: "string", label: "Text" },
  { id: "number", label: "Number" },
  { id: "boolean", label: "Yes or no" },
  { id: "enum", label: "One of a list" },
  { id: "date", label: "Date" },
];

export default function SchemaPanel({ body, update }: Props) {
  const [view, setView] = useState<"form" | "json">("form");
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const schema = body.schema;
  const dups = duplicateNames(schema);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const patch = (i: number, p: Partial<SchemaField>) => update({ schema: schema.map((f, k) => (k === i ? { ...f, ...p } : f)) });
  const remove = (i: number) => update({ schema: schema.filter((_, k) => k !== i) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= schema.length) return;
    const next = [...schema];
    [next[i], next[j]] = [next[j], next[i]];
    update({ schema: next });
  };
  const add = () => {
    let n = schema.length + 1;
    while (schema.some((f) => f.name === `new_field_${n}`)) n++;
    update({ schema: [...schema, { id: `f-${Date.now().toString(36)}-${n}`, name: `new_field_${n}`, type: "string", required: false, description: "" }] });
  };

  const json = JSON.stringify(jsonSchemaOf(schema), null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="t-label">Output schema</h3>
          <p className="mt-0.5 text-xs text-muted">The fields the agent must return, every time.</p>
        </div>
        <Segmented
          label="Schema view"
          value={view}
          onChange={setView}
          options={[
            { id: "form", label: "Form" },
            { id: "json", label: "JSON" },
          ]}
        />
      </div>

      <Callout tone="info" title="Each description is part of the prompt">
        The text you write under Extraction instruction is sent to the model with its field. Clear, specific wording here improves accuracy more than anything else.
      </Callout>

      {view === "json" ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
            <span className="text-xs font-medium text-ink-2">Generated JSON Schema, read only</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ok-fg" role="status" aria-live="polite">
                {copied ? "Copied" : ""}
              </span>
              <Button size="sm" icon={copied ? Check : Copy} onClick={copy}>
                Copy
              </Button>
            </div>
          </div>
          <pre tabIndex={0} aria-label="JSON Schema" className="max-h-96 overflow-auto p-3 font-mono text-xs leading-relaxed text-ink">
            {json}
          </pre>
        </Card>
      ) : (
        <>
          {schema.length === 0 ? (
            <Callout tone="neutral" title="No fields yet">
              This agent returns free text. Add a field to make it return structured data.
            </Callout>
          ) : null}

          <ol className="space-y-3">
            {schema.map((f, i) => {
              const nameTrim = f.name.trim();
              const error = !nameTrim ? "Give this field a name." : dups.includes(nameTrim) ? "Another field already uses this name." : undefined;
              return (
                <li key={f.id}>
                  <Card className="p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink-2">Field {i + 1}</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" icon={ArrowUp} aria-label={`Move field ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} />
                        <Button size="sm" variant="ghost" icon={ArrowDown} aria-label={`Move field ${i + 1} down`} disabled={i === schema.length - 1} onClick={() => move(i, 1)} />
                        <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Remove field ${nameTrim || i + 1}`} onClick={() => remove(i)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 @md:grid-cols-[minmax(0,1fr)_10rem]">
                      <TextInput
                        label="Field name"
                        value={f.name}
                        onChange={(e) => patch(i, { name: toSnakeCase(e.target.value) })}
                        error={error}
                        aria-invalid={!!error}
                        className="font-mono"
                        hint="snake_case, for example length_in"
                      />
                      <Select label="Type" value={f.type} onChange={(e) => patch(i, { type: e.target.value as SchemaField["type"] })}>
                        {TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="mt-3">
                      <TextArea
                        label="Extraction instruction"
                        rows={2}
                        value={f.description}
                        onChange={(e) => patch(i, { description: e.target.value })}
                        hint="How the agent should find this value. Say what to do when it is missing."
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                      <div className="w-44 max-w-full">
                        <NumberField
                          label="Confidence threshold (%)"
                          value={f.threshold}
                          min={0}
                          max={100}
                          step={1}
                          allowEmpty
                          placeholder={`${body.confidenceThreshold} (agent default)`}
                          onCommit={(n) => patch(i, { threshold: n })}
                        />
                      </div>
                      <div className="flex min-h-10 items-center gap-2">
                        <span className="text-sm text-ink-2">Required</span>
                        <Switch checked={f.required} onChange={(v) => patch(i, { required: v })} label={`Required: ${nameTrim || `field ${i + 1}`}`} />
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>

          <Button icon={Plus} onClick={add}>
            Add field
          </Button>
        </>
      )}
    </div>
  );
}
