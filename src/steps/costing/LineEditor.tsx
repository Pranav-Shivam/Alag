import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button, Callout, Select, TextArea, TextInput } from "../../components/ui";
import { lineCalcTotal, usd } from "../../studio/calc";
import type { BomLine } from "../../studio/types";
import { MIN_NOTE_CHARS, OVERRIDE_REASONS, VARIANCE_FLAG_PCT, fmtQty, parseNum, signedPct, signedUsd } from "./shared";

type Override = NonNullable<BomLine["override"]>;

/** Inline editor for one cost line. The calculated values stay on the line, only an override is written. */
export default function LineEditor({ line, onSave, onCancel }: { line: BomLine; onSave: (o: Override) => void; onCancel: () => void }) {
  const [qty, setQty] = useState(String(line.override?.qty ?? line.calcQty));
  const [price, setPrice] = useState(String(line.override?.unitPrice ?? line.calcUnitPrice));
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");

  const q = parseNum(qty);
  const p = parseNum(price);
  const qtyError = q === null || q < 0 ? "Enter a quantity of zero or more." : undefined;
  const priceError = p === null || p < 0 ? "Enter a unit price of zero or more." : undefined;
  const noteTrimmed = note.trim();
  const noteError = noteTrimmed.length > 0 && noteTrimmed.length < MIN_NOTE_CHARS ? `Write at least ${MIN_NOTE_CHARS} characters. ${noteTrimmed.length} so far.` : undefined;

  const valid = q !== null && p !== null && !qtyError && !priceError;
  const newTotal = valid ? q * p : null;
  const calcTotal = lineCalcTotal(line);
  const delta = newTotal === null ? null : newTotal - calcTotal;
  const deltaPct = delta === null || calcTotal === 0 ? null : (delta / calcTotal) * 100;
  const unchanged = valid && q === line.calcQty && p === line.calcUnitPrice;
  const bigChange = deltaPct !== null && Math.abs(deltaPct) > VARIANCE_FLAG_PCT;

  const canSave = valid && !unchanged && reason !== "" && noteTrimmed.length >= MIN_NOTE_CHARS;
  const missing = !valid ? "Fix the quantity and price." : unchanged ? "Change the quantity or the price to save an override." : reason === "" ? "Choose a reason." : noteTrimmed.length < MIN_NOTE_CHARS ? `Add a note of at least ${MIN_NOTE_CHARS} characters.` : null;

  const save = () => {
    if (!canSave || q === null || p === null) return;
    onSave({ qty: q, unitPrice: p, reason: `${reason}: ${noteTrimmed}`, by: "You", at: new Date().toISOString() });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      aria-label={`Edit ${line.item}`}
      className="space-y-3 rounded-lg border border-line-strong bg-surface-2 p-3"
    >
      <div className="text-sm font-semibold text-ink">Override {line.item}</div>
      <p className="text-xs text-muted">
        Calculated by the cost engine: {fmtQty(line.calcQty)} {line.unit} at {usd(line.calcUnitPrice, 2)} = {usd(calcTotal, 2)}. The calculated value is kept and never overwritten.
      </p>

      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <TextInput label={`Quantity (${line.unit})`} type="number" inputMode="decimal" min={0} step="any" value={qty} onChange={(e) => setQty(e.target.value)} error={qtyError} autoFocus />
        <TextInput label="Unit price (USD)" type="number" inputMode="decimal" min={0} step="any" value={price} onChange={(e) => setPrice(e.target.value)} error={priceError} />
      </div>

      <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
        <option value="">Choose a reason</option>
        {OVERRIDE_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
      <TextArea
        label="Note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={noteError}
        hint={`Required, at least ${MIN_NOTE_CHARS} characters. Say what changed and who confirmed it.`}
        placeholder="For example: Supplier quote 2 Nov, 8 percent above the price book"
      />

      <div aria-live="polite" className="rounded-lg border border-line bg-surface p-2.5 text-sm">
        {newTotal === null || delta === null ? (
          <span className="text-muted">Enter a valid quantity and price to see the new total.</span>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span>
              New total <strong className="font-semibold tabular-nums">{usd(newTotal, 2)}</strong>
            </span>
            <span className="tabular-nums text-ink-2">
              Versus calculated {signedUsd(delta, 2)}
              {deltaPct !== null ? ` (${signedPct(deltaPct)})` : ""}
            </span>
          </div>
        )}
      </div>

      {bigChange ? (
        <Callout tone="warn" icon={AlertTriangle} title={`More than ${VARIANCE_FLAG_PCT} percent from the calculated value`}>
          This change will be flagged for review. A reason and a note are required, and both are saved with the override.
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm" icon={Check} disabled={!canSave}>
          Save override
        </Button>
        <Button size="sm" icon={X} onClick={onCancel}>
          Cancel
        </Button>
        {missing ? <span className="text-xs text-muted">{missing}</span> : null}
      </div>
    </form>
  );
}
