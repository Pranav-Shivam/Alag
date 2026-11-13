import type { ReactNode } from "react";
import { ArrowRight, Sparkles, TriangleAlert } from "lucide-react";
import { connectorsForStep } from "../../data/connectors";
import { STEPS } from "../../data/steps";
import { STEP_STATUS_LABEL } from "../../lib/status";
import { useConnectors } from "../../store/connectors";
import { useAgent, useCase } from "../../studio/store";
import type { Autonomy } from "../../studio/types";
import type { Quotation, StepStatus } from "../../types";
import BrandIcon from "../common/BrandIcon";
import { Button, Callout, Card, Chip, SectionTitle } from "../ui";
import { PENDING_TEXT, getStepDetailRows } from "../workflow/details";
import { STATUS_ICON, STATUS_TONE, TECH_TONE, formatAbs, relativeHint, reviewIssue } from "../workflow/stepMeta";
import type { InspectorTab } from "../workflow/stepMeta";
import { STEP_UI } from "./registry";

interface Props {
  quotation: Quotation;
  stepId: number;
  status: StepStatus;
  onOpenTab: (tab: InspectorTab) => void;
}

const AUTONOMY_LABEL: Record<Autonomy, string> = {
  suggest: "Suggests only",
  draft: "Drafts for review",
  auto: "Acts on its own",
};

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-eyebrow">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Value({ value }: { value: string }) {
  if (value === PENDING_TEXT) {
    return (
      <span className="text-muted">
        <span aria-hidden="true">{"–"}</span> {PENDING_TEXT}
      </span>
    );
  }
  return <>{value}</>;
}

export default function OverviewTab({ quotation, stepId, status, onOpenTab }: Props) {
  const step = STEPS[stepId - 1];
  const ui = STEP_UI[stepId];
  const agent = useAgent(stepId);
  const caseData = useCase(quotation.id);
  const connectedIds = useConnectors((s) => s.connected);
  const stepConnectors = connectorsForStep(stepId);
  const connectedHere = stepConnectors.filter((c) => c.id in connectedIds);

  const last = caseData?.activity
    .filter((a) => a.stepId === stepId)
    .reduce<string | null>((acc, a) => (acc === null || a.at > acc ? a.at : acc), null);

  const issue = stepId === 2 || stepId === 3 ? reviewIssue(caseData) : null;
  const showIssue = issue !== null && status !== "pending" && status !== "skipped" && Boolean(ui?.Case);
  const issueText =
    issue?.kind === "failed"
      ? `Extraction failed${issue.reason ? `: ${issue.reason}` : "."}`
      : issue?.kind === "not_run"
        ? "Extraction has not been run for this quotation yet."
        : issue
          ? `${issue.count} ${issue.count === 1 ? "field needs" : "fields need"} a human check before the RFQ can move on.`
          : "";

  const StatusIcon = STATUS_ICON[status];
  const { rows } = getStepDetailRows(quotation, stepId, status);

  return (
    <div className="space-y-4">
      {showIssue ? (
        <Callout tone={issue?.kind === "review" || issue?.kind === "not_run" ? "warn" : "danger"} icon={TriangleAlert} title="Needs your attention">
          <p>{issueText}</p>
          {ui?.Case ? (
            <Button size="sm" icon={ArrowRight} className="mt-2" onClick={() => onOpenTab("case")}>
              {`Open ${ui.caseLabel ?? "work tab"}`}
            </Button>
          ) : null}
        </Callout>
      ) : null}

      <section>
        <h3 className="t-label">What happens here</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.description}</p>
      </section>

      <Card className="p-4">
        <SectionTitle
          title="AI agent"
          hint="Settings are shared by every quotation."
          action={
            agent?.draft ? (
              <Chip tone="warn">Unpublished edits</Chip>
            ) : null
          }
        />
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-violet-line bg-violet-soft text-violet-fg">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">{step.agent}</div>
            {agent ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip tone="violet">{agent.live.model}</Chip>
                <Chip>{AUTONOMY_LABEL[agent.live.autonomy]}</Chip>
                <Chip>{`Version ${agent.version}`}</Chip>
              </div>
            ) : null}
          </div>
        </div>
        <Button size="sm" className="mt-3" onClick={() => onOpenTab("agent")}>
          Open agent settings
        </Button>
      </Card>

      {stepConnectors.length > 0 ? (
        <Card className="p-4">
          <SectionTitle
            title="Connectors"
            hint={`${connectedHere.length} of ${stepConnectors.length} systems this step can use are connected.`}
          />
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Connectors for this step">
            {(connectedHere.length > 0 ? connectedHere : stepConnectors.slice(0, 6)).map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-control border border-line bg-surface-2 py-1 pl-1 pr-2.5 text-xs text-ink">
                <BrandIcon icon={c.icon} name={c.name} size="sm" />
                {c.name}
                {c.id in connectedIds ? <span className="sr-only"> (connected)</span> : null}
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-3" onClick={() => window.dispatchEvent(new CustomEvent("alag:goto", { detail: { tab: "connectors", stepId } }))}>
            Manage connectors for this step
          </Button>
        </Card>
      ) : null}

      <Card className="p-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 @md:grid-cols-2">
          <Item label="Approves">{step.owner}</Item>
          <Item label="Output">{step.output}</Item>
          <Item label="Technology">
            <span className="flex flex-wrap gap-1.5">
              {step.tech.map((t) => (
                <Chip key={t} tone={TECH_TONE[t]}>
                  {t}
                </Chip>
              ))}
            </span>
          </Item>
          <Item label="Status">
            <Chip tone={STATUS_TONE[status]} icon={StatusIcon}>
              {STEP_STATUS_LABEL[status]}
            </Chip>
          </Item>
          <Item label="Last activity">
            {last ? (
              <>
                <time dateTime={last}>{formatAbs(last)}</time>
                {relativeHint(last) ? <span className="text-muted">{` (${relativeHint(last)})`}</span> : null}
              </>
            ) : (
              <span className="text-muted">No activity yet</span>
            )}
          </Item>
        </dl>
      </Card>

      {!ui?.Case && rows.length > 0 ? (
        <section>
          <h3 className="t-label flex flex-wrap items-baseline gap-x-2">
            <span>This quotation at this step</span>
            <span className="text-xs font-normal tabular-nums text-muted">{quotation.id}</span>
          </h3>
          <dl className="mt-2 grid grid-cols-1 gap-x-8 @lg:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-1 gap-0.5 border-t border-line py-2.5 @md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] @md:gap-3">
                <dt className="t-eyebrow @md:pt-0.5">{r.label}</dt>
                <dd className="break-words text-sm tabular-nums text-ink">
                  <Value value={r.value} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
