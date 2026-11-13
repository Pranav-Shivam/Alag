import { Fragment } from "react";
import { Callout, Chip } from "../ui";
import type { Tone } from "../ui";
import CopyButton from "../common/CopyButton";
import { fieldLabel, humanize } from "./logic";

/* Readable views of an agent response. The raw text stays available, but it is never the first thing a person sees. */

type FieldOut = { value: string | number | boolean | null; confidence: number | null };
type Parsed = { summary?: string; fields?: Record<string, FieldOut>; needs_human?: string[]; status?: string };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  suggestion_only: { label: "Suggestion only", tone: "info" },
  awaiting_approval: { label: "Awaiting approval", tone: "warn" },
  completed: { label: "Completed", tone: "ok" },
};

function parse(output: string): Parsed | null {
  try {
    const v: unknown = JSON.parse(output);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Parsed) : null;
  } catch {
    return null;
  }
}

function Value({ value }: { value: FieldOut["value"] }) {
  if (value === null) return <span className="italic text-muted">Not found</span>;
  if (typeof value === "boolean") return <Chip tone={value ? "ok" : "neutral"}>{value ? "Yes" : "No"}</Chip>;
  if (typeof value === "number") return <span className="tabular-nums text-ink">{value.toLocaleString("en-US")}</span>;
  return <span className="break-words text-ink">{value}</span>;
}

function Confidence({ value, review }: { value: number | null; review: boolean }) {
  if (value === null) return <span className="text-muted">No reading</span>;
  return (
    <div className="flex items-center gap-2">
      <div role="meter" aria-label="Confidence" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${review ? "bg-warn-solid" : "bg-ok-solid"}`} style={{ width: `${value}%` }} />
      </div>
      <span className="tabular-nums text-xs text-ink-2">{value}%</span>
    </div>
  );
}

/** Structured view of a JSON agent response. Falls back to plain text when the output is not JSON. */
export function StructuredOutput({ output, label }: { output: string; label: string }) {
  const data = parse(output);
  if (!data) {
    return (
      <pre tabIndex={0} aria-label={label} className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-control border border-line bg-surface-2 p-3 text-sm leading-relaxed text-ink">
        {output}
      </pre>
    );
  }

  const status = data.status ? (STATUS[data.status] ?? { label: humanize(data.status), tone: "neutral" as Tone }) : null;
  const needs = data.needs_human ?? [];
  const rows = Object.entries(data.fields ?? {});

  return (
    <div aria-label={label} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {status ? <Chip tone={status.tone}>{status.label}</Chip> : <span />}
        <CopyButton text={output} label="Copy JSON" what="Response" />
      </div>

      {data.summary ? <p className="text-sm leading-relaxed text-ink">{data.summary}</p> : null}

      {needs.length > 0 ? (
        <Callout tone="warn" title={`${needs.length} ${needs.length === 1 ? "field needs" : "fields need"} a person to check`}>
          {needs.map(fieldLabel).join(", ")}
        </Callout>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-control border border-line">
          <table className="w-full text-left text-sm">
            <thead className="table-head border-b border-line bg-surface-2">
              <tr>
                <th scope="col" className="px-3 py-2">Field</th>
                <th scope="col" className="px-3 py-2">Value</th>
                <th scope="col" className="px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(([name, f]) => {
                const review = needs.includes(name);
                return (
                  <tr key={name}>
                    <th scope="row" className="px-3 py-2 font-medium text-ink-2">
                      {fieldLabel(name)}
                      {review ? <Chip tone="warn" className="ml-2">Check</Chip> : null}
                    </th>
                    <td className="px-3 py-2"><Value value={f.value} /></td>
                    <td className="px-3 py-2"><Confidence value={f.confidence} review={review} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <details className="rounded-control border border-line bg-surface-2">
        <summary className="min-h-9 cursor-pointer select-none px-3 py-2 text-xs font-medium text-ink-2">Raw JSON</summary>
        <pre tabIndex={0} className="max-h-64 overflow-auto border-t border-line p-3 font-mono text-xs leading-relaxed text-ink">{output}</pre>
      </details>
    </div>
  );
}

const TOKEN = /(\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\})/g;

/** Text with any `{{variable}}` that is still unfilled shown as a warning chip instead of plain braces. */
export function HighlightedText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-chip border border-warn-line bg-warn-soft px-1 font-mono text-xs text-warn-fg" title="This variable has no value">
            {part.replace(/[{}\s]/g, "")}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const SECTION = /^(SYSTEM|EXTRACTION RULES|INSTRUCTION)$/m;
const SECTION_LABEL: Record<string, string> = { SYSTEM: "System", "EXTRACTION RULES": "Extraction rules", INSTRUCTION: "Instruction" };

/** A rendered prompt split into its labelled sections, with unfilled variables flagged. */
export function PromptView({ prompt, tokens }: { prompt: string; tokens: number }) {
  const parts = prompt.split(SECTION);
  const sections: { label: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) sections.push({ label: SECTION_LABEL[parts[i]] ?? parts[i], body: parts[i + 1].trim() });
  const unfilled = new Set([...prompt.matchAll(TOKEN)].map((m) => m[0])).size;

  return (
    <details className="rounded-control border border-line bg-surface-2">
      <summary className="flex min-h-9 cursor-pointer select-none flex-wrap items-center gap-2 px-3 py-2 text-xs font-medium text-ink-2">
        Rendered prompt, about {tokens} tokens
        {unfilled > 0 ? <Chip tone="warn">{unfilled} unfilled {unfilled === 1 ? "variable" : "variables"}</Chip> : null}
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        <div className="flex justify-end">
          <CopyButton text={prompt} label="Copy prompt" what="Prompt" />
        </div>
        {(sections.length ? sections : [{ label: "Prompt", body: prompt }]).map((s) => (
          <section key={s.label}>
            <h4 className="table-head mb-1">{s.label}</h4>
            <p className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
              <HighlightedText text={s.body} />
            </p>
          </section>
        ))}
      </div>
    </details>
  );
}
