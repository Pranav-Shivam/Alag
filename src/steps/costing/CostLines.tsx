import { useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Building2, Factory, Hammer, HardHat, Package, PaintBucket, Pencil, PenLine, RotateCcw, Trash2, Truck, Wrench } from "lucide-react";
import { Button, Card, Chip } from "../../components/ui";
import type { Tone } from "../../components/ui";
import { lineCalcTotal, lineDelta, lineQty, lineTotal, lineUnitPrice, usd } from "../../studio/calc";
import type { BomCategory, BomLine } from "../../studio/types";
import LineEditor from "./LineEditor";
import { CATEGORY_LABEL, CATEGORY_ORDER, VARIANCE_FLAG_PCT, fmtDate, fmtQty, isAddedLine, signedPct, signedUsd, variancePct } from "./shared";

type Override = NonNullable<BomLine["override"]>;

export interface CostActions {
  save: (line: BomLine, o: Override) => void;
  reset: (line: BomLine) => void;
  remove: (line: BomLine) => void;
}

const CATEGORY_ICON: Record<BomCategory, typeof Package> = {
  material: Package,
  labour: Hammer,
  manufacturing: Factory,
  finishing: PaintBucket,
  hardware: Wrench,
  logistics: Truck,
  installation: HardHat,
};

const SOURCE: Record<BomLine["source"], { label: string; tone: Tone; icon: typeof BookOpen }> = {
  price_book: { label: "Price book", tone: "info", icon: BookOpen },
  supplier: { label: "Supplier", tone: "teal", icon: Building2 },
  manual: { label: "Manual", tone: "violet", icon: PenLine },
};

/** Reset keeps the stored source as manual, so an untouched manual line that was not added here is shown as price book. */
function shownSource(l: BomLine): BomLine["source"] {
  if (l.source === "manual" && !l.override && !isAddedLine(l)) return "price_book";
  return l.source;
}

export function SourceBadge({ source }: { source: BomLine["source"] }) {
  const s = SOURCE[source];
  return (
    <Chip tone={s.tone} icon={s.icon}>
      {s.label}
    </Chip>
  );
}

const COLS = "@md:grid-cols-[minmax(0,1fr)_6rem_5rem_6.5rem]";

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted @md:hidden">{label}</div>
      <div className="break-words text-sm tabular-nums text-ink @md:text-right">{children}</div>
    </div>
  );
}

function LineRow({ line, editing, onEdit, actions }: { line: BomLine; editing: boolean; onEdit: (id: string | null) => void; actions: CostActions }) {
  if (editing) {
    return (
      <li className="p-3">
        <LineEditor
          line={line}
          onCancel={() => onEdit(null)}
          onSave={(o) => {
            actions.save(line, o);
            onEdit(null);
          }}
        />
      </li>
    );
  }

  const delta = lineDelta(line);
  const vp = variancePct(line);
  const flagged = vp !== null && Math.abs(vp) > VARIANCE_FLAG_PCT;
  const o = line.override;
  const added = isAddedLine(line);

  return (
    <li className="p-3">
      <div className={`grid gap-2 ${COLS} @md:items-start @md:gap-3`}>
        <div className="min-w-0">
          <div className="break-words text-sm font-medium text-ink">{line.item}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SourceBadge source={shownSource(line)} />
            {o ? (
              <Chip tone="warn" icon={Pencil}>
                Overridden
              </Chip>
            ) : null}
            {flagged ? (
              <Chip tone="alert" icon={AlertTriangle}>
                Over {VARIANCE_FLAG_PCT}% from calculated
              </Chip>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 @md:contents">
          <Cell label="Quantity">
            {fmtQty(lineQty(line))} {line.unit}
          </Cell>
          <Cell label="Unit price">{usd(lineUnitPrice(line), 2)}</Cell>
          <Cell label="Line total">
            <span className="font-semibold">{usd(lineTotal(line), 2)}</span>
            {delta !== 0 ? (
              <span className={`block text-xs ${delta > 0 ? "text-warn-fg" : "text-info-fg"}`}>
                {signedUsd(delta, 2)}
                {vp !== null ? ` (${signedPct(vp)})` : ""}
              </span>
            ) : null}
          </Cell>
        </div>
      </div>

      {o ? (
        <dl className="mt-2 grid gap-x-3 gap-y-1 rounded-control border border-line bg-surface-2 p-2.5 text-xs text-ink-2 @md:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-muted">Calculated</dt>
          <dd className="tabular-nums">
            {fmtQty(line.calcQty)} {line.unit} at {usd(line.calcUnitPrice, 2)} = {usd(lineCalcTotal(line), 2)}
          </dd>
          <dt className="text-muted">Changed by</dt>
          <dd>
            {o.by} on {fmtDate(o.at)}
          </dd>
          <dt className="text-muted">Reason</dt>
          <dd className="break-words">{o.reason}</dd>
        </dl>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" icon={Pencil} onClick={() => onEdit(line.id)} aria-label={`Edit ${line.item}`}>
          Edit
        </Button>
        {o ? (
          <Button size="sm" icon={RotateCcw} onClick={() => actions.reset(line)} aria-label={`Reset ${line.item} to price book`}>
            Reset to price book
          </Button>
        ) : null}
        {added ? (
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => actions.remove(line)} aria-label={`Remove ${line.item}`}>
            Remove
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export default function CostLines({ lines, actions, categories = CATEGORY_ORDER }: { lines: BomLine[]; actions: CostActions; categories?: BomCategory[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const group = lines.filter((l) => l.category === cat);
        if (group.length === 0) return null;
        const Icon = CATEGORY_ICON[cat];
        const subtotal = group.reduce((s, l) => s + lineTotal(l), 0);
        return (
          <Card key={cat} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-3 py-2">
              <h3 className="t-label flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
                {CATEGORY_LABEL[cat]}
                <span className="text-xs font-normal text-muted">
                  {group.length} {group.length === 1 ? "line" : "lines"}
                </span>
              </h3>
              <div className="text-sm tabular-nums text-ink">
                <span className="mr-1.5 text-xs text-muted">Subtotal</span>
                <span className="font-semibold">{usd(subtotal, 2)}</span>
              </div>
            </div>
            <div className={`hidden border-b border-line px-3 py-1.5 text-xs font-medium text-muted @md:grid @md:gap-3 ${COLS}`} aria-hidden="true">
              <span>Item</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Line total</span>
            </div>
            <ul className="divide-y divide-line">
              {group.map((l) => (
                <LineRow key={l.id} line={l} editing={editingId === l.id} onEdit={setEditingId} actions={actions} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
