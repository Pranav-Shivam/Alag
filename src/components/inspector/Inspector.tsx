import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Clock, Minus, X } from "lucide-react";
import { REJECT_STEP, STEPS } from "../../data/steps";
import { STEP_STATUS_LABEL } from "../../lib/status";
import { useAgent, useCase } from "../../studio/store";
import type { Quotation, StepStatus } from "../../types";
import RulesEditor from "../../rules/RulesEditor";
import { Callout, Chip } from "../ui";
import { INSPECTOR_TABS, STATUS_ICON, STATUS_TONE, getAttention } from "../workflow/stepMeta";
import type { InspectorTab } from "../workflow/stepMeta";
import ActivityTab from "./ActivityTab";
import AgentTab from "./AgentTab";
import OverviewTab from "./OverviewTab";
import { STEP_UI } from "./registry";

interface Props {
  quotation: Quotation;
  stepId: number;
  status: StepStatus;
  onClose: () => void;
  /** Id for the heading, so a dialog wrapper can point aria-labelledby at it. */
  titleId: string;
  /** Tab requested by another screen before this inspector mounted. Used when the step has that tab. */
  initialTab?: InspectorTab | null;
}

interface TabDef {
  id: InspectorTab;
  label: string;
}

function defaultTab(hasCase: boolean, status: StepStatus): InspectorTab {
  return hasCase && (status === "current" || status === "blocked" || status === "rejected") ? "case" : "overview";
}

/** Small marker next to a tab label. Dot plus hidden text, or a count. */
function TabMark({ tone, text, count }: { tone?: "warn" | "danger" | "info"; text?: string; count?: number }) {
  if (count !== undefined) {
    return (
      <span className="rounded-full bg-surface-2 px-1.5 text-[11px] font-medium tabular-nums text-muted ring-1 ring-line">
        {count}
        <span className="sr-only"> events</span>
      </span>
    );
  }
  const dot = tone === "danger" ? "bg-danger-solid" : tone === "info" ? "bg-info-solid" : "bg-warn-solid";
  return (
    <>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="sr-only">{text}</span>
    </>
  );
}

export default function Inspector({ quotation, stepId, status, onClose, titleId, initialTab }: Props) {
  const step = STEPS[stepId - 1];
  const ui = STEP_UI[stepId] ?? {};
  const hasCase = Boolean(ui.Case);
  const caseData = useCase(quotation.id);
  const agent = useAgent(stepId);

  const tabs = useMemo<TabDef[]>(() => {
    const list: TabDef[] = [{ id: "overview", label: "Overview" }];
    if (STEP_UI[stepId]?.Case) list.push({ id: "case", label: STEP_UI[stepId]?.caseLabel ?? "Work" });
    list.push({ id: "agent", label: "Agent" });
    if (STEP_UI[stepId]?.rulesFocus) list.push({ id: "rules", label: "Rules" });
    list.push({ id: "activity", label: "Activity" });
    return list;
  }, [stepId]);

  const [tab, setTab] = useState<InspectorTab>(() =>
    initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : defaultTab(hasCase, status),
  );
  const tabRefs = useRef<Partial<Record<InspectorTab, HTMLButtonElement | null>>>({});

  // Other screens can ask for a tab with a window event. Ignored when this step has no such tab.
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  useEffect(() => {
    const onOpenTab = (e: Event) => {
      const wanted = (e as CustomEvent<{ tab?: InspectorTab }>).detail?.tab;
      if (wanted && INSPECTOR_TABS.includes(wanted) && tabsRef.current.some((t) => t.id === wanted)) setTab(wanted);
    };
    window.addEventListener("alag:open-tab", onOpenTab);
    return () => window.removeEventListener("alag:open-tab", onOpenTab);
  }, []);

  const attention = getAttention(caseData, stepId, status);
  const needsAction = attention.filter((a) => a.tone === "danger" || a.tone === "warn" || a.tone === "alert");
  const worstTone = needsAction.some((a) => a.tone === "danger") ? "danger" : "warn";
  const stepEvents = caseData ? caseData.activity.filter((a) => a.stepId === stepId).length : 0;

  const onTabKey = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (index + 1) % tabs.length
      : e.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    const id = tabs[next].id;
    setTab(id);
    tabRefs.current[id]?.focus();
  };

  const StatusIcon = STATUS_ICON[status];
  const panelId = `insp-panel-${stepId}`;
  const notStarted = status === "pending" || status === "skipped";

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="shrink-0 border-b border-line px-4 pb-3 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider tabular-nums text-muted">
              Step {step.id} of {STEPS.length}
            </p>
            <h2 id={titleId} className="mt-0.5 text-lg font-semibold leading-snug tracking-tight text-ink">
              {step.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <Chip tone={STATUS_TONE[status]} icon={StatusIcon}>
                {STEP_STATUS_LABEL[status]}
              </Chip>
              <span className="text-xs text-muted">{step.agent}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close step ${step.id} panel`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:h-9 lg:w-9"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div role="tablist" aria-label={`Step ${step.id} sections`} className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-line px-2">
        {tabs.map((t, i) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`insp-tab-${stepId}-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium transition-colors ${
                active ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.id === "case" && needsAction.length > 0 ? <TabMark tone={worstTone} text="needs attention" /> : null}
              {t.id === "agent" && agent?.draft ? <TabMark tone="info" text="unpublished edits" /> : null}
              {t.id === "activity" && stepEvents > 0 ? <TabMark count={stepEvents} /> : null}
              {active ? <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" /> : null}
            </button>
          );
        })}
      </div>

      <div className="@container min-h-0 flex-1 overflow-y-auto">
        <div role="tabpanel" id={panelId} aria-labelledby={`insp-tab-${stepId}-${tab}`} tabIndex={0} className="space-y-4 p-4">
          {notStarted ? (
            status === "skipped" ? (
              <Callout tone="neutral" icon={Minus} title="This step was not reached">
                {`The quotation was rejected at step ${REJECT_STEP}${quotation.rejectReason ? ` (${quotation.rejectReason})` : ""}, so this step never ran. You can still review the agent settings.`}
              </Callout>
            ) : (
              <Callout tone="neutral" icon={Clock} title="This step has not started">
                It begins once step {Math.max(1, stepId - 1)} is done. You can already review the agent settings and rules it will use.
              </Callout>
            )
          ) : null}

          {tab === "overview" && <OverviewTab quotation={quotation} stepId={stepId} status={status} onOpenTab={setTab} />}
          {tab === "case" && ui.Case ? <ui.Case quotation={quotation} status={status} /> : null}
          {tab === "agent" && <AgentTab stepId={stepId} />}
          {tab === "rules" && ui.rulesFocus ? <RulesEditor focus={ui.rulesFocus} /> : null}
          {tab === "activity" && <ActivityTab quotationId={quotation.id} stepId={stepId} />}
        </div>
      </div>
    </div>
  );
}
