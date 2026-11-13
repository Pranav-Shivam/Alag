import { useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button, Switch, TextInput } from "../../components/ui";
import type { ExtractedField } from "../../studio/types";
import { keyFromLabel } from "./fieldMeta";

/** Small form for a field the agent did not look for. The key follows the label until the person types their own. */
export default function AddFieldForm({ existingKeys, onAdd }: { existingKeys: string[]; onAdd: (field: ExtractedField) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [required, setRequired] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setLabel("");
    setKey("");
    setKeyTouched(false);
    setValue("");
    setUnit("");
    setRequired(false);
    setSubmitted(false);
    setOpen(false);
  };

  const labelError = !label.trim() ? "Give the field a name." : undefined;
  const keyError = !/^[a-z][a-z0-9_]*$/.test(key) ? "Use lowercase letters, numbers and underscores. Start with a letter." : existingKeys.includes(key) ? "A field with this key already exists." : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (labelError || keyError) return;
    const v = value.trim();
    onAdd({
      key,
      label: label.trim(),
      value: v || null,
      unit: unit.trim() || undefined,
      confidence: null,
      state: v ? "edited" : "missing",
      required,
      note: "Added by a human.",
    });
    reset();
  };

  if (!open) {
    return (
      <Button icon={Plus} onClick={() => setOpen(true)}>
        Add a missing field
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="surface space-y-3 p-3" aria-label="Add a field">
      <h4 className="t-label">Add a field the agent did not look for</h4>
      <div className="grid gap-3 @md:grid-cols-2">
        <TextInput
          label="Label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (!keyTouched) setKey(keyFromLabel(e.target.value));
          }}
          error={submitted ? labelError : undefined}
        />
        <TextInput
          label="Key"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setKeyTouched(true);
          }}
          hint="Filled in from the label. Snake case."
          error={submitted || keyTouched ? keyError : undefined}
        />
        <TextInput label="Value" value={value} onChange={(e) => setValue(e.target.value)} hint="Leave empty if it is still unknown." />
        <TextInput label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} hint="For example in or cm. Optional." />
      </div>
      <div className="flex items-center gap-2.5">
        <Switch checked={required} onChange={setRequired} label="Required" />
        <span className="text-sm text-ink-2">Required for the quotation</span>
      </div>
      <div className="flex gap-1.5">
        <Button type="submit" variant="primary" icon={Plus}>
          Add field
        </Button>
        <Button onClick={reset}>Cancel</Button>
      </div>
    </form>
  );
}
