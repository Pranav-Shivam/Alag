import { useId, useRef, useState } from "react";
import type { Ref } from "react";
import { Plus, TriangleAlert, X } from "lucide-react";
import { estimateTokens } from "../../studio/calc";
import type { AgentBody } from "../../studio/types";
import { Button, Card, Chip, SectionTitle, TONE, TextInput } from "../ui";
import { toSnakeCase, unknownVariables, usedVariables } from "./logic";
import { FIELD_MONO } from "./styles";

interface Props {
  body: AgentBody;
  live: AgentBody;
  update: (patch: Partial<AgentBody>) => void;
}

function PromptField({
  label,
  hint,
  value,
  onChange,
  rows,
  edited,
  taRef,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  edited: boolean;
  taRef?: Ref<HTMLTextAreaElement>;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-ink-2">
          {label}
        </label>
        {edited ? <Chip tone="warn">Edited</Chip> : null}
      </div>
      <textarea
        id={id}
        ref={taRef}
        rows={rows}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-hint ${id}-count`}
        className={`${FIELD_MONO} resize-y`}
      />
      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 text-xs text-muted">
        <p id={`${id}-hint`} className="min-w-0 flex-1 basis-56">
          {hint}
        </p>
        <p id={`${id}-count`} className="tabular-nums">
          About {estimateTokens(value)} tokens, {value.length} characters
        </p>
      </div>
    </div>
  );
}

export default function PromptsPanel({ body, live, update }: Props) {
  const instructionRef = useRef<HTMLTextAreaElement>(null);
  const [newVar, setNewVar] = useState("");

  const used = usedVariables(body);
  const unknown = unknownVariables(body);
  const instructionVars = new Set(used);

  const insert = (name: string) => {
    const el = instructionRef.current;
    const token = `{{${name}}}`;
    const start = el?.selectionStart ?? body.instruction.length;
    const end = el?.selectionEnd ?? start;
    update({ instruction: body.instruction.slice(0, start) + token + body.instruction.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const addVariable = (raw: string) => {
    const name = toSnakeCase(raw);
    if (!name || /^[0-9]/.test(name) || body.variables.includes(name)) return;
    update({ variables: [...body.variables, name] });
  };

  const removeVariable = (name: string) => update({ variables: body.variables.filter((v) => v !== name) });

  const newVarClean = toSnakeCase(newVar);
  const newVarError = newVarClean && body.variables.includes(newVarClean) ? "That variable already exists." : undefined;

  return (
    <div className="space-y-4">
      <PromptField
        label="System prompt"
        hint="Who the agent is and the rules it always follows. It is sent before every request."
        value={body.systemPrompt}
        onChange={(v) => update({ systemPrompt: v })}
        rows={6}
        edited={body.systemPrompt !== live.systemPrompt}
      />

      <PromptField
        label="Instruction"
        hint="The task for one run. Use variables like {{email_body}} where the real data should go."
        value={body.instruction}
        onChange={(v) => update({ instruction: v })}
        rows={9}
        edited={body.instruction !== live.instruction}
        taRef={instructionRef}
      />

      <Card className="p-3">
        <SectionTitle title="Variables" hint="Click a variable to put it at the cursor in the instruction. These are filled in from the quotation when the agent runs." />
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Variables">
          {body.variables.map((v) => {
            const isUsed = instructionVars.has(v);
            return (
              <li key={v} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => insert(v)}
                  aria-label={`Insert ${v} into the instruction${isUsed ? "" : ". Not used in any prompt yet"}`}
                  className={`min-h-8 border px-2.5 font-mono text-xs transition-colors hover:brightness-95 ${
                    isUsed ? `${TONE.neutral} rounded-full` : "rounded-l-full border-r-0 border-dashed border-line-strong bg-transparent text-muted hover:bg-surface-2"
                  }`}
                >
                  {`{{${v}}}`}
                </button>
                {!isUsed ? (
                  <button
                    type="button"
                    onClick={() => removeVariable(v)}
                    aria-label={`Remove variable ${v}`}
                    className="inline-flex min-h-8 items-center rounded-r-full border border-l-0 border-dashed border-line-strong px-2 text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
          {unknown.map((v) => (
            <li key={`unknown-${v}`}>
              <button
                type="button"
                onClick={() => update({ variables: [...body.variables, v] })}
                aria-label={`${v} is used in a prompt but is not in the variables list. Add it to the list`}
                className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 font-mono text-xs hover:brightness-95 ${TONE.warn}`}
              >
                <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                {`{{${v}}}`}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {unknown.length > 0
            ? "Warning chips are used in a prompt but missing from the list. Click one to add it, or the agent will receive an empty value."
            : "Dashed chips are not used in any prompt yet. Remove them or add them to the instruction."}
        </p>
        <form
          className="mt-3 flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addVariable(newVar);
            setNewVar("");
          }}
        >
          <div className="min-w-0 flex-1">
            <TextInput label="New variable" placeholder="customer_budget" value={newVar} onChange={(e) => setNewVar(e.target.value)} error={newVarError} hint="Lowercase letters, numbers and underscores." />
          </div>
          <Button type="submit" icon={Plus} className="mt-5" disabled={!newVarClean || !!newVarError}>
            Add
          </Button>
        </form>
      </Card>

      {live.extractionPrompt !== undefined ? (
        <PromptField
          label="Extraction prompt"
          hint="Extra rules for reading documents and drawings, such as units, handwriting and wood names."
          value={body.extractionPrompt ?? ""}
          onChange={(v) => update({ extractionPrompt: v })}
          rows={9}
          edited={(body.extractionPrompt ?? "") !== live.extractionPrompt}
        />
      ) : null}
    </div>
  );
}
