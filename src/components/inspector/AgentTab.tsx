import { useEffect, useRef, useState } from "react";
import { Bot, CircleAlert, FlaskConical, Globe, History, Rocket, Settings2, ShieldCheck, SlidersHorizontal, Undo2, FileText, Braces } from "lucide-react";
import { STEPS } from "../../data/steps";
import { useAgent, useStudio } from "../../studio/store";
import type { AgentBody } from "../../studio/types";
import GuardrailsPanel from "../agent/GuardrailsPanel";
import PromptsPanel from "../agent/PromptsPanel";
import PublishPanel from "../agent/PublishPanel";
import SchemaPanel from "../agent/SchemaPanel";
import SettingsPanel from "../agent/SettingsPanel";
import TestPanel from "../agent/TestPanel";
import VersionsPanel from "../agent/VersionsPanel";
import { changedSections, validate } from "../agent/logic";
import { Button, Callout, Chip, Segmented } from "../ui";
import type { AgentTabProps } from "./types";

type Section = "prompts" | "schema" | "guardrails" | "settings" | "test" | "versions";

const SECTIONS: { id: Section; label: string; icon: typeof Bot }[] = [
  { id: "prompts", label: "Prompts", icon: FileText },
  { id: "schema", label: "Schema", icon: Braces },
  { id: "guardrails", label: "Guardrails and tools", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
  { id: "test", label: "Test", icon: FlaskConical },
  { id: "versions", label: "Versions", icon: History },
];

export default function AgentTab({ stepId }: AgentTabProps) {
  // Keyed so switching step starts from a clean state.
  return <AgentEditor key={stepId} stepId={stepId} />;
}

function AgentEditor({ stepId }: AgentTabProps) {
  const agent = useAgent(stepId);
  const updateAgentDraft = useStudio((s) => s.updateAgentDraft);
  const discardAgentDraft = useStudio((s) => s.discardAgentDraft);
  const publishAgent = useStudio((s) => s.publishAgent);
  const restoreAgentVersion = useStudio((s) => s.restoreAgentVersion);

  const [section, setSection] = useState<Section>("prompts");
  const [publishing, setPublishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [notice, setNotice] = useState("");
  const publishRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (publishing) publishRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [publishing]);

  const step = STEPS.find((s) => s.id === stepId);

  if (!agent) {
    return <Callout tone="neutral">No agent is set up for this step.</Callout>;
  }

  const { live, draft } = agent;
  const body: AgentBody = draft ?? live;
  const update = (patch: Partial<AgentBody>) => {
    setNotice("");
    updateAgentDraft(stepId, patch);
  };

  const changes = draft ? changedSections(live, draft) : [];
  const problems = draft ? validate(draft) : [];
  const nothingToPublish = !!draft && changes.length === 0;
  const messages = nothingToPublish ? [...problems, "The draft matches the live version. There is nothing to publish."] : problems;
  const canPublish = !!draft && messages.length === 0;

  return (
    <div className="space-y-4">
      <div className="surface sticky top-0 z-10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <h2 className="t-label truncate">{step?.agent ?? `Step ${stepId} agent`}</h2>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Chip tone="ok">{`Live v${agent.version}`}</Chip>
              {draft ? (
                <Chip tone="warn" icon={Settings2}>
                  Draft: Unpublished edits
                </Chip>
              ) : (
                <Chip tone="neutral">No unpublished edits</Chip>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              icon={Undo2}
              disabled={!draft}
              onClick={() => {
                setConfirmDiscard(true);
                setPublishing(false);
              }}
            >
              Discard draft
            </Button>
            <Button
              variant="primary"
              icon={Rocket}
              disabled={!canPublish}
              onClick={() => {
                setPublishing(true);
                setConfirmDiscard(false);
              }}
            >
              Publish
            </Button>
          </div>
        </div>

        <div aria-live="polite">
          {messages.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {messages.map((m) => (
                <li key={m} className="flex items-start gap-1.5 text-xs text-danger-fg">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {m}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <Callout tone="info" icon={Globe} title="Applies to all quotations">
        These settings are shared. Once published, every quotation that reaches this step uses them.
      </Callout>

      <div aria-live="polite">{notice ? <Callout tone="ok">{notice}</Callout> : null}</div>

      <div ref={publishRef}>
        {confirmDiscard && draft ? (
          <Callout tone="warn" title="Discard all unpublished edits?">
            <p>The draft is deleted and the agent goes back to live v{agent.version}.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  discardAgentDraft(stepId);
                  setConfirmDiscard(false);
                  setNotice("Draft discarded.");
                }}
              >
                Discard draft
              </Button>
              <Button size="sm" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
            </div>
          </Callout>
        ) : null}

        {publishing && draft && canPublish ? (
          <PublishPanel
            nextVersion={agent.version + 1}
            changes={changes}
            onCancel={() => setPublishing(false)}
            onPublish={(note) => {
              publishAgent(stepId, note);
              setPublishing(false);
              setNotice(`Published v${agent.version + 1}. It is now live for all quotations.`);
            }}
          />
        ) : null}
      </div>

      <div className="w-full overflow-x-auto">
        <Segmented label="Agent sections" value={section} onChange={setSection} options={SECTIONS} />
      </div>

      <div role="region" aria-label={SECTIONS.find((s) => s.id === section)?.label}>
        {section === "prompts" ? <PromptsPanel body={body} live={live} update={update} /> : null}
        {section === "schema" ? <SchemaPanel body={body} update={update} /> : null}
        {section === "guardrails" ? <GuardrailsPanel body={body} update={update} /> : null}
        {section === "settings" ? <SettingsPanel body={body} update={update} /> : null}
        {section === "test" ? <TestPanel stepName={step?.name ?? `Step ${stepId}`} live={live} draft={draft} /> : null}
        {section === "versions" ? (
          <VersionsPanel
            agent={agent}
            onRestore={(v) => {
              restoreAgentVersion(stepId, v);
              setPublishing(false);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
