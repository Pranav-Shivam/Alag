import { useId, useState } from "react";
import { Field } from "../ui";
import { FIELD_BASE } from "./styles";

interface InputProps {
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  onCommit: (n: number | undefined) => void;
  allowEmpty?: boolean;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

/** Number input that lets people type freely ("0." while typing 0.5) and clamps as soon as the text is a valid number. */
export function NumberInput({ value, min, max, step, onCommit, allowEmpty, placeholder, id, className = "", ...rest }: InputProps) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === undefined ? "" : String(value));

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={rest["aria-label"]}
      value={shown}
      onFocus={() => setText(value === undefined ? "" : String(value))}
      onBlur={() => setText(null)}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw === "") {
          if (allowEmpty) onCommit(undefined);
          return;
        }
        const n = parseFloat(raw);
        if (Number.isNaN(n)) return;
        onCommit(Math.min(max, Math.max(min, n)));
      }}
      className={`${FIELD_BASE} min-h-10 tabular-nums ${className}`}
    />
  );
}

export function NumberField({ label, hint, ...input }: InputProps & { label: string; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <NumberInput {...input} id={id} />
    </Field>
  );
}

/** Range slider with a number box next to it. Both edit the same value. */
export function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-10 min-w-0 flex-1 cursor-pointer accent-accent"
        />
        <NumberInput value={value} min={min} max={max} step={step} onCommit={(n) => n !== undefined && onChange(n)} aria-label={`${label}, number`} className="w-20! shrink-0" />
      </div>
    </Field>
  );
}
