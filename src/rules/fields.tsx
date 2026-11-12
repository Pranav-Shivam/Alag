import { useId, useState } from "react";
import type { ReactNode } from "react";

/* Small form controls used by the rules editor. Colors are semantic tokens only. */

const INPUT =
  "w-full min-h-10 rounded-lg border border-line-strong bg-surface text-sm text-ink tabular-nums transition-colors hover:border-muted focus:border-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

/** Label for a table cell: visible on narrow (stacked card), screen reader only on wide (header row shows it). */
export const CELL_LABEL = "mb-1 block text-xs font-medium text-ink-2 @md:sr-only";
export const FIELD_LABEL = "mb-1 block text-xs font-medium text-ink-2";

interface BoxProps {
  label: string;
  value: number | undefined;
  optional: boolean;
  onValue: (n: number | undefined) => void;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  labelClass?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Text based number box that allows a minus sign, a trailing dot and an empty state while typing.
 * It keeps what the user typed until it disagrees with the stored value.
 */
function NumberBox({ label, value, optional, onValue, min, max, prefix, suffix, placeholder, labelClass = FIELD_LABEL, hint, disabled, className = "" }: BoxProps) {
  const id = useId();
  const [txt, setTxt] = useState<string | null>(null);
  const canon = value === undefined ? "" : String(value);
  const typedNum = txt === null ? undefined : txt.trim() === "" ? (optional ? undefined : Number.NaN) : parseFloat(txt);
  const inSync = txt !== null && (typedNum === undefined ? value === undefined : Number.isNaN(typedNum) || typedNum === value);
  const shown = inSync && txt !== null ? txt : canon;

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted">{prefix}</span> : null}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={shown}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            if (!/^-?\d*\.?\d*$/.test(raw)) return;
            setTxt(raw);
            if (raw.trim() === "") {
              if (optional) onValue(undefined);
              return;
            }
            const n = parseFloat(raw);
            if (Number.isFinite(n)) onValue(clamp(n));
          }}
          onBlur={() => setTxt(null)}
          className={`${INPUT} ${prefix ? "pl-6" : "pl-3"} ${suffix ? "pr-6" : "pr-3"}`}
        />
        {suffix ? <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted">{suffix}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

type NumProps = Omit<BoxProps, "optional" | "onValue" | "value"> & { value: number; onChange: (n: number) => void };

export function NumInput({ onChange, value, ...rest }: NumProps) {
  return <NumberBox {...rest} value={value} optional={false} onValue={(n) => (n !== undefined ? onChange(n) : undefined)} />;
}

type OptProps = Omit<BoxProps, "optional" | "onValue" | "value"> & { value: number | undefined; onChange: (n: number | undefined) => void };

export function OptNumInput({ onChange, value, ...rest }: OptProps) {
  return <NumberBox {...rest} value={value} optional onValue={onChange} />;
}

/** Slider paired with a number input. Only for bounded percentages. */
export function PctSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.5,
  hint,
  children,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          type="range"
          aria-label={`${label}, slider`}
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-6 min-w-0 flex-1 cursor-pointer accent-accent"
        />
        <NumInput label={label} labelClass="sr-only" value={value} onChange={onChange} min={min} max={max} suffix="%" className="w-24 shrink-0" />
      </div>
      <p className="mt-1 text-xs text-muted tabular-nums">
        Allowed range {min} to {max} percent.
      </p>
      {hint ? <p className="mt-1.5 text-sm text-ink-2">{hint}</p> : null}
      {children}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  labelClass = FIELD_LABEL,
  disabled,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labelClass?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const opts = options.includes(value) ? options : [...options, value];
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-colors hover:border-muted focus:border-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
      >
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
