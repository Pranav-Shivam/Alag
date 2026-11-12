import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SCORING } from "./evalCalc";
import { seedOrchestration, seedRuns, seedSpecRules, seedSuites } from "./evalSeed";
import type { AgentRun, EvalSuite, OrchestrationConfig, RunFeedback, ScoringConfig, SpecRule } from "./evalTypes";

const initialRules = seedSpecRules();

export interface EvalState {
  /** Behavior Spec: the written rules the judge scores every run against. */
  rules: SpecRule[];
  orchestration: OrchestrationConfig[];
  scoring: ScoringConfig;
  suites: EvalSuite[];
  feedback: Record<string, RunFeedback>;
  /** Runs are generated data. Not persisted, rebuilt from the seed on every load. */
  runs: AgentRun[];

  addRule: (rule: Omit<SpecRule, "id">) => void;
  updateRule: (id: string, patch: Partial<Omit<SpecRule, "id" | "stepId">>) => void;
  removeRule: (id: string) => void;
  updateOrchestration: (stepId: number, patch: Partial<OrchestrationConfig>) => void;
  updateScoring: (patch: Partial<ScoringConfig>) => void;
  setFeedback: (runId: string, fb: Omit<RunFeedback, "at">) => void;
  clearFeedback: (runId: string) => void;
  /** Simulated: re-runs a suite and stores a plausible new pass count. */
  runSuite: (suiteId: string) => void;
  resetEval: () => void;
}

export const useEval = create<EvalState>()(
  persist(
    (set) => ({
      rules: initialRules,
      orchestration: seedOrchestration(),
      scoring: { ...DEFAULT_SCORING },
      suites: seedSuites(),
      feedback: {},
      runs: seedRuns(initialRules),

      addRule: (rule) =>
        set((s) => ({ rules: [...s.rules, { ...rule, id: `rule-${rule.stepId}-${Date.now()}` }] })),
      updateRule: (id, patch) => set((s) => ({ rules: s.rules.map((r) => (r.id === id && !r.locked ? { ...r, ...patch } : r)) })),
      removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => !(r.id === id && !r.locked)) })),
      updateOrchestration: (stepId, patch) => set((s) => ({ orchestration: s.orchestration.map((o) => (o.stepId === stepId ? { ...o, ...patch } : o)) })),
      updateScoring: (patch) => set((s) => ({ scoring: { ...s.scoring, ...patch } })),
      setFeedback: (runId, fb) => set((s) => ({ feedback: { ...s.feedback, [runId]: { ...fb, at: new Date().toISOString() } } })),
      clearFeedback: (runId) =>
        set((s) => {
          const next = { ...s.feedback };
          delete next[runId];
          return { feedback: next };
        }),
      runSuite: (suiteId) =>
        set((s) => ({
          suites: s.suites.map((x) =>
            x.id === suiteId ? { ...x, lastRunAt: new Date().toISOString(), passed: Math.min(x.cases, Math.max(0, x.passed + (x.cases - x.passed > 0 ? 1 : 0))) } : x,
          ),
        })),
      resetEval: () => set({ rules: seedSpecRules(), orchestration: seedOrchestration(), scoring: { ...DEFAULT_SCORING }, suites: seedSuites(), feedback: {} }),
    }),
    {
      name: "alag-eval-v1",
      version: 1,
      partialize: (s) => ({ rules: s.rules, orchestration: s.orchestration, scoring: s.scoring, suites: s.suites, feedback: s.feedback }),
    },
  ),
);
