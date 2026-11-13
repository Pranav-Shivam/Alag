import { extractVariables } from "../../studio/calc";
import type { AgentBody, SchemaField } from "../../studio/types";

export function promptTexts(b: AgentBody): string[] {
  return [b.systemPrompt, b.instruction, b.extractionPrompt ?? ""];
}

/** Variables used anywhere in the prompts, in order of first use. */
export function usedVariables(b: AgentBody): string[] {
  const out: string[] = [];
  for (const t of promptTexts(b)) for (const v of extractVariables(t)) if (!out.includes(v)) out.push(v);
  return out;
}

export function unknownVariables(b: AgentBody): string[] {
  return usedVariables(b).filter((v) => !b.variables.includes(v));
}

export function duplicateNames(schema: SchemaField[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const f of schema) {
    const n = f.name.trim();
    if (!n) continue;
    if (seen.has(n)) dup.add(n);
    seen.add(n);
  }
  return [...dup];
}

/** Problems that block publishing. Empty array means the draft is valid. */
export function validate(b: AgentBody): string[] {
  const out: string[] = [];
  if (!b.systemPrompt.trim()) out.push("The system prompt is empty.");
  if (!b.instruction.trim()) out.push("The instruction is empty.");
  const dup = duplicateNames(b.schema);
  if (dup.length) out.push(`Two schema fields share a name: ${dup.join(", ")}.`);
  if (b.schema.some((f) => !f.name.trim())) out.push("A schema field has no name.");
  const unknown = unknownVariables(b);
  if (unknown.length) out.push(`Used in a prompt but not in the variables list: ${unknown.join(", ")}.`);
  if (b.guardrails.some((g) => !g.text.trim())) out.push("A guardrail is empty. Write the rule or remove it.");
  return out;
}

const SAME = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface ChangedSection {
  label: string;
  risky: boolean;
}

/** Which parts of the agent differ between the live version and the draft. */
export function changedSections(live: AgentBody, draft: AgentBody): ChangedSection[] {
  const out: ChangedSection[] = [];
  const check = (label: string, risky: boolean, a: unknown, b: unknown) => {
    if (!SAME(a, b)) out.push({ label, risky });
  };
  check("System prompt", false, live.systemPrompt, draft.systemPrompt);
  check("Instruction", false, live.instruction, draft.instruction);
  check("Extraction prompt", false, live.extractionPrompt, draft.extractionPrompt);
  check("Variables", false, live.variables, draft.variables);
  check("Output schema", true, live.schema, draft.schema);
  check("Guardrails", true, live.guardrails, draft.guardrails);
  check("Tool permissions", true, live.tools, draft.tools);
  check("Model", true, live.model, draft.model);
  check("Temperature", false, live.temperature, draft.temperature);
  check("Autonomy", true, live.autonomy, draft.autonomy);
  check("Confidence threshold", false, live.confidenceThreshold, draft.confidenceThreshold);
  return out;
}

const JSON_TYPE: Record<SchemaField["type"], Record<string, string>> = {
  string: { type: "string" },
  number: { type: "number" },
  boolean: { type: "boolean" },
  enum: { type: "string" },
  date: { type: "string", format: "date" },
};

/** The JSON Schema a developer would hand to the model for structured output. */
export function jsonSchemaOf(schema: SchemaField[]): object {
  const properties: Record<string, object> = {};
  const required: string[] = [];
  for (const f of schema) {
    const name = f.name.trim();
    if (!name) continue;
    properties[name] = { ...JSON_TYPE[f.type], ...(f.description.trim() ? { description: f.description.trim() } : {}) };
    if (f.required) required.push(name);
  }
  return { type: "object", properties, required, additionalProperties: false };
}

export function toSnakeCase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Label for a schema field name. A unit suffix becomes a bracketed unit, so length_in reads "Length (in)". */
export function fieldLabel(name: string): string {
  const m = name.match(/^(.+)_(in|ft|mm|cm)$/);
  return m ? `${humanize(m[1])} (${m[2]})` : humanize(name);
}

export function humanize(name: string): string {
  const s = name.replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
