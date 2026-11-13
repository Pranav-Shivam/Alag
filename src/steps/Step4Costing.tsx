import { Check, Factory, FileWarning, History, Lock, Minus, RotateCcw, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import type { CaseProps } from "../components/inspector/types";
import { Button, Callout, Card, Chip } from "../components/ui";
import { bomTotals, lineTotal, usd } from "../studio/calc";
import { useCase, useRules, useStudio } from "../studio/store";
import type { BomLine, RegionModifier } from "../studio/types";
import AddLineForm from "./costing/AddLineForm";
import CostLines from "./costing/CostLines";
import type { CostActions } from "./costing/CostLines";
import Suggestions from "./costing/Suggestions";
import { LANE_CATEGORIES, signedPct, signedUsd } from "./costing/shared";
import type { Lane } from "./costing/shared";

function Stat({ label, value, sub, tone = "text-ink", icon: Icon }: { label: string; value: string; sub?: string; tone?: string; icon?: typeof Minus }) {
  return (
    <div className="min-w-0 rounded-control border border-line bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1 break-words text-base font-semibold tabular-nums ${tone}`}>
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        {value}
      </div>
      {sub ? <div className={`text-xs tabular-nums ${tone === "text-ink" ? "text-muted" : tone}`}>{sub}</div> : null}
    </div>
  );
}

const LANE_INFO: Record<Lane, { number: number; title: string; icon: typeof Factory; blurb: string; confirm: string }> = {
  manufacturing: {
    number: 1,
    title: "Manufacturing input",
    icon: Factory,
    blurb: "Runs first. Manufacturing decides how the job is made: routing, labour and machine hours, finishing and on-site work. This tells procurement what has to be bought, how much, and by when.",
    confirm: "Confirm manufacturing input",
  },
  procurement: {
    number: 2,
    title: "Procurement input",
    icon: ShoppingCart,
    blurb: "Runs second. Procurement prices what manufacturing needs: materials, bought-in parts and freight. Use price book prices first, and ask suppliers for a quote only where the price book has none.",
    confirm: "Confirm procurement input",
  },
};

interface LaneProps {
  lane: Lane;
  lines: BomLine[];
  actions: CostActions;
  region: RegionModifier | undefined;
  confirmed: boolean;
  locked: boolean;
  onAddLine: (line: BomLine, reason: string) => void;
  onToggle: (confirmed: boolean) => void;
}

function LaneSection({ lane, lines, actions, region, confirmed, locked, onAddLine, onToggle }: LaneProps) {
  const info = LANE_INFO[lane];
  const Icon = info.icon;
  const categories = LANE_CATEGORIES[lane];
  const laneLines = lines.filter((l) => categories.includes(l.category));
  const subtotal = laneLines.reduce((sum, l) => sum + lineTotal(l), 0);

  return (
    <section aria-label={info.title} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="t-section flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs text-on-accent" aria-hidden="true">
              {info.number}
            </span>
            <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
            {info.title}
          </h2>
          <p className="mt-1 max-w-prose text-xs text-muted">{info.blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-ink">
            <span className="mr-1.5 text-xs text-muted">Lane subtotal</span>
            <span className="font-semibold">{usd(subtotal, 2)}</span>
          </span>
          {locked ? (
            <Chip tone="neutral" icon={Lock}>
              Waiting for manufacturing
            </Chip>
          ) : confirmed ? (
            <Chip tone="ok" icon={Check}>
              Confirmed
            </Chip>
          ) : (
            <Chip tone="warn">In progress</Chip>
          )}
        </div>
      </div>

      {locked ? (
        <Callout tone="info" icon={Lock} title="Procurement starts after manufacturing">
          Confirm the manufacturing input above first. Until then the quantities procurement has to buy can still change.
        </Callout>
      ) : (
        <>
          <CostLines lines={lines} actions={actions} categories={categories} />
          <AddLineForm categories={categories} onAdd={onAddLine} />
          <Suggestions lines={lines} categories={categories} region={region} onAdd={onAddLine} />
          <div className="flex flex-wrap items-center gap-2">
            {confirmed ? (
              <Button size="sm" icon={RotateCcw} onClick={() => onToggle(false)}>
                Reopen {lane} input
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon={Check} onClick={() => onToggle(true)}>
                {info.confirm}
              </Button>
            )}
            {lane === "manufacturing" && confirmed ? <span className="text-xs text-muted">Reopening this also reopens procurement.</span> : null}
          </div>
        </>
      )}
    </section>
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
  const setLaneConfirmed = useStudio((s) => s.setLaneConfirmed);

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

      <LaneSection lane="manufacturing" lines={bom} actions={actions} region={region} confirmed={c.lanes.manufacturing} locked={false} onAddLine={addLine} onToggle={(v) => setLaneConfirmed(qid, "manufacturing", v)} />

      <LaneSection lane="procurement" lines={bom} actions={actions} region={region} confirmed={c.lanes.procurement} locked={!c.lanes.manufacturing} onAddLine={addLine} onToggle={(v) => setLaneConfirmed(qid, "procurement", v)} />

      {c.lanes.manufacturing && c.lanes.procurement ? (
        <Callout tone="ok" icon={Check} title="Estimate ready for margin">
          Manufacturing and procurement have both confirmed their input, so the cost estimate can go to margin intelligence.
        </Callout>
      ) : null}

      <Card className="p-3">
        <p className="text-xs text-muted">
          Overrides never replace the calculated value. Each one keeps the original, the difference, a reason, who made it and when. Changes above 5 percent are flagged for review. The cost engine is deterministic, so AI never invents a price.
        </p>
      </Card>
    </div>
  );
}
