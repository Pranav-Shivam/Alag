import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Clock, GitBranch, PanelRight, Paperclip, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Inspector from "../components/inspector/Inspector";
import StepRail from "../components/inspector/StepRail";
import BottomSheet from "../components/workflow/BottomSheet";
import { PENDING_TEXT } from "../components/workflow/details";
import { INSPECTOR_TABS } from "../components/workflow/stepMeta";
import type { InspectorTab } from "../components/workflow/stepMeta";
import { Button, Callout, Card, Chip } from "../components/ui";
import type { Tone } from "../components/ui";
import { REJECT_STEP, STEPS } from "../data/steps";
import { OUTCOME_LABEL, currentStepLabel, formatUSD, getStepStatuses } from "../lib/status";
import { useCase } from "../studio/store";
import type { Outcome, Quotation } from "../types";

interface Props {
  quotation: Quotation | null;
  quotations: Quotation[];
  onSelect: (id: string) => void;
  onBack: () => void;
}

const OUTCOME_TONE: Record<Outcome, Tone> = { awarded: "ok", in_progress: "warn", rejected: "danger" };
const OUTCOME_ICON: Record<Outcome, LucideIcon> = { awarded: Check, in_progress: Clock, rejected: X };

/** Step that is open by default: the rejected step, the current step, or the last step when the order is closed. */
function defaultStep(q: Quotation): number {
  return q.outcome === "rejected" ? REJECT_STEP : q.currentStep;
}

function summaryLine(q: Quotation): string {
  const label = currentStepLabel(q);
  if (q.outcome === "rejected" || label === "Order closed") return label;
  return `Step ${q.currentStep} of ${STEPS.length}: ${label}`;
}

/** True from the lg breakpoint up, where the inspector is docked beside the rail. */
function useIsDesktop(): boolean {
  const query = "(min-width: 1024px)";
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

function QuotationSelect({ quotations, value, onSelect, className, label }: { quotations: Quotation[]; value: string; onSelect: (id: string) => void; className?: string; label: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        className="min-h-10 w-full appearance-none rounded-control border border-line-strong bg-surface py-2 pl-3 pr-10 text-sm text-ink transition-colors hover:bg-surface-2"
      >
        {value === "" && (
          <option value="" disabled>
            Choose a quotation
          </option>
        )}
        {quotations.map((x) => (
          <option key={x.id} value={x.id}>
            {x.id} - {x.customer}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-eyebrow">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function Pending() {
  return (
    <span className="font-normal text-muted">
      <span aria-hidden="true">{"–"}</span> {PENDING_TEXT}
    </span>
  );
}

function EmptyState({ quotations, onSelect, onBack }: Omit<Props, "quotation">) {
  return (
    <div className="mx-auto max-w-lg rounded-surface border border-dashed border-line-strong bg-surface p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
        <GitBranch className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="t-title mt-4">No quotation selected</h2>
      <p className="mt-1 text-sm text-ink-2">Pick a quotation to see its journey from lead and RFQ intake to an awarded order or a rejection.</p>
      <Button variant="primary" className="mt-5" onClick={onBack}>
        Pick a quotation
      </Button>
      <div className="mt-4 text-xs text-muted">or choose one here</div>
      <div className="mt-2 flex justify-center">
        <QuotationSelect quotations={quotations} value="" onSelect={onSelect} label="Choose a quotation" className="w-full max-w-xs" />
      </div>
    </div>
  );
}

function HeaderCard({ quotation, quotations, onSelect, onBack, doneCount }: Omit<Props, "quotation"> & { quotation: Quotation; doneCount: number }) {
  const files = useCase(quotation.id)?.attachments.length ?? 0;
  const chain = [quotation.rfqId, quotation.id, quotation.estId, quotation.orderId].filter(Boolean) as string[];
  const OutcomeIcon = OUTCOME_ICON[quotation.outcome];

  return (
    <Card className="p-4">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" icon={ArrowLeft} className="self-start" onClick={onBack}>
          All quotations
        </Button>
        <QuotationSelect quotations={quotations} value={quotation.id} onSelect={onSelect} label="Jump to another quotation" className="w-full sm:w-72" />
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="t-title tabular-nums">{quotation.id}</span>
            <span className="text-base font-medium text-ink-2">{quotation.customer}</span>
          </h2>
          <ol className="mt-1.5 flex flex-wrap items-center gap-1" aria-label="Linked records">
            {chain.map((c, i) => (
              <li key={c} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" /> : null}
                <Chip tone={c === quotation.id ? "info" : "neutral"} className="tabular-nums">
                  {c}
                </Chip>
              </li>
            ))}
          </ol>
        </div>
        <Chip tone={OUTCOME_TONE[quotation.outcome]} icon={OutcomeIcon} className="px-3 py-1 text-sm">
          {OUTCOME_LABEL[quotation.outcome]}
        </Chip>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <p className="text-sm font-medium text-ink-2">{summaryLine(quotation)}</p>
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line"
            role="progressbar"
            aria-label="Steps done"
            aria-valuemin={0}
            aria-valuemax={STEPS.length}
            aria-valuenow={doneCount}
          >
            <div className="h-full rounded-full bg-ok-solid" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted">{`${doneCount} of ${STEPS.length} steps done`}</span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 sm:grid-cols-4 lg:grid-cols-7">
        <Fact label="Product">{quotation.product}</Fact>
        <Fact label="Material">{quotation.material}</Fact>
        <Fact label="Region">{quotation.region}</Fact>
        <Fact label="Value">{quotation.value ? formatUSD(quotation.value) : <Pending />}</Fact>
        <Fact label="Margin">{quotation.marginPct ? `${quotation.marginPct}%` : <Pending />}</Fact>
        <Fact label="Estimator">{quotation.estimator}</Fact>
        <Fact label="Attachments">
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            {`${files} ${files === 1 ? "file" : "files"}`}
          </span>
        </Fact>
      </dl>
    </Card>
  );
}

/** Everything that depends on one quotation. Keyed by quotation id, so switching quotation resets all state here. */
function WorkflowBody({ quotation, quotations, onSelect, onBack }: Props & { quotation: Quotation }) {
  const isDesktop = useIsDesktop();
  const titleId = useId();
  const statuses = getStepStatuses(quotation);
  const doneCount = statuses.filter((s) => s === "done").length;

  const [selected, setSelected] = useState(() => defaultStep(quotation));
  const [sheetOpen, setSheetOpen] = useState(false); // phones and tablets
  const [dismissed, setDismissed] = useState(false); // laptop: inspector closed with its X
  const [nonce, setNonce] = useState(0); // bumps when another screen re-selects a step, to reset its tab
  const [pendingTab, setPendingTab] = useState<InspectorTab | null>(null);

  const openStep = useCallback((id: number) => {
    setSelected(id);
    setPendingTab(null);
    setSheetOpen(true);
    setDismissed(false);
  }, []);

  // Other screens can drive the inspector with window events.
  useEffect(() => {
    const onSelectStep = (e: Event) => {
      const id = (e as CustomEvent<{ stepId?: number }>).detail?.stepId;
      if (typeof id !== "number" || !Number.isInteger(id) || id < 1 || id > STEPS.length) return;
      openStep(id);
      setNonce((n) => n + 1);
    };
    const onOpenTab = (e: Event) => {
      const tab = (e as CustomEvent<{ tab?: InspectorTab }>).detail?.tab;
      if (tab && INSPECTOR_TABS.includes(tab)) setPendingTab(tab);
    };
    window.addEventListener("alag:select-step", onSelectStep);
    window.addEventListener("alag:open-tab", onOpenTab);
    return () => {
      window.removeEventListener("alag:select-step", onSelectStep);
      window.removeEventListener("alag:open-tab", onOpenTab);
    };
  }, [openStep]);

  const closeInspector = () => {
    const id = selected;
    setSheetOpen(false);
    setDismissed(true);
    // Hand focus back to the step that opened it.
    window.requestAnimationFrame(() => document.getElementById(`step-row-${id}`)?.focus());
  };

  const inspector = (
    <Inspector
      key={`${quotation.id}-${selected}-${nonce}`}
      quotation={quotation}
      stepId={selected}
      status={statuses[selected - 1]}
      onClose={closeInspector}
      titleId={titleId}
      initialTab={pendingTab}
    />
  );

  return (
    <div className="page">
      <HeaderCard quotation={quotation} quotations={quotations} onSelect={onSelect} onBack={onBack} doneCount={doneCount} />

      {quotation.outcome === "rejected" && (
        <Callout tone="danger" icon={X} title={`Quotation rejected: ${quotation.rejectReason ?? "no reason recorded"}`}>
          {`Flow stopped at step ${REJECT_STEP}. Later steps were not reached.`}
        </Callout>
      )}
      {quotation.outcome === "in_progress" && quotation.blocked && (
        <Callout tone="alert" icon={TriangleAlert} title={`Needs attention at step ${quotation.currentStep}`}>
          {quotation.blockedReason}
        </Callout>
      )}
      {quotation.outcome === "awarded" && (
        <Callout tone="ok" icon={Check} title={`Awarded${quotation.orderId ? `: order ${quotation.orderId}` : ""}`}>
          {summaryLine(quotation)}
        </Callout>
      )}

      <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-5">
        <aside
          aria-label="Workflow"
          className="surface min-w-0 p-2 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto"
        >
          <div className="px-2 pb-2 pt-1">
            <h2 className="t-label">Workflow steps</h2>
            <p className="text-xs text-muted">Select a step to open it.</p>
          </div>
          <StepRail quotation={quotation} statuses={statuses} selectedId={selected} onSelect={openStep} />
        </aside>

        {isDesktop ? (
          <div className="surface min-w-0 overflow-hidden lg:sticky lg:top-20 lg:h-[calc(100dvh-6.5rem)] lg:min-h-[28rem]">
            {dismissed ? (
              <div className="grid h-full place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
                    <PanelRight className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink">No step open</p>
                  <p className="mt-1 text-xs text-muted">Select a step in the list to see its details, agent and activity.</p>
                  <Button size="sm" className="mt-3" onClick={() => openStep(selected)}>
                    {`Open step ${selected}`}
                  </Button>
                </div>
              </div>
            ) : (
              inspector
            )}
          </div>
        ) : null}
      </div>

      {!isDesktop && sheetOpen ? (
        <BottomSheet labelledBy={titleId} onClose={closeInspector}>
          {inspector}
        </BottomSheet>
      ) : null}
    </div>
  );
}

export default function WorkflowPage({ quotation, quotations, onSelect, onBack }: Props) {
  if (!quotation) return <EmptyState quotations={quotations} onSelect={onSelect} onBack={onBack} />;
  return <WorkflowBody key={quotation.id} quotation={quotation} quotations={quotations} onSelect={onSelect} onBack={onBack} />;
}
