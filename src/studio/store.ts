import { create } from "zustand";
import { persist } from "zustand/middleware";
import { QUOTATIONS } from "../data/quotations";
import { STEPS } from "../data/steps";
import { DEFAULT_RULES, defaultAgentBody } from "./defaults";
import { seedCase } from "./seed";
import type {
  ActivityEvent,
  AgentBody,
  AgentState,
  Attachment,
  BomLine,
  ClarificationDraft,
  ExtractedField,
  ExtractionResult,
  FieldState,
  MarginDecision,
  PricingRules,
  QuotationCase,
  QuotationDraft,
  RulesState,
} from "./types";

const now = () => new Date().toISOString();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function initialAgents(): Record<number, AgentState> {
  const out: Record<number, AgentState> = {};
  for (const s of STEPS) {
    const body = defaultAgentBody(s.id);
    out[s.id] = {
      stepId: s.id,
      live: body,
      draft: null,
      version: 1,
      history: [{ version: 1, publishedAt: "2026-10-01T09:00:00Z", author: "ALAG admin", note: "Initial version from the Behavior Spec", body: clone(body) }],
    };
  }
  return out;
}

function initialRules(): RulesState {
  return {
    live: clone(DEFAULT_RULES),
    draft: null,
    version: 1,
    history: [{ version: 1, publishedAt: "2026-10-01T09:00:00Z", author: "ALAG admin", note: "Initial rules", rules: clone(DEFAULT_RULES) }],
  };
}

function initialCases(): Record<string, QuotationCase> {
  const out: Record<string, QuotationCase> = {};
  for (const q of QUOTATIONS) out[q.id] = seedCase(q);
  return out;
}

export interface StudioState {
  agents: Record<number, AgentState>;
  rules: RulesState;
  cases: Record<string, QuotationCase>;

  /* Agent configuration. Edits go to a draft. Publishing makes a new live version. */
  updateAgentDraft: (stepId: number, patch: Partial<AgentBody>) => void;
  discardAgentDraft: (stepId: number) => void;
  publishAgent: (stepId: number, note: string, author?: string) => void;
  /** Loads an old version into the draft. It only goes live when published again. */
  restoreAgentVersion: (stepId: number, version: number) => void;

  /* Pricing rules, same draft and publish model. */
  updateRulesDraft: (patch: Partial<PricingRules>) => void;
  discardRulesDraft: () => void;
  publishRules: (note: string, author?: string) => void;
  restoreRulesVersion: (version: number) => void;

  /* Per quotation work. Every call that a human makes also writes an activity event. */
  addAttachment: (qid: string, att: Attachment) => void;
  removeAttachment: (qid: string, attachmentId: string) => void;
  setExtraction: (qid: string, result: ExtractionResult) => void;
  /** Human edits a value. Field becomes "edited" and the old AI value is kept. */
  editFieldValue: (qid: string, key: string, value: string | null) => void;
  setFieldState: (qid: string, key: string, state: FieldState) => void;
  patchField: (qid: string, key: string, patch: Partial<ExtractedField>) => void;
  addField: (qid: string, field: ExtractedField) => void;
  removeField: (qid: string, key: string) => void;
  setRfqApproved: (qid: string, approved: boolean) => void;
  setClarification: (qid: string, draft: ClarificationDraft | null) => void;
  sendClarification: (qid: string) => void;
  setBomOverride: (qid: string, lineId: string, override: BomLine["override"] | null) => void;
  addBomLine: (qid: string, line: BomLine) => void;
  removeBomLine: (qid: string, lineId: string) => void;
  setMargin: (qid: string, patch: Partial<MarginDecision>) => void;
  setQuotationDraft: (qid: string, patch: Partial<QuotationDraft>) => void;
  logActivity: (qid: string, e: Omit<ActivityEvent, "id" | "at">) => void;

  resetAll: () => void;
}

export const useStudio = create<StudioState>()(
  persist(
    (set) => {
      /** Update one case immutably. */
      const withCase = (qid: string, fn: (c: QuotationCase) => QuotationCase) =>
        set((s) => (s.cases[qid] ? { cases: { ...s.cases, [qid]: fn(s.cases[qid]) } } : s));
      const event = (c: QuotationCase, e: Omit<ActivityEvent, "id" | "at">): QuotationCase => ({
        ...c,
        activity: [...c.activity, { ...e, id: `act-${c.quotationId}-${c.activity.length + 1}-${Date.now()}`, at: now() }],
      });
      const mapFields = (c: QuotationCase, fn: (f: ExtractedField) => ExtractedField, key: string): QuotationCase => ({
        ...c,
        extraction: { ...c.extraction, fields: c.extraction.fields.map((f) => (f.key === key ? fn(f) : f)) },
      });

      return {
        agents: initialAgents(),
        rules: initialRules(),
        cases: initialCases(),

        updateAgentDraft: (stepId, patch) =>
          set((s) => {
            const a = s.agents[stepId];
            return { agents: { ...s.agents, [stepId]: { ...a, draft: { ...(a.draft ?? clone(a.live)), ...patch } } } };
          }),
        discardAgentDraft: (stepId) => set((s) => ({ agents: { ...s.agents, [stepId]: { ...s.agents[stepId], draft: null } } })),
        publishAgent: (stepId, note, author = "You") =>
          set((s) => {
            const a = s.agents[stepId];
            if (!a.draft) return s;
            const version = a.version + 1;
            return {
              agents: {
                ...s.agents,
                [stepId]: {
                  ...a,
                  live: clone(a.draft),
                  draft: null,
                  version,
                  history: [{ version, publishedAt: now(), author, note: note || "No note", body: clone(a.draft) }, ...a.history],
                },
              },
            };
          }),
        restoreAgentVersion: (stepId, version) =>
          set((s) => {
            const a = s.agents[stepId];
            const v = a.history.find((h) => h.version === version);
            return v ? { agents: { ...s.agents, [stepId]: { ...a, draft: clone(v.body) } } } : s;
          }),

        updateRulesDraft: (patch) => set((s) => ({ rules: { ...s.rules, draft: { ...(s.rules.draft ?? clone(s.rules.live)), ...patch } } })),
        discardRulesDraft: () => set((s) => ({ rules: { ...s.rules, draft: null } })),
        publishRules: (note, author = "You") =>
          set((s) => {
            if (!s.rules.draft) return s;
            const version = s.rules.version + 1;
            return {
              rules: {
                live: clone(s.rules.draft),
                draft: null,
                version,
                history: [{ version, publishedAt: now(), author, note: note || "No note", rules: clone(s.rules.draft) }, ...s.rules.history],
              },
            };
          }),
        restoreRulesVersion: (version) =>
          set((s) => {
            const v = s.rules.history.find((h) => h.version === version);
            return v ? { rules: { ...s.rules, draft: clone(v.rules) } } : s;
          }),

        addAttachment: (qid, att) =>
          withCase(qid, (c) =>
            c.attachments.some((a) => a.id === att.id)
              ? c
              : event({ ...c, attachments: [...c.attachments, att] }, { stepId: 1, actor: "Human", who: "You", text: `Attached ${att.name}` }),
          ),
        removeAttachment: (qid, id) =>
          withCase(qid, (c) => {
            const a = c.attachments.find((x) => x.id === id);
            return a ? event({ ...c, attachments: c.attachments.filter((x) => x.id !== id) }, { stepId: 1, actor: "Human", who: "You", text: `Removed ${a.name}` }) : c;
          }),
        setExtraction: (qid, result) =>
          withCase(qid, (c) =>
            event({ ...c, extraction: result }, { stepId: 2, actor: "AI", who: "Document Intelligence Agent", text: result.status === "failed" ? "Extraction failed" : `Extraction finished with ${result.fields.length} fields` }),
          ),
        editFieldValue: (qid, key, value) =>
          withCase(qid, (c) => {
            const next = mapFields(
              c,
              (f) => ({
                ...f,
                aiValue: f.state === "edited" ? f.aiValue : f.value,
                value,
                state: value === null || value === "" ? "missing" : "edited",
                confidence: value === null || value === "" ? null : f.confidence,
                note: value === null || value === "" ? f.note : "Edited by a human.",
              }),
              key,
            );
            return event(next, { stepId: 2, actor: "Human", who: "You", text: `Set ${key} to ${value ?? "empty"}` });
          }),
        setFieldState: (qid, key, state) =>
          withCase(qid, (c) => event(mapFields(c, (f) => ({ ...f, state }), key), { stepId: 2, actor: "Human", who: "You", text: `Marked ${key} as ${state.replace("_", " ")}` })),
        patchField: (qid, key, patch) => withCase(qid, (c) => mapFields(c, (f) => ({ ...f, ...patch }), key)),
        addField: (qid, field) =>
          withCase(qid, (c) =>
            c.extraction.fields.some((f) => f.key === field.key)
              ? c
              : event({ ...c, extraction: { ...c.extraction, fields: [...c.extraction.fields, field] } }, { stepId: 2, actor: "Human", who: "You", text: `Added field ${field.label}` }),
          ),
        removeField: (qid, key) => withCase(qid, (c) => ({ ...c, extraction: { ...c.extraction, fields: c.extraction.fields.filter((f) => f.key !== key) } })),
        setRfqApproved: (qid, approved) =>
          withCase(qid, (c) => event({ ...c, rfqApproved: approved }, { stepId: 3, actor: "Human", who: "You", text: approved ? "Approved the RFQ for estimation" : "Withdrew approval of the RFQ" })),
        setClarification: (qid, draft) => withCase(qid, (c) => ({ ...c, clarification: draft })),
        sendClarification: (qid) =>
          withCase(qid, (c) =>
            c.clarification ? event({ ...c, clarification: { ...c.clarification, status: "sent", sentAt: now() } }, { stepId: 3, actor: "Human", who: "You", text: `Sent clarification email to ${c.clarification.to}` }) : c,
          ),
        setBomOverride: (qid, lineId, override) =>
          withCase(qid, (c) => {
            const line = c.bom.find((l) => l.id === lineId);
            const next = { ...c, bom: c.bom.map((l) => (l.id === lineId ? { ...l, override: override ?? undefined } : l)) };
            return line ? event(next, { stepId: 4, actor: "Human", who: "You", text: override ? `Overrode ${line.item}: ${override.reason}` : `Reset ${line.item} to the price book` }) : c;
          }),
        addBomLine: (qid, line) => withCase(qid, (c) => event({ ...c, bom: [...c.bom, line] }, { stepId: 4, actor: "Human", who: "You", text: `Added cost line ${line.item}` })),
        removeBomLine: (qid, lineId) => withCase(qid, (c) => ({ ...c, bom: c.bom.filter((l) => l.id !== lineId) })),
        setMargin: (qid, patch) =>
          withCase(qid, (c) => (c.margin ? event({ ...c, margin: { ...c.margin, ...patch } }, { stepId: 5, actor: "Human", who: "You", text: "Changed the margin decision" }) : c)),
        setQuotationDraft: (qid, patch) => withCase(qid, (c) => (c.quotationDraft ? { ...c, quotationDraft: { ...c.quotationDraft, ...patch } } : c)),
        logActivity: (qid, e) => withCase(qid, (c) => event(c, e)),

        resetAll: () => set({ agents: initialAgents(), rules: initialRules(), cases: initialCases() }),
      };
    },
    {
      name: "alag-studio-v1",
      version: 1,
      partialize: (s) => ({ agents: s.agents, rules: s.rules, cases: s.cases }),
      // Object URLs of uploaded files do not survive a reload. Drop those attachments instead of showing broken links.
      merge: (persisted, current) => {
        const p = persisted as Partial<StudioState> | undefined;
        if (!p) return current;
        const cases = { ...current.cases, ...(p.cases ?? {}) };
        for (const id of Object.keys(cases)) cases[id] = { ...cases[id], attachments: cases[id].attachments.filter((a) => !a.url.startsWith("blob:")) };
        return { ...current, ...p, cases };
      },
    },
  ),
);

/* Small selectors so components do not subscribe to the whole store. */
export const useCase = (qid: string) => useStudio((s) => s.cases[qid]);
export const useAgent = (stepId: number) => useStudio((s) => s.agents[stepId]);
export const useRules = () => useStudio((s) => s.rules);
