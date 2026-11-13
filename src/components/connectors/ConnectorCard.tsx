import { useState } from "react";
import { BadgeCheck, Check, FlaskConical, Info, Plug, Unplug, Users } from "lucide-react";
import { toast } from "sonner";
import { MCP_STATUS } from "../../data/connectors";
import type { Connector, McpStatus } from "../../data/connectors";
import { STEPS } from "../../data/steps";
import { useConnectors } from "../../store/connectors";
import BrandIcon from "../common/BrandIcon";
import { Button, Chip } from "../ui";
import type { Tone } from "../ui";

const STATUS_TONE: Record<McpStatus, { tone: Tone; icon: typeof Plug }> = {
  official: { tone: "ok", icon: BadgeCheck },
  preview: { tone: "warn", icon: FlaskConical },
  community: { tone: "violet", icon: Users },
  rest: { tone: "neutral", icon: Plug },
};

export function McpBadge({ status }: { status: McpStatus }) {
  const s = STATUS_TONE[status];
  return (
    <span title={MCP_STATUS[status].hint}>
      <Chip tone={s.tone} icon={s.icon}>
        {MCP_STATUS[status].label}
      </Chip>
    </span>
  );
}

/** One connector: what it does in ALAG, how it connects, and a connect switch (simulated). */
export default function ConnectorCard({ connector: c }: { connector: Connector }) {
  const connected = useConnectors((s) => c.id in s.connected);
  const connect = useConnectors((s) => s.connect);
  const disconnect = useConnectors((s) => s.disconnect);
  const [busy, setBusy] = useState(false);

  const toggle = () => {
    if (connected) {
      disconnect(c.id);
      toast(`${c.name} disconnected`);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      connect(c.id);
      setBusy(false);
      toast.success(`${c.name} connected`, { description: "Simulated. No real account was contacted." });
    }, 700);
  };

  return (
    <article className="surface flex min-w-0 flex-col gap-3 p-4" aria-label={c.name}>
      <header className="flex items-start gap-3">
        <BrandIcon icon={c.icon} name={c.name} />
        <div className="min-w-0 flex-1">
          <h3 className="t-label break-words">{c.name}</h3>
          <div className="mt-1">
            <McpBadge status={c.mcp} />
          </div>
        </div>
        {connected ? (
          <Chip tone="ok" icon={Check}>
            Connected
          </Chip>
        ) : null}
      </header>

      <p className="text-sm text-ink-2">{c.job}</p>

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Workflow steps that use it">
        {c.steps.length === 0 ? (
          <Chip>Whole platform</Chip>
        ) : (
          c.steps.map((id) => (
            <span key={id} title={`Step ${id}: ${STEPS[id - 1].name}`}>
              <Chip tone="info" className="tabular-nums">
                {`Step ${id}`}
              </Chip>
            </span>
          ))
        )}
      </div>

      <details className="group text-xs text-ink-2">
        <summary className="cursor-pointer select-none rounded-chip text-muted hover:text-ink">Tools and setup</summary>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="t-eyebrow">Sign-in</dt>
            <dd className="mt-0.5">{c.auth}</dd>
          </div>
          {c.endpoint ? (
            <div>
              <dt className="t-eyebrow">Endpoint or package</dt>
              <dd className="mt-0.5 break-all font-mono">{c.endpoint}</dd>
            </div>
          ) : null}
          <div>
            <dt className="t-eyebrow">Example tools</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {c.tools.map((t) => (
                <span key={t} className="rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-2xs text-ink-2">
                  {t}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </details>

      {c.note ? (
        <p className="flex items-start gap-1.5 text-xs text-warn-fg">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{c.note}</span>
        </p>
      ) : null}

      <div className="mt-auto pt-1">
        {connected ? (
          <Button size="sm" icon={Unplug} onClick={toggle} aria-label={`Disconnect ${c.name}`}>
            Disconnect
          </Button>
        ) : (
          <Button size="sm" variant="primary" icon={Plug} loading={busy} disabled={busy} onClick={toggle} aria-label={`Connect ${c.name}`}>
            {busy ? "Connecting" : "Connect"}
          </Button>
        )}
      </div>
    </article>
  );
}
