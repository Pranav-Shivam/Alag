import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "../lib/theme";

const OPTIONS: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "system", label: "System", Icon: Monitor },
  { id: "dark", label: "Dark", Icon: Moon },
];

export default function ThemeToggle({ mode, onChange }: { mode: ThemeMode; onChange: (m: ThemeMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Color theme" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={
              "grid h-8 w-8 place-items-center rounded-md transition-colors " +
              (active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink")
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
