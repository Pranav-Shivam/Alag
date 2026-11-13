import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Check, GitBranch, Info, TriangleAlert, X } from "lucide-react";
import { REJECT_STEP, STEPS } from "../../data/steps";
import { STEP_STATUS_LABEL } from "../../lib/status";
import { useCase } from "../../studio/store";
import type { Quotation, StepStatus } from "../../types";
import { STATUS_ICON, STATUS_MARKER, STATUS_TONE, TECH_TONE, getAttention } from "../workflow/stepMeta";
import { TONE, TONE_TEXT } from "../ui";
import type { Tone } from "../ui";

interface Props {
  quotation: Quotation;
  statuses: StepStatus[];
  selectedId: number;
  onSelect: (id: number) => void;
}

/** Compact chip for the dense rail. */
function MiniChip({ tone, icon: Icon, children }: { tone: Tone; icon?: typeof Info; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-px text-2xs font-semibold leading-4 ${TONE[tone]}`}>
      {Icon ? <Icon className="h-2.5 w-2.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Style of the connecting line between two steps. Dashed when the later step was never reached. */
function segment(from: StepStatus, to: StepStatus): string {
  const dashed = from === "skipped" || to === "skipped" ? "border-dashed" : "border-solid";
  const color = from === "done" ? "border-ok-solid" : "border-line-strong";
  return `border-l-2 ${dashed} ${color}`;
}

/** The two halves of the line above and below the circle. Circle center sits 24px from the row top. */
function Line({ above, below }: { above?: string; below?: string }) {
  return (
    <>
      {above ? <span aria-hidden="true" className={`absolute left-1/2 top-0 h-6 w-0 -translate-x-1/2 ${above}`} /> : null}
      {below ? <span aria-hidden="true" className={`absolute bottom-0 left-1/2 top-6 w-0 -translate-x-1/2 ${below}`} /> : null}
    </>
  );
}

function StepRow({
  index,
  statuses,
  selected,
  attentionCase,
  onSelect,
}: {
  index: number;
  statuses: StepStatus[];
  selected: boolean;
  attentionCase: ReturnType<typeof useCase>;
  onSelect: (id: number) => void;
}) {
  const step = STEPS[index];
  const status = statuses[index];
  const Icon = STATUS_ICON[status];
  const attention = getAttention(attentionCase, step.id, status);
  const label = `Step ${step.id}: ${step.name}, ${STEP_STATUS_LABEL[status]}${attention.length ? `, ${attention.map((a) => a.label).join(", ")}` : ""}`;
  const above = index > 0 ? segment(statuses[index - 1], status) : undefined;
  const below = index < STEPS.length - 1 ? segment(status, statuses[index + 1]) : undefined;
  const dimmed = status === "skipped";

  return (
    <li>
      <button
        type="button"
        id={`step-row-${step.id}`}
        data-step-row=""
        onClick={() => onSelect(step.id)}
        aria-current={selected ? "step" : undefined}
        aria-label={label}
        className={`relative flex w-full items-stretch gap-3 rounded-control px-2 py-2 text-left transition-colors ${
          selected ? "bg-surface-2 ring-1 ring-inset ring-accent" : "hover:bg-surface-2"
        } ${dimmed ? "opacity-70" : ""}`}
      >
        {selected ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent" /> : null}
        <span className="relative -my-2 flex w-8 shrink-0 justify-center self-stretch" aria-hidden="true">
          <Line above={above} below={below} />
          <span className={`relative z-10 mt-2 grid h-8 w-8 place-items-center rounded-full border-2 ${STATUS_MARKER[status]}`}>
            {status !== "pending" ? <Icon className="h-4 w-4" strokeWidth={2.5} /> : null}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="w-4 shrink-0 text-right text-2xs font-medium tabular-nums text-muted">{step.id}</span>
            <span className={`text-sm font-semibold leading-snug ${dimmed ? "text-muted" : "text-ink"}`}>{step.name}</span>
          </span>
          <span className="mt-0.5 block pl-[22px] text-xs leading-snug text-muted">{step.agent}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1 pl-[22px]">
            <span className={`mr-0.5 text-2xs font-semibold ${TONE_TEXT[STATUS_TONE[status]]}`}>{STEP_STATUS_LABEL[status]}</span>
            {step.tech.map((t) => (
              <MiniChip key={t} tone={TECH_TONE[t]}>
                {t}
              </MiniChip>
            ))}
            {attention.map((a) => (
              <MiniChip key={a.id} tone={a.tone} icon={a.tone === "info" ? Info : TriangleAlert}>
                {a.label}
              </MiniChip>
            ))}
          </span>
        </span>
      </button>
    </li>
  );
}

function Branch({
  tone,
  icon: Icon,
  title,
  note,
  state,
}: {
  tone: "ok" | "danger" | "open" | "dim";
  icon: typeof Check;
  title: string;
  note: string;
  state: string;
}) {
  const box =
    tone === "ok" ? TONE.ok : tone === "danger" ? TONE.danger : tone === "open" ? "border-line bg-surface text-ink-2" : "border-dashed border-line bg-surface text-muted opacity-70";
  return (
    <div className={`rounded-control border p-2 ${box}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          {title}
        </span>
        <span className="text-2xs font-semibold uppercase tracking-wide">{state}</span>
      </div>
      <p className="mt-0.5 text-xs leading-snug">{note}</p>
    </div>
  );
}

/** Fork after the decision step: Awarded continues to the order, Rejected stops. */
function Fork({ quotation, lineClass }: { quotation: Quotation; lineClass: string }) {
  const { outcome, rejectReason } = quotation;
  return (
    <li className="px-2 py-1">
      <div className="flex items-stretch gap-3">
        <span className="relative flex w-8 shrink-0 justify-center self-stretch" aria-hidden="true">
          <span className={`absolute inset-y-0 left-1/2 w-0 -translate-x-1/2 ${lineClass}`} />
          <span className="relative z-10 mt-1 grid h-8 w-8 place-items-center rounded-full border-2 border-line-strong bg-surface text-ink-2">
            <GitBranch className="h-4 w-4" />
          </span>
        </span>
        <div className="min-w-0 flex-1 rounded-surface border border-line bg-surface-2 p-2.5">
          <p className="text-sm font-semibold text-ink">Customer decision</p>
          <p className="mt-0.5 text-xs text-muted">
            {outcome === "in_progress" ? "The customer has not decided yet." : outcome === "awarded" ? "The customer awarded the quotation." : "The customer rejected the quotation."}
          </p>
          <div className="mt-2 space-y-1.5">
            <Branch
              tone={outcome === "awarded" ? "ok" : outcome === "rejected" ? "dim" : "open"}
              icon={Check}
              title="Awarded"
              note="Continues to the order, steps 7 to 14"
              state={outcome === "awarded" ? "Taken" : outcome === "rejected" ? "Not taken" : "Open"}
            />
            <Branch
              tone={outcome === "rejected" ? "danger" : outcome === "awarded" ? "dim" : "open"}
              icon={X}
              title="Rejected"
              note={outcome === "rejected" ? `Stops here. Reason: ${rejectReason ?? "no reason recorded"}` : "Stops here, no order is created"}
              state={outcome === "rejected" ? "Taken" : outcome === "awarded" ? "Not taken" : "Open"}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

export default function StepRail({ quotation, statuses, selectedId, onSelect }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const attentionCase = useCase(quotation.id);

  // Up and Down move focus between rows without tabbing through every chip.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const rows = Array.from(navRef.current?.querySelectorAll<HTMLButtonElement>("button[data-step-row]") ?? []);
    const at = rows.findIndex((r) => r === document.activeElement);
    if (at < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : e.key === "ArrowDown" ? Math.min(at + 1, rows.length - 1) : Math.max(at - 1, 0);
    rows[next]?.focus();
  };

  const forkAfter = REJECT_STEP - 1; // index of the decision step
  const forkLine = segment(statuses[forkAfter], statuses[forkAfter + 1]);

  return (
    <nav ref={navRef} aria-label="Workflow steps" onKeyDown={onKeyDown}>
      <ol className="space-y-0">
        {STEPS.map((step, i) => (
          <StepRowWithFork
            key={step.id}
            fork={i === forkAfter ? <Fork quotation={quotation} lineClass={forkLine} /> : null}
          >
            <StepRow index={i} statuses={statuses} selected={selectedId === step.id} attentionCase={attentionCase} onSelect={onSelect} />
          </StepRowWithFork>
        ))}
      </ol>
    </nav>
  );
}

/** Renders a row and, when asked, the fork block right after it. Both are direct list items. */
function StepRowWithFork({ children, fork }: { children: ReactNode; fork: ReactNode }) {
  return (
    <>
      {children}
      {fork}
    </>
  );
}
