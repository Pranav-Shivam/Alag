import { useState } from "react";
import { Calculator, Plug, Sparkles, TrendingUp, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../components/ui";
import { STEPS } from "../data/steps";
import type { Tech, WorkflowStep } from "../types";

const TECHS: Tech[] = ["AI", "ML", "Rules", "Human", "Integration"];

const TECH_ICON: Record<Tech, LucideIcon> = {
  AI: Sparkles,
  ML: TrendingUp,
  Rules: Calculator,
  Human: UserCheck,
  Integration: Plug,
};

const TECH_CHIP: Record<Tech, string> = {
  AI: "bg-violet-soft text-violet-fg border-violet-line",
  ML: "bg-info-soft text-info-fg border-info-line",
  Rules: "bg-surface-2 text-ink-2 border-line",
  Human: "bg-warn-soft text-warn-fg border-warn-line",
  Integration: "bg-teal-soft text-teal-fg border-teal-line",
};

const TECH_ACTIVE: Record<Tech, string> = {
  AI: "bg-violet-solid text-on-accent border-transparent",
  ML: "bg-info-solid text-on-accent border-transparent",
  Rules: "bg-ink-2 text-surface border-transparent",
  Human: "bg-warn-solid text-on-accent border-transparent",
  Integration: "bg-teal-solid text-on-accent border-transparent",
};

const LEGEND: { tech: Tech; text: string }[] = [
  { tech: "AI", text: "Understands documents and text" },
  { tech: "ML", text: "Predicts numbers" },
  { tech: "Rules", text: "Calculates and does transactions" },
  { tech: "Human", text: "Approves" },
  { tech: "Integration", text: "Talks to outside systems" },
];

function TechChip({ tech }: { tech: Tech }) {
  const Icon = TECH_ICON[tech];
  return (
    <span
      className={
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium " +
        TECH_CHIP[tech]
      }
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {tech}
    </span>
  );
}

function StepBadge({ id }: { id: number }) {
  return (
    <span className="inline-grid h-7 min-w-7 shrink-0 place-items-center rounded-control border border-warn-line bg-warn-soft px-1.5 text-xs font-semibold tabular-nums text-warn-fg">
      {id}
    </span>
  );
}

function StepCard({ step }: { step: WorkflowStep }) {
  return (
    <li className="surface p-4">
      <div className="flex items-start gap-3">
        <StepBadge id={step.id} />
        <div className="min-w-0">
          <h3 className="t-section">{step.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {step.tech.map((t) => (
              <TechChip key={t} tech={t} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{step.description}</p>
      <dl className="mt-3 space-y-1.5 rounded-control bg-surface-2 p-3 text-sm">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted">Agent</dt>
          <dd className="text-ink-2">{step.agent}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted">Owner</dt>
          <dd className="text-ink-2">{step.owner}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted">Output</dt>
          <dd className="font-medium text-ink">{step.output}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function StepsPage() {
  const [filter, setFilter] = useState<Tech | "All">("All");

  const visible = filter === "All" ? STEPS : STEPS.filter((s) => s.tech.includes(filter));

  return (
    <div className="page">
      <PageHeader title="The 14 steps" description="Use AI to understand. Use ML to predict. Use rules to calculate. Use humans to approve." />

      <section
        aria-label="Technology legend"
        className="surface p-4"
      >
        <h2 className="t-eyebrow">Technology legend</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {LEGEND.map((l) => (
            <li key={l.tech} className="flex items-center gap-3 text-sm text-ink-2">
              <span className="w-28 shrink-0">
                <TechChip tech={l.tech} />
              </span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by technology">
        {(["All", ...TECHS] as const).map((f) => {
          const active = filter === f;
          const Icon = f === "All" ? null : TECH_ICON[f];
          const style = active
            ? f === "All"
              ? "bg-accent text-on-accent border-transparent"
              : TECH_ACTIVE[f]
            : "bg-surface text-ink-2 border-line-strong hover:bg-surface-2 hover:text-ink";
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                style
              }
            >
              {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {f}
            </button>
          );
        })}
        <span className="ml-1 text-sm text-muted" aria-live="polite">
          {filter === "All"
            ? `${visible.length} steps`
            : `${visible.length} of ${STEPS.length} steps use ${filter}`}
        </span>
      </div>

      {/* Laptop: table */}
      <div className="surface hidden overflow-hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="table-head bg-surface-2">
            <tr className="border-b border-line">
              <th scope="col" className="w-12 px-4 py-3 font-semibold">#</th>
              <th scope="col" className="w-[13%] px-3 py-3 font-semibold">Step</th>
              <th scope="col" className="w-[13%] px-3 py-3 font-semibold">Agent</th>
              <th scope="col" className="w-[11%] px-3 py-3 font-semibold">Owner</th>
              <th scope="col" className="w-[15%] px-3 py-3 font-semibold">Technology</th>
              <th scope="col" className="px-3 py-3 font-semibold">What it does</th>
              <th scope="col" className="w-[15%] px-3 py-3 font-semibold">Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((s) => (
              <tr key={s.id} className="align-top transition-colors hover:bg-surface-2">
                <td className="px-4 py-3.5">
                  <StepBadge id={s.id} />
                </td>
                <td className="px-3 py-3.5 font-medium leading-snug text-ink">{s.name}</td>
                <td className="px-3 py-3.5 leading-snug text-ink-2">{s.agent}</td>
                <td className="px-3 py-3.5 leading-snug text-ink-2">{s.owner}</td>
                <td className="px-3 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {s.tech.map((t) => (
                      <TechChip key={t} tech={t} />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3.5 leading-relaxed text-ink-2">{s.description}</td>
                <td className="px-3 py-3.5 font-medium leading-snug text-ink">{s.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="space-y-3 md:hidden">
        {visible.map((s) => (
          <StepCard key={s.id} step={s} />
        ))}
      </ul>
    </div>
  );
}
