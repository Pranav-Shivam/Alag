import { FileWarning, History, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { CaseProps } from "../components/inspector/types";
import { Callout, Card } from "../components/ui";
import { bomTotals, usd } from "../studio/calc";
import { useCase, useRules, useStudio } from "../studio/store";
import type { BomLine } from "../studio/types";
import AddLineForm from "./costing/AddLineForm";
import CostLines from "./costing/CostLines";
import type { CostActions } from "./costing/CostLines";
import Suggestions from "./costing/Suggestions";
import { signedPct, signedUsd } from "./costing/shared";

function Stat({ label, value, sub, tone = "text-ink", icon: Icon }: { label: string; value: string; sub?: string; tone?: string; icon?: typeof Minus }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1 break-words text-base font-semibold tabular-nums ${tone}`}>
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        {value}
      </div>
      {sub ? <div className={`text-xs tabular-nums ${tone === "text-ink" ? "text-muted" : tone}`}>{sub}</div> : null}
    </div>
  );
}

export default function Step4Costing({ quotation, status }: CaseProps) {
  const qid = quotation.id;
  const c = useCase(qid);
  const rules = useRules();
  const setBomOverride = useStudio((s) => s.setBomOverride);
  const addBomLine = useStudio((s) => s.addBomLine);
  const removeBomLine = useStudio((s) => s.removeBomLine);
  const logActivity = useStudio((s) => s.logActivity);

  const bom = c?.bom ?? [];
  const totals = bomTotals(bom);
  const deltaPct = totals.calc === 0 ? 0 : (totals.delta / totals.calc) * 100;
  const region = rules.live.regionModifiers.find((m) => m.region === quotation.region);
  const approved = status === "done";

  /** Editing an approved estimate is allowed, but it is recorded as a revision. */
  const noteRevision = (what: string) => {
    if (!approved) return;
    logActivity(qid, { stepId: 4, actor: "System", who: "Revision control", text: `Estimate revision opened: ${what} on an approved estimate` });
  };

  const actions: CostActions = {
    save: (line, o) => {
      setBomOverride(qid, line.id, o);
      noteRevision(`override of ${line.item}`);
    },
    reset: (line) => {
      setBomOverride(qid, line.id, null);
      noteRevision(`reset of ${line.item} to the price book`);
    },
    remove: (line) => {
      removeBomLine(qid, line.id);
      logActivity(qid, { stepId: 4, actor: "Human", who: "You", text: `Removed cost line ${line.item}` });
      noteRevision(`removal of ${line.item}`);
    },
  };

  const addLine = (line: BomLine, reason: string) => {
    addBomLine(qid, line);
    logActivity(qid, { stepId: 4, actor: "Human", who: "You", text: `Reason for adding ${line.item}: ${reason}` });
    noteRevision(`new line ${line.item}`);
  };

  const regionNote = (
    <p className="text-xs text-muted">
      Region modifiers come from pricing rules version {rules.version}.{" "}
      {region
        ? `${region.region}: labour ${signedPct(region.labourPct, 0)}, material ${signedPct(region.materialPct, 0)}, transport ${signedPct(region.transportPct, 0)} against the price book.`
        : `No region modifier is defined for ${quotation.region}, so price book prices apply unchanged.`}
    </p>
  );

  if (!c || bom.length === 0) {
    return (
      <div className="@container space-y-3">
        <Callout tone="info" icon={FileWarning} title="No bill of materials yet">
          The design has not been approved, so the cost engine has nothing to price. Once the RFQ is approved and the design is confirmed, the cost lines appear here with their price book sources.
        </Callout>
        {regionNote}
      </div>
    );
  }

  const up = totals.delta > 0;
  const deltaTone = totals.delta === 0 ? "text-ink" : up ? "text-warn-fg" : "text-info-fg";

  return (
    <div className="@container space-y-4">
      <section aria-label="Cost summary" aria-live="polite">
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-5">
          <Stat label="Calculated total" value={usd(totals.calc)} sub="Cost engine" />
          <Stat label="Current total" value={usd(totals.effective)} sub="With overrides" />
          <Stat
            label="Delta"
            value={signedUsd(totals.delta)}
            sub={totals.calc === 0 ? undefined : signedPct(deltaPct)}
            tone={deltaTone}
            icon={totals.delta === 0 ? Minus : up ? TrendingUp : TrendingDown}
          />
          <Stat label="Overrides" value={String(totals.overrides)} sub={totals.overrides === 1 ? "line changed" : "lines changed"} />
          <Stat label="Cost lines" value={String(bom.length)} sub={`${new Set(bom.map((l) => l.category)).size} groups`} />
        </div>
        <div className="mt-2">{regionNote}</div>
      </section>

      {approved ? (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          This estimate is approved. Changing an approved estimate creates a revision, and every change is logged with who and when.
        </p>
      ) : null}

      <CostLines lines={bom} actions={actions} />

      <AddLineForm onAdd={addLine} />

      <Suggestions lines={bom} region={region} onAdd={addLine} />

      <Card className="p-3">
        <p className="text-xs text-muted">
          Overrides never replace the calculated value. Each one keeps the original, the difference, a reason, who made it and when. Changes above 5 percent are flagged for review. The cost engine is deterministic, so AI never invents a price.
        </p>
      </Card>
    </div>
  );
}
