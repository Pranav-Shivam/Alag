import type { Autonomy } from "../../studio/types";
import type { AgentBody } from "../../studio/types";
import { MODELS } from "../../studio/defaults";
import { Card, Segmented, Select } from "../ui";
import { SliderField } from "./NumberField";

interface Props {
  body: AgentBody;
  update: (patch: Partial<AgentBody>) => void;
}

const AUTONOMY: { id: Autonomy; label: string; effect: string }[] = [
  { id: "suggest", label: "Suggest only", effect: "The agent only suggests. A person enters every value and makes every decision." },
  { id: "draft", label: "Draft for approval", effect: "The agent prepares a draft. A person approves it before anything is saved or sent." },
  { id: "auto", label: "Auto", effect: "The agent acts on its own and the result is saved without review. Fields below the confidence threshold still go to a human." },
];

function temperatureHint(t: number): string {
  const feel = t <= 0.2 ? "Repeatable: the same input gives almost the same answer." : t >= 0.7 ? "Creative: answers vary more from run to run." : "Balanced: some variety, mostly consistent.";
  return `Low is repeatable, high is creative. ${feel}`;
}

export default function SettingsPanel({ body, update }: Props) {
  const known = MODELS.includes(body.model);
  const autonomy = AUTONOMY.find((a) => a.id === body.autonomy) ?? AUTONOMY[0];

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <Select label="Model" value={body.model} onChange={(e) => update({ model: e.target.value })} hint="Larger models read messy drawings better but cost more and answer more slowly.">
          {!known ? <option value={body.model}>{body.model}</option> : null}
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>

        <SliderField label="Temperature" value={body.temperature} min={0} max={1} step={0.1} onChange={(n) => update({ temperature: Math.round(n * 10) / 10 })} hint={temperatureHint(body.temperature)} />
      </Card>

      <Card className="p-4">
        <div className="text-xs font-medium text-ink-2" id="autonomy-label">
          Autonomy
        </div>
        <Segmented label="Autonomy" value={body.autonomy} onChange={(v) => update({ autonomy: v })} options={AUTONOMY.map((a) => ({ id: a.id, label: a.label }))} className="mt-1" />
        <p className="mt-2 text-sm text-ink-2" aria-live="polite">
          {autonomy.effect}
        </p>
      </Card>

      <Card className="p-4">
        <SliderField
          label="Confidence threshold (%)"
          value={body.confidenceThreshold}
          min={0}
          max={100}
          step={1}
          onChange={(n) => update({ confidenceThreshold: Math.round(n) })}
          hint="Fields below this score go to a human."
        />
      </Card>
    </div>
  );
}
