import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Toaster } from "sonner";
import GlobalLoaderHost from "./components/common/GlobalLoaderHost";
import Sidebar from "./components/Sidebar";
import type { NavItem } from "./components/Sidebar";
import { QUOTATIONS } from "./data/quotations";
import { useTheme } from "./lib/theme";
import QuotationsPage from "./pages/QuotationsPage";
import AgentsPage from "./pages/AgentsPage";
import EvaluationPage from "./pages/EvaluationPage";
import WorkflowPage from "./pages/WorkflowPage";

type Tab = "quotations" | "workflow" | "agents" | "evaluation";

const TABS: NavItem<Tab>[] = [
  { id: "quotations", label: "Quotations", symbol: "request_quote" },
  { id: "workflow", label: "Workflow", symbol: "account_tree" },
  { id: "agents", label: "Agents", symbol: "smart_toy" },
  { id: "evaluation", label: "Evaluation", symbol: "verified" },
];

export default function App() {
  const { dark, setMode } = useTheme();
  const [tab, setTab] = useState<Tab>("quotations");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-screen bg-shell text-ink">
      <Sidebar items={TABS} active={tab} onSelect={go} onHome={() => go("quotations")} dark={dark} onToggleTheme={() => setMode(dark ? "light" : "dark")} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-6" role="banner">
          <p className="page-title m-0 min-w-0 truncate text-2xl lg:text-4xl">{TABS.find((t) => t.id === tab)?.label}</p>
          {tab === "workflow" && selected ? (
            <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-sm tabular-nums text-muted ring-1 ring-line">{selected.id}</span>
          ) : null}
        </header>

        <main className="flex-1 bg-canvas px-6 pb-6 pt-4">
          <motion.div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            {tab === "quotations" && <QuotationsPage quotations={QUOTATIONS} selectedId={selectedId} onOpen={openQuotation} />}
            {tab === "workflow" && <WorkflowPage quotation={selected} quotations={QUOTATIONS} onSelect={setSelectedId} onBack={() => go("quotations")} />}
            {tab === "agents" && <AgentsPage />}
            {tab === "evaluation" && <EvaluationPage />}
          </motion.div>
        </main>

        <footer className="w-full bg-canvas py-1 text-center text-xs text-accent-fg">© {new Date().getFullYear()} Oldcastle BuildingEnvelope®. All rights reserved.</footer>
      </div>
      <GlobalLoaderHost />
      <Toaster position="bottom-right" theme={dark ? "dark" : "light"} toastOptions={{ classNames: { toast: "app-toast" } }} />
    </div>
    </MotionConfig>
  );
}
