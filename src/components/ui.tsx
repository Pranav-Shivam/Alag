import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { Info } from "lucide-react";
import AppLoader from "./common/AppLoader";

/* Shared building blocks so every editor in the inspector looks the same. Colors are semantic tokens only. */

export type Tone = "neutral" | "ok" | "warn" | "alert" | "danger" | "info" | "violet" | "teal";

/** Soft surface with tinted text and border. Class names are written out so Tailwind can see them. */
export const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  ok: "bg-ok-soft text-ok-fg border-ok-line",
  warn: "bg-warn-soft text-warn-fg border-warn-line",
  alert: "bg-alert-soft text-alert-fg border-alert-line",
  danger: "bg-danger-soft text-danger-fg border-danger-line",
  info: "bg-info-soft text-info-fg border-info-line",
  violet: "bg-violet-soft text-violet-fg border-violet-line",
  teal: "bg-teal-soft text-teal-fg border-teal-line",
};

export const TONE_SOLID: Record<Tone, string> = {
  neutral: "bg-line-strong",
  ok: "bg-ok-solid",
  warn: "bg-warn-solid",
  alert: "bg-alert-solid",
  danger: "bg-danger-solid",
  info: "bg-info-solid",
  violet: "bg-violet-solid",
  teal: "bg-teal-solid",
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted",
  ok: "text-ok-fg",
  warn: "text-warn-fg",
  alert: "text-alert-fg",
  danger: "text-danger-fg",
  info: "text-info-fg",
  violet: "text-violet-fg",
  teal: "text-teal-fg",
};

type IconType = (p: { className?: string; "aria-hidden"?: boolean | "true" | "false" }) => ReactNode;

export function Chip({ tone = "neutral", icon: Icon, children, className = "" }: { tone?: Tone; icon?: IconType; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[tone]} ${className}`}>
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-mint text-mint-fg hover:bg-mint-hover border-transparent shadow-surface",
  secondary: "bg-surface text-ink border-line-strong hover:bg-surface-2",
  ghost: "bg-transparent text-ink-2 border-transparent hover:bg-surface-2",
  danger: "bg-danger-soft text-danger-fg border-danger-line hover:brightness-95",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  loading = false,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; icon?: IconType; loading?: boolean }) {
  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-control border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-3.5 text-sm"
      } ${VARIANT[variant]} ${className}`}
    >
      {loading ? <AppLoader variant="icon" size="xs" onMint={variant === "primary"} /> : Icon ? <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Card({ children, className = "", as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={`surface ${className}`}>{children}</As>;
}

/** Intro under the app header: optional title (h2) and one sentence of description. The app header holds the page's h1. */
export function PageHeader({ title, description, actions }: { title?: string; description: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {title ? <h2 className="t-title">{title}</h2> : null}
        <p className={`max-w-3xl text-sm text-muted ${title ? "mt-1" : ""}`}>{description}</p>
      </div>
      {actions}
    </header>
  );
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="t-label">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Callout({ tone = "info", title, children, icon: Icon = Info, className = "" }: { tone?: Tone; title?: string; children?: ReactNode; icon?: IconType; className?: string }) {
  return (
    <div role={tone === "danger" || tone === "alert" ? "alert" : "status"} className={`flex gap-2.5 rounded-control border p-3 text-sm ${TONE[tone]} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, className = "" }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; icon?: IconType }[]; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex max-w-full overflow-x-auto rounded-control border border-line bg-surface-2 p-0.5 ${className}`}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-chip px-3 text-xs font-medium transition-colors ${
              active ? "bg-surface text-ink shadow-surface ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            {o.icon ? <o.icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-transparent bg-accent" : "border-line-strong bg-surface-2"}`}
    >
      <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-surface shadow-surface ring-1 ring-line transition-all ${checked ? "left-[1.1rem]" : "left-0.5"}`} />
    </button>
  );
}

const FIELD = "w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted transition-colors hover:border-muted focus:border-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger-fg">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, error, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input id={id} {...rest} className={`${FIELD} min-h-10 ${className}`} />
    </Field>
  );
}

export function TextArea({ label, hint, error, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <textarea id={id} {...rest} className={`${FIELD} py-2 leading-relaxed ${className}`} />
    </Field>
  );
}

export function Select({ label, hint, children, className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} {...rest} className={`${FIELD} min-h-10 ${className}`}>
        {children}
      </select>
    </Field>
  );
}

/** Confidence as a word plus a thin bar. Never color alone. Thresholds: 85 high, 60 medium. */
export function confidenceLevel(pct: number | null): { word: string; tone: Tone } {
  if (pct === null) return { word: "No value", tone: "neutral" };
  if (pct >= 85) return { word: "High", tone: "ok" };
  if (pct >= 60) return { word: "Medium", tone: "warn" };
  return { word: "Low", tone: "danger" };
}

export function ConfidenceMeter({ pct, className = "" }: { pct: number | null; className?: string }) {
  const { word, tone } = confidenceLevel(pct);
  return (
    <div className={`flex items-center gap-2 ${className}`} title={pct === null ? "No confidence score" : `${pct}% confidence`}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className={`h-full rounded-full ${TONE_SOLID[tone]}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${TONE_TEXT[tone]}`}>{pct === null ? word : `${pct}% ${word}`}</span>
    </div>
  );
}

/** Small "Simulated" marker shown wherever the POC fakes an AI call. */
export function SimulatedTag() {
  return <Chip tone="violet">Simulated</Chip>;
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.round(diff / 86400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
