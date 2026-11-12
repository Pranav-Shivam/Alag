import { STEPS } from "../../data/steps";
import type { DomainEvent } from "../../studio/evalTypes";

const label = (id: number) => {
  const s = STEPS.find((x) => x.id === id);
  return `${id}. ${s?.short ?? "Agent"}`;
};

/** Producer, then the event bus, then one line per consumer. Drawn with plain SVG. */
export default function EventFanOut({ event }: { event: DomainEvent }) {
  const n = event.consumerSteps.length;
  const rowH = 40;
  const h = Math.max(110, n * rowH + 20);
  const midY = h / 2;
  const ys = event.consumerSteps.map((_, i) => 10 + rowH / 2 + i * rowH + (h - 20 - n * rowH) / 2);
  const names = event.consumerSteps.map((id) => STEPS.find((s) => s.id === id)?.agent ?? "Agent").join(", ");
  const producer = STEPS.find((s) => s.id === event.producerStep)?.agent ?? "Agent";

  return (
    <svg viewBox={`0 0 380 ${h}`} role="img" aria-labelledby="fan-title fan-desc" className="w-full">
      <title id="fan-title">{`${event.name} fans out to ${n} consumers`}</title>
      <desc id="fan-desc">{`${producer} publishes ${event.name} to the event bus. Consumers: ${names}.`}</desc>

      {/* producer to bus */}
      <path d={`M112 ${midY} H160`} className="stroke-line-strong" strokeWidth="1.5" fill="none" />
      {/* bus bar */}
      <rect x="160" y="8" width="28" height={h - 16} rx="6" className="fill-surface-2 stroke-line-strong" strokeWidth="1.5" />
      <text x="174" y={midY} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 174 ${midY})`} className="fill-muted" fontSize="10" fontWeight="600">
        Event bus
      </text>
      {/* bus to consumers */}
      {ys.map((y, i) => (
        <g key={event.consumerSteps[i]}>
          <path d={`M188 ${midY} C 214 ${midY}, 214 ${y}, 252 ${y}`} className="stroke-accent" strokeWidth="1.5" fill="none" />
          <rect x="252" y={y - 15} width="120" height="30" rx="8" className="fill-surface stroke-line-strong" strokeWidth="1.2" />
          <text x="312" y={y} textAnchor="middle" dominantBaseline="middle" className="fill-ink" fontSize="11" fontWeight="500">
            {label(event.consumerSteps[i])}
          </text>
        </g>
      ))}

      {/* producer */}
      <rect x="6" y={midY - 18} width="106" height="36" rx="8" className="fill-warn-soft stroke-warn-line" strokeWidth="1.2" />
      <text x="59" y={midY} textAnchor="middle" dominantBaseline="middle" className="fill-warn-fg" fontSize="11" fontWeight="600">
        {label(event.producerStep)}
      </text>
    </svg>
  );
}
