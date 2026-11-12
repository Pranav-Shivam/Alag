import { useState } from "react";
import { Rocket, TriangleAlert } from "lucide-react";
import { Button, Callout, Card, Chip, SectionTitle, TextInput } from "../ui";
import type { ChangedSection } from "./logic";

interface Props {
  nextVersion: number;
  changes: ChangedSection[];
  onPublish: (note: string) => void;
  onCancel: () => void;
}

const MIN_NOTE = 5;

/** Inline publish step: change note, what changed, and a risk warning. */
export default function PublishPanel({ nextVersion, changes, onPublish, onCancel }: Props) {
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const trimmed = note.trim();
  const valid = trimmed.length >= MIN_NOTE;
  const risky = changes.some((c) => c.risky);

  return (
    <Card className="space-y-3 border-line-strong p-4">
      <SectionTitle title={`Publish version ${nextVersion}`} hint="Goes live for all quotations as soon as you publish." />

      {risky ? (
        <Callout tone="warn" icon={TriangleAlert} title="Risky change">
          Warning: this changes how data is extracted or what the agent may do. Run the test before publishing.
        </Callout>
      ) : null}

      <div>
        <p className="mb-1 text-xs font-medium text-ink-2">What changed</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Sections changed">
          {changes.map((c) => (
            <li key={c.label}>
              <Chip tone={c.risky ? "warn" : "neutral"}>{c.label}</Chip>
            </li>
          ))}
        </ul>
      </div>

      <TextInput
        label="Change note (required)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="Why are you making this change?"
        maxLength={200}
        error={touched && !valid ? `Write at least ${MIN_NOTE} characters so others can understand the change.` : undefined}
        hint={`Shown in the version history. At least ${MIN_NOTE} characters.`}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          icon={Rocket}
          disabled={!valid}
          onClick={() => {
            setTouched(true);
            if (valid) onPublish(trimmed);
          }}
        >
          Publish v{nextVersion}
        </Button>
      </div>
    </Card>
  );
}
