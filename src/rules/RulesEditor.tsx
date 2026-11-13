import { useMemo, useState } from "react";
import { CircleCheck, Globe, Pencil, TriangleAlert, Undo2, Upload } from "lucide-react";
import type { RulesTabProps } from "../components/inspector/types";
import { Button, Callout, Card, Chip, Segmented, SectionTitle, TextArea } from "../components/ui";
import { validateRules } from "../studio/calc";
import { useRules, useStudio } from "../studio/store";
import type { PricingRules } from "../studio/types";
import DiscountSection from "./DiscountSection";
import HistoryList from "./HistoryList";
import MarginSection from "./MarginSection";
import PreviewCard from "./PreviewCard";
import RegionSection from "./RegionSection";
import { diffRules } from "./diff";
import { riskWarnings } from "./helpers";

type Section = RulesTabProps["focus"];

const SECTIONS: { id: Section; label: string }[] = [
  { id: "margin", label: "Margin rules" },
  { id: "region", label: "Region modifiers" },
  { id: "discount", label: "Discounts and approvals" },
];

export default function RulesEditor({ focus }: RulesTabProps) {
  const state = useRules();
  const update = useStudio((s) => s.updateRulesDraft);
  const discard = useStudio((s) => s.discardRulesDraft);
  const publish = useStudio((s) => s.publishRules);
  const restore = useStudio((s) => s.restoreRulesVersion);

  const { live, draft } = state;
  const cur: PricingRules = draft ?? live;

  const [section, setSection] = useState<Section>(focus);
  const [seenFocus, setSeenFocus] = useState<Section>(focus);
  if (seenFocus !== focus) {
    setSeenFocus(focus);
    setSection(focus);
  }

  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState("");
  const [published, setPublished] = useState<number | null>(null);

  const problems = useMemo(() => validateRules(cur), [cur]);
  const warnings = useMemo(() => riskWarnings(cur), [cur]);
  const changes = useMemo(() => (draft ? diffRules(live, draft) : []), [live, draft]);

  const canPublish = draft !== null && problems.length === 0 && changes.length > 0;
  const noteOk = note.trim().length >= 5;
  const panelOpen = publishing && draft !== null;

  const doPublish = () => {
    if (!canPublish || !noteOk) return;
    publish(note.trim());
    setPublished(state.version + 1);
    setPublishing(false);
    setNote("");
  };

  const edit = (patch: Partial<PricingRules>) => {
    setPublished(null);
    update(patch);
  };

  return (
    <div className="@container space-y-4">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 space-y-2 rounded-surface border border-line bg-surface/95 p-3 shadow-surface backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="ok" icon={CircleCheck}>
            Live rules version {state.version}
          </Chip>
          {draft ? (
            <Chip tone="warn" icon={Pencil}>
              Draft
            </Chip>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={Undo2}
              disabled={!draft}
              onClick={() => {
                discard();
                setPublishing(false);
              }}
            >
              Discard draft
            </Button>
            <Button size="sm" variant="primary" icon={Upload} disabled={!canPublish} aria-describedby={problems.length > 0 ? "rules-problems" : undefined} onClick={() => setPublishing((p) => !p)}>
              Publish
            </Button>
          </div>
        </div>
        {draft && problems.length > 0 ? (
          <div id="rules-problems" role="alert" className="rounded-control border border-danger-line bg-danger-soft p-2.5 text-xs text-danger-fg">
            <div className="font-semibold">Fix {problems.length === 1 ? "this problem" : `these ${problems.length} problems`} to publish</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {draft && problems.length === 0 && changes.length === 0 ? <p className="text-xs text-muted">The draft matches the live rules. There is nothing to publish.</p> : null}
      </div>

      {published !== null && !draft ? (
        <Callout tone="ok" icon={CircleCheck} title={`Version ${published} is live`}>
          All quotations now use the new rules.
        </Callout>
      ) : null}

      {panelOpen ? (
        <Card className="space-y-3 p-4">
          <SectionTitle title={`Publish version ${state.version + 1}`} hint="Every quotation uses these rules from the moment you publish." />
          <TextArea
            label="Change note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            hint="At least 5 characters. It appears in the version history."
            error={note.length > 0 && !noteOk ? "Write at least 5 characters." : undefined}
          />
          <div>
            <h4 className="text-xs font-semibold text-ink-2">What changes compared with live version {state.version}</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setPublishing(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Upload} disabled={!canPublish || !noteOk} onClick={doPublish}>
              Publish version {state.version + 1}
            </Button>
          </div>
        </Card>
      ) : null}

      <Callout tone="info" icon={Globe}>
        Applies to all quotations. Changes here affect every quotation in every step, not only the one you have open.
      </Callout>

      {warnings.length > 0 ? (
        <Callout tone="warn" icon={TriangleAlert} title="Check these risky settings">
          <ul className="list-disc space-y-0.5 pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {/* Sections */}
      <div className="space-y-3">
        <Segmented<Section> label="Rule sections" value={section} onChange={setSection} options={SECTIONS} className="w-full" />
        <Card className="p-4">
          {section === "margin" ? <MarginSection rules={cur} set={edit} /> : null}
          {section === "region" ? <RegionSection rules={cur} set={edit} /> : null}
          {section === "discount" ? <DiscountSection rules={cur} set={edit} /> : null}
        </Card>
      </div>

      <PreviewCard rules={cur} />

      <HistoryList
        state={state}
        onRestore={(v) => {
          setPublished(null);
          restore(v);
        }}
      />
    </div>
  );
}
