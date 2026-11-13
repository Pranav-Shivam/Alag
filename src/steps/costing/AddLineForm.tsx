import { useState } from "react";
import { Check, PenLine, Plus, X } from "lucide-react";
import { Button, Chip, Select, TextInput } from "../../components/ui";
import { usd } from "../../studio/calc";
import type { BomCategory, BomLine } from "../../studio/types";
import { ADDED_PREFIX, CATEGORY_LABEL, MIN_NOTE_CHARS, parseNum } from "./shared";

/** Adds a manual cost line to one of the given categories (the categories of the lane it sits in). It has no calculated original, so the typed values become the calculated ones and the reason goes to the activity log. */
export default function AddLineForm({ categories, onAdd }: { categories: BomCategory[]; onAdd: (line: BomLine, reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<BomCategory>(categories[0]);
  const [item, setItem] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");

  const q = parseNum(qty);
  const p = parseNum(price);
  const itemOk = item.trim().length >= 3;
  const unitOk = unit.trim().length >= 1;
  const qtyOk = q !== null && q > 0;
  const priceOk = p !== null && p >= 0;
  const reasonOk = reason.trim().length >= MIN_NOTE_CHARS;
  const canAdd = itemOk && unitOk && qtyOk && priceOk && reasonOk;

  const close = () => {
    setOpen(false);
    setItem("");
    setUnit("");
    setQty("1");
    setPrice("");
    setReason("");
  };

  const submit = () => {
    if (!canAdd || q === null || p === null) return;
    onAdd(
      {
        id: `${ADDED_PREFIX}${Date.now()}`,
        category,
        item: item.trim(),
        unit: unit.trim(),
        calcQty: q,
        calcUnitPrice: p,
        source: "manual",
      },
      reason.trim(),
    );
    close();
  };

  if (!open) {
    return (
      <Button icon={Plus} onClick={() => setOpen(true)} className="w-full @md:w-auto">
        Add a cost line
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      aria-label="Add a cost line"
      className="space-y-3 rounded-surface border border-line-strong bg-surface p-3 shadow-surface"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="t-label">Add a cost line</h3>
        <Chip tone="violet" icon={PenLine}>
          Source: Manual
        </Chip>
      </div>
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as BomCategory)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
        <TextInput label="Item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="For example: Brass handles" autoFocus />
        <TextInput label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="hour, sheet, lot" />
        <TextInput label="Quantity" type="number" inputMode="decimal" min={0} step="any" value={qty} onChange={(e) => setQty(e.target.value)} error={q !== null && q <= 0 ? "Quantity must be above zero." : undefined} />
        <TextInput label="Unit price (USD)" type="number" inputMode="decimal" min={0} step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="flex items-end text-sm text-ink-2" aria-live="polite">
          <span>
            Line total <strong className="font-semibold tabular-nums text-ink">{q !== null && p !== null ? usd(q * p, 2) : "n/a"}</strong>
          </span>
        </div>
      </div>
      <TextInput
        label="Reason for adding"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        hint={`Required, at least ${MIN_NOTE_CHARS} characters. It is saved in the activity log.`}
        error={reason.trim().length > 0 && !reasonOk ? `Write at least ${MIN_NOTE_CHARS} characters.` : undefined}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm" icon={Check} disabled={!canAdd}>
          Add line
        </Button>
        <Button size="sm" icon={X} onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
