import { useMemo, useState } from "react";
import { Cog, History, Sparkles, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STEPS } from "../../data/steps";
import { useCase } from "../../studio/store";
import type { ActivityEvent } from "../../studio/types";
import { Chip, Segmented, TONE } from "../ui";
import type { Tone } from "../ui";
import { formatAbs, relativeHint } from "../workflow/stepMeta";

interface Props {
  quotationId: string;
  stepId: number;
}

type Scope = "step" | "all";

const ACTOR: Record<ActivityEvent["actor"], { icon: LucideIcon; tone: Tone; word: string }> = {
  AI: { icon: Sparkles, tone: "violet", word: "AI" },
  Human: { icon: User, tone: "warn", word: "Human" },
  System: { icon: Cog, tone: "neutral", word: "System" },
};

export default function ActivityTab({ quotationId, stepId }: Props) {
  const caseData = useCase(quotationId);
  const [scope, setScope] = useState<Scope>("step");

  const events = useMemo(() => {
    const all = caseData?.activity ?? [];
    const picked = scope === "step" ? all.filter((a) => a.stepId === stepId) : all;
    // Newest first. Events with the same time keep the later one on top.
    return picked
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (a.e.at < b.e.at ? 1 : a.e.at > b.e.at ? -1 : b.i - a.i))
      .map((x) => x.e);
  }, [caseData, scope, stepId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Show activity for"
          value={scope}
          onChange={setScope}
          options={[
            { id: "step", label: "This step" },
            { id: "all", label: "All steps" },
          ]}
        />
        <span className="text-xs tabular-nums text-muted">{`${events.length} ${events.length === 1 ? "event" : "events"}`}</span>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface-2 p-6 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-surface text-muted ring-1 ring-line">
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">{scope === "step" ? "No activity on this step yet" : "No activity yet"}</p>
          <p className="mt-1 text-xs text-muted">Actions by agents, people and the system show up here as they happen.</p>
        </div>
      ) : (
        <ol className="relative">
          {events.map((ev, i) => {
            const a = ACTOR[ev.actor];
            const Icon = a.icon;
            const hint = relativeHint(ev.at);
            const last = i === events.length - 1;
            return (
              <li key={ev.id} className="relative flex gap-3 pb-4">
                {!last ? <span aria-hidden="true" className="absolute bottom-0 left-4 top-8 w-0 -translate-x-1/2 border-l-2 border-line" /> : null}
                <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${TONE[a.tone]}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{a.word}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">
                    <span className="font-semibold">{ev.who}</span> <span className="text-ink-2">{ev.text}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <time dateTime={ev.at} className="tabular-nums">
                      {formatAbs(ev.at)}
                    </time>
                    {hint ? <span>{`(${hint})`}</span> : null}
                    {scope === "all" ? <Chip>{`Step ${ev.stepId}: ${STEPS[ev.stepId - 1]?.short ?? ""}`}</Chip> : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
