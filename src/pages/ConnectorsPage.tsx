import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "../components/common/MaterialSymbol";
import ConnectorCard from "../components/connectors/ConnectorCard";
import { Callout, PageHeader, Segmented, Select, TextInput } from "../components/ui";
import { CATEGORIES, CONNECTORS } from "../data/connectors";
import type { CategoryId } from "../data/connectors";
import { STEPS } from "../data/steps";
import { useConnectors } from "../store/connectors";

type StatusFilter = "all" | "connected" | "available";

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="surface p-4">
      <div className="t-eyebrow">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

/**
 * Every external system ALAG agents can reach through MCP, grouped the way a job travels through the workflow.
 * Other screens can open it filtered to one step: window event alag:goto, detail { tab: "connectors", stepId }.
 */
export default function ConnectorsPage() {
  const connected = useConnectors((s) => s.connected);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [step, setStep] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onGoto = (e: Event) => {
      const d = (e as CustomEvent<{ tab?: string; stepId?: number }>).detail;
      if (d?.tab !== "connectors") return;
      setStatus("all");
      setCategory("all");
      setSearch("");
      setStep(d.stepId ?? null);
    };
    window.addEventListener("alag:goto", onGoto);
    return () => window.removeEventListener("alag:goto", onGoto);
  }, []);

  const stepCounts = useMemo(() => STEPS.map((s) => CONNECTORS.filter((c) => c.steps.includes(s.id)).length), []);
  const connectedCount = CONNECTORS.filter((c) => c.id in connected).length;
  const covered = STEPS.filter((s) => CONNECTORS.some((c) => c.id in connected && c.steps.includes(s.id))).length;
  const officialCount = CONNECTORS.filter((c) => c.mcp === "official").length;
  const adapterCount = CONNECTORS.filter((c) => c.mcp === "rest" || c.mcp === "community").length;

  const term = search.trim().toLowerCase();
  const visible = CONNECTORS.filter((c) => {
    if (status === "connected" && !(c.id in connected)) return false;
    if (status === "available" && c.id in connected) return false;
    if (category !== "all" && c.category !== category) return false;
    if (step !== null && !c.steps.includes(step)) return false;
    if (term && ![c.name, c.job, c.category, ...c.tools].some((f) => f.toLowerCase().includes(term))) return false;
    return true;
  });
  const groups = CATEGORIES.map((cat) => ({ cat, items: visible.filter((c) => c.category === cat.id) })).filter((g) => g.items.length > 0);

  return (
    <div className="page">
      <PageHeader
        title="Connectors"
        description="ALAG agents reach your other systems through MCP (Model Context Protocol) connectors, each with its own permissions and an audit trail. Connect your CRM, mailbox, files, ERP, payments and more, from the first lead to the last invoice."
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Connected" value={String(connectedCount)} sub={`of ${CONNECTORS.length} connectors`} />
        <Stat label="Steps covered" value={`${covered} of ${STEPS.length}`} sub="have a connected system" />
        <Stat label="Official MCP" value={String(officialCount)} sub="vendor-run servers, GA or documented" />
        <Stat label="Need an adapter" value={String(adapterCount)} sub="REST or community only" />
      </section>

      <section aria-label="Coverage by workflow step" className="surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="t-section">Coverage by workflow step</h2>
          <p className="text-xs text-muted">Pick a step to see every connector it can use.</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStep(active ? null : s.id)}
                className={`flex min-w-0 items-center gap-2 rounded-control border px-2.5 py-2 text-left transition-colors ${
                  active ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-line-strong"
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface text-2xs font-semibold tabular-nums text-ink-2 ring-1 ring-line">{s.id}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-ink">{s.short}</span>
                  <span className="block text-2xs tabular-nums text-muted">{stepCounts[i]} connectors</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Filters" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem_auto] md:items-end">
        <TextInput label="Search connectors" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, job or tool, for example HubSpot or purchase order" />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "all")}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        <Segmented<StatusFilter>
          label="Connection status"
          value={status}
          onChange={setStatus}
          options={[
            { id: "all", label: "All" },
            { id: "connected", label: "Connected" },
            { id: "available", label: "Available" },
          ]}
        />
      </section>

      {step !== null ? (
        <Callout tone="info" title={`Showing connectors for step ${step}: ${STEPS[step - 1].name}`}>
          <button type="button" onClick={() => setStep(null)} className="rounded-chip underline underline-offset-2 hover:no-underline">
            Show all steps
          </button>
        </Callout>
      ) : null}

      {groups.length === 0 ? (
        <Callout tone="neutral" title="No connectors match">
          Try a different search, category or status.
        </Callout>
      ) : (
        groups.map(({ cat, items }) => (
          <section key={cat.id} aria-labelledby={`cat-${cat.id}`} className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-surface-2 text-accent-fg ring-1 ring-line">
                <MaterialSymbol name={cat.symbol} className="text-xl" />
              </span>
              <div className="min-w-0">
                <h2 id={`cat-${cat.id}`} className="t-section">
                  {cat.label} <span className="text-xs font-normal tabular-nums text-muted">{items.length}</span>
                </h2>
                <p className="text-xs text-muted">{cat.blurb}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <ConnectorCard key={c.id} connector={c} />
              ))}
            </div>
          </section>
        ))
      )}

      <Callout tone="info" title="How to read the MCP labels">
        Official MCP means the vendor runs the server. Official, preview means it exists but can change. Community MCP means only third-party servers exist and ALAG labels them non-official. REST adapter means no MCP server exists, so ALAG wraps the vendor API as its own tool. Endpoints come from vendor docs read in November 2026. Re-check them before you hard-code anything.
      </Callout>
    </div>
  );
}
