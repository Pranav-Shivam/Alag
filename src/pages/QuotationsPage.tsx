import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronRight, CircleX, FileSearch, Files, Loader, Search, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NeedsAttention, OutcomeBadge, StepStrip } from "../components/Badges";
import { currentStepLabel, formatDate, formatUSD } from "../lib/status";
import type { Outcome, Quotation } from "../types";

interface Props {
  quotations: Quotation[];
  selectedId: string | null;
  onOpen: (id: string) => void;
}

type Filter = "all" | Outcome;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In progress" },
  { id: "awarded", label: "Awarded" },
  { id: "rejected", label: "Rejected" },
];

function Tile({
  label,
  value,
  sub,
  Icon,
  iconClass,
}: {
  label: string;
  value: string;
  sub?: string;
  Icon: LucideIcon;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
        <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg " + iconClass}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

function rowKeyDown(e: KeyboardEvent, open: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    open();
  }
}

function Money({ value, className = "" }: { value: number; className?: string }) {
  if (value > 0) {
    return <span className={"tabular-nums " + className}>{formatUSD(value)}</span>;
  }
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="tabular-nums text-muted" aria-hidden="true">
        {"–"}
      </span>
      <span className="text-xs font-normal text-muted">
        <span className="sr-only">Not priced. </span>Estimate pending
      </span>
    </span>
  );
}

function Note({ q }: { q: Quotation }) {
  if (q.outcome === "rejected" && q.rejectReason) {
    return <div className="mt-1.5 text-xs text-danger-fg">{q.rejectReason}</div>;
  }
  if (q.blocked) {
    return (
      <div className="mt-2 space-y-1">
        <NeedsAttention reason={q.blockedReason} />
        {q.blockedReason ? <div className="text-xs text-alert-fg">{q.blockedReason}</div> : null}
      </div>
    );
  }
  return null;
}

export default function QuotationsPage({ quotations, selectedId, onOpen }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const inProgress = quotations.filter((q) => q.outcome === "in_progress").length;
    const awardedList = quotations.filter((q) => q.outcome === "awarded");
    const rejected = quotations.filter((q) => q.outcome === "rejected").length;
    const decided = awardedList.length + rejected;
    return {
      total: quotations.length,
      inProgress,
      awarded: awardedList.length,
      rejected,
      conversion: decided ? Math.round((awardedList.length / decided) * 100) : null,
      awardedValue: awardedList.reduce((sum, q) => sum + q.value, 0),
    };
  }, [quotations]);

  const counts: Record<Filter, number> = {
    all: stats.total,
    in_progress: stats.inProgress,
    awarded: stats.awarded,
    rejected: stats.rejected,
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations.filter((q) => {
      if (filter !== "all" && q.outcome !== filter) return false;
      if (!term) return true;
      return [q.id, q.customer, q.product].some((f) => f.toLowerCase().includes(term));
    });
  }, [quotations, filter, search]);

  return (
    <div className="space-y-6">
      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          label="Total quotations"
          value={String(stats.total)}
          sub="All RFQs received"
          Icon={Files}
          iconClass="bg-surface-2 text-ink-2"
        />
        <Tile
          label="In progress"
          value={String(stats.inProgress)}
          sub="Before customer decision"
          Icon={Loader}
          iconClass="bg-warn-soft text-warn-fg"
        />
        <Tile
          label="Awarded"
          value={String(stats.awarded)}
          sub={`${formatUSD(stats.awardedValue)} won`}
          Icon={Trophy}
          iconClass="bg-ok-soft text-ok-fg"
        />
        <Tile
          label="Rejected"
          value={String(stats.rejected)}
          sub={stats.conversion === null ? "Conversion: n/a" : `Conversion rate ${stats.conversion}%`}
          Icon={CircleX}
          iconClass="bg-danger-soft text-danger-fg"
        />
      </section>

      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by outcome">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors " +
                  (active
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink")
                }
              >
                {f.label}
                <span
                  className={
                    "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums " +
                    (active ? "bg-on-accent/20 text-on-accent" : "bg-surface-2 text-muted")
                  }
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full md:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, customer or product"
            aria-label="Search quotations"
            className="min-h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink transition-colors placeholder:text-muted hover:border-muted focus:border-ring"
          />
        </div>
      </section>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface px-4 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
            <FileSearch className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="mt-4 text-base font-semibold text-ink">No quotations found</div>
          <p className="mt-1 text-sm text-muted">Try a different filter or search term.</p>
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
            className="mt-4 min-h-10 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Laptop: table */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface shadow-sm md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="w-[9%] px-3 py-3 font-medium">Quote ID</th>
                  <th scope="col" className="w-[11%] px-3 py-3 font-medium">Customer</th>
                  <th scope="col" className="w-[12%] px-3 py-3 font-medium">Product</th>
                  <th scope="col" className="w-[10%] px-3 py-3 font-medium">Material · Region</th>
                  <th scope="col" className="w-[10%] px-3 py-3 text-right font-medium">Value</th>
                  <th scope="col" className="w-[8%] px-3 py-3 font-medium">Estimator</th>
                  <th scope="col" className="w-[9%] px-3 py-3 font-medium">Received</th>
                  <th scope="col" className="w-[18%] px-3 py-3 font-medium">Current step</th>
                  <th scope="col" className="w-[11%] px-3 py-3 font-medium">Outcome</th>
                  <th scope="col" className="w-[2%] py-3 pr-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((q) => {
                  const selected = q.id === selectedId;
                  return (
                    <tr
                      key={q.id}
                      tabIndex={0}
                      aria-selected={selected}
                      onClick={() => onOpen(q.id)}
                      onKeyDown={(e) => rowKeyDown(e, () => onOpen(q.id))}
                      className={
                        "group cursor-pointer align-top transition-colors focus-visible:-outline-offset-2 " +
                        (selected ? "bg-warn-soft shadow-[inset_3px_0_0_0_var(--accent)]" : "hover:bg-surface-2")
                      }
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold tabular-nums text-ink">{q.id}</div>
                        <div className="text-xs tabular-nums text-muted">{q.rfqId}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-ink">{q.customer}</td>
                      <td className="px-3 py-3 text-ink-2">{q.product}</td>
                      <td className="px-3 py-3 text-ink-2">
                        {q.material} · {q.region}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-ink">
                        <Money value={q.value} />
                      </td>
                      <td className="px-3 py-3 text-ink-2">{q.estimator}</td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink-2">{formatDate(q.receivedOn)}</td>
                      <td className="px-3 py-3">
                        <div className="text-ink">{currentStepLabel(q)}</div>
                        <div className="mt-1.5">
                          <StepStrip quotation={q} />
                        </div>
                        <Note q={q} />
                      </td>
                      <td className="px-3 py-3">
                        <OutcomeBadge outcome={q.outcome} />
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <ChevronRight
                          className="inline h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {visible.map((q) => {
              const selected = q.id === selectedId;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(q.id)}
                    aria-current={selected ? "true" : undefined}
                    className={
                      "block w-full rounded-xl border p-4 text-left shadow-sm transition-colors " +
                      (selected
                        ? "border-accent bg-warn-soft"
                        : "border-line bg-surface hover:bg-surface-2 active:bg-surface-2")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold tabular-nums text-ink">{q.id}</div>
                        <div className="text-xs tabular-nums text-muted">{q.rfqId}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <OutcomeBadge outcome={q.outcome} />
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-2 font-medium text-ink">{q.customer}</div>
                    <div className="text-sm text-ink-2">{q.product}</div>
                    <div className="text-sm text-muted">
                      {q.material} · {q.region}
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-3 text-sm">
                      <span className="font-semibold text-ink">
                        <Money value={q.value} />
                      </span>
                      <span className="text-right text-muted">
                        {q.estimator} · <span className="tabular-nums">{formatDate(q.receivedOn)}</span>
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-ink">{currentStepLabel(q)}</div>
                    <div className="mt-1.5">
                      <StepStrip quotation={q} />
                    </div>
                    <Note q={q} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
