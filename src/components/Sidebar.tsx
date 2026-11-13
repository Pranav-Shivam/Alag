import type { KeyboardEvent } from "react";
import MaterialSymbol from "./common/MaterialSymbol";
import obeMark from "../assets/obe-favicon.jpeg";

export type NavItem<T extends string> = { id: T; label: string; symbol: string };

type Props<T extends string> = {
  items: NavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  onHome: () => void;
  dark: boolean;
  onToggleTheme: () => void;
};

/** Esti-360 icon rail: OBE mark on top, page buttons, theme switch at the bottom. */
export default function Sidebar<T extends string>({ items, active, onSelect, onHome, dark, onToggleTheme }: Props<T>) {
  // Up/Down/Home/End move between pages, as in the WAI-ARIA tabs pattern for a vertical tab list.
  const onKey = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const next = e.key === "ArrowDown" ? (index + 1) % items.length : e.key === "ArrowUp" ? (index - 1 + items.length) % items.length : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(items[next].id);
    document.getElementById(`tab-${items[next].id}`)?.focus();
  };

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col border-r border-on-brand/10 bg-brand text-on-brand">
      <div className="flex h-16 shrink-0 items-center justify-center p-1">
        <button type="button" onClick={onHome} aria-label="Go to home, Oldcastle BuildingEnvelope" className="grid h-12 w-12 place-items-center rounded-md bg-tile ring-1 ring-on-brand/10 transition-opacity hover:opacity-95">
          <img src={obeMark} alt="" className="h-10 w-10 select-none object-contain" draggable={false} />
        </button>
      </div>

      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-1 px-2 py-3">
        <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
          {items.map((t, i) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                aria-label={t.label}
                data-label={t.label}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(t.id)}
                onKeyDown={(e) => onKey(e, i)}
                className="sidebar-nav-btn"
              >
                <MaterialSymbol name={t.symbol} filled={selected} className="text-2xl" />
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex shrink-0 flex-col gap-0.5 border-t border-on-brand/10 px-2 py-1.5">
        <button type="button" onClick={onToggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} data-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="sidebar-nav-btn">
          <MaterialSymbol name={dark ? "light_mode" : "dark_mode"} className="text-2xl" />
        </button>
      </div>
    </aside>
  );
}
