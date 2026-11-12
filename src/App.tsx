import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Bot, GitBranch, ShieldCheck, Table2 } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import { QUOTATIONS } from "./data/quotations";
import { useTheme } from "./lib/theme";
import QuotationsPage from "./pages/QuotationsPage";
import AgentsPage from "./pages/AgentsPage";
import EvaluationPage from "./pages/EvaluationPage";
import WorkflowPage from "./pages/WorkflowPage";

type Tab = "quotations" | "workflow" | "agents" | "evaluation";

const TABS: { id: Tab; label: string; short: string; Icon: typeof Table2 }[] = [
  { id: "quotations", label: "Quotations", short: "Quotations", Icon: Table2 },
  { id: "workflow", label: "Workflow", short: "Workflow", Icon: GitBranch },
  { id: "agents", label: "Agents", short: "Agents", Icon: Bot },
  { id: "evaluation", label: "Evaluation", short: "Evals", Icon: ShieldCheck },
];

export default function App() {
  const { mode, setMode } = useTheme();
  const [tab, setTab] = useState<Tab>("quotations");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ quotations: null, workflow: null, agents: null, evaluation: null });

  const selected = QUOTATIONS.find((q) => q.id === selectedId) ?? null;

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  // Other screens ask the shell to move with window events, for example the Agents screen opening a step's prompts.
  // The event is sent again after the target screen has mounted, so that screen's own listeners also receive it.
  useEffect(() => {
    const onGoto = (e: Event) => {
      const d = (e as CustomEvent<{ tab?: Tab; stepId?: number; ruleId?: string; replayed?: boolean }>).detail;
      if (!d?.tab || d.replayed) return;
      if (d.tab === "workflow") setSelectedId((cur) => cur ?? QUOTATIONS[0].id);
      go(d.tab);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("alag:goto", { detail: { ...d, replayed: true } }));
        if (d.tab === "workflow" && d.stepId) window.dispatchEvent(new CustomEvent("alag:select-step", { detail: { stepId: d.stepId } }));
      }, 80);
    };
    window.addEventListener("alag:goto", onGoto);
    return () => window.removeEventListener("alag:goto", onGoto);
  }, []);

  const openQuotation = (id: string) => {
    setSelectedId(id);
    go("workflow");
  };

  // Arrow keys / Home / End move between tabs, as in the WAI-ARIA tabs pattern.
  const onTabKey = (e: KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight" ? (index + 1) % TABS.length
      : e.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-base font-bold text-on-accent shadow-sm">A</span>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">ALAG</div>
              <div className="hidden text-xs text-muted sm:block">Quote to order workflow · POC with sample data</div>
            </div>
          </div>
          <ThemeToggle mode={mode} onChange={setMode} />
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-1 sm:px-2" aria-label="Main">
          <div className="flex min-w-max gap-0 sm:gap-1" role="tablist">
            {TABS.map((t, i) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  id={`tab-${t.id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => go(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={
                    "relative inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-1.5 text-sm font-medium transition-colors sm:gap-2 sm:px-4 " +
                    (active ? "text-accent-fg" : "text-muted hover:text-ink")
                  }
                >
                  <t.Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.id === "workflow" && selected ? (
                    <span className="hidden rounded-md bg-surface-2 px-1.5 sm:inline py-0.5 text-xs font-normal tabular-nums text-muted ring-1 ring-line">
                      {selected.id}
                    </span>
                  ) : null}
                  {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent-fg" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "quotations" && (
            <QuotationsPage quotations={QUOTATIONS} selectedId={selectedId} onOpen={openQuotation} />
          )}
          {tab === "workflow" && (
            <WorkflowPage
              quotation={selected}
              quotations={QUOTATIONS}
              onSelect={setSelectedId}
              onBack={() => go("quotations")}
            />
          )}
          {tab === "agents" && <AgentsPage />}
          {tab === "evaluation" && <EvaluationPage />}
        </div>
      </main>
    </div>
  );
}
