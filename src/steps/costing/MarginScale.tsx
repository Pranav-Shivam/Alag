import { pct } from "./shared";

const MAX = 40;
const THUMB = 16;

/** Position of a value on the track. The native thumb never reaches the edges, so the markers use the same correction. */
const pos = (v: number) => `calc(${(v / MAX) * 100}% + ${(0.5 - v / MAX) * THUMB}px)`;

/**
 * Slider from 0 to 40 with a scale below it that shows the minimum margin, the tolerance band
 * around the recommendation and the recommendation itself. Meaning is also written in the legend, never color alone.
 */
export default function MarginScale({ value, onChange, minPct, recommendedPct, bandPct }: { value: number; onChange: (v: number) => void; minPct: number; recommendedPct: number; bandPct: number }) {
  const lo = Math.max(0, recommendedPct - bandPct);
  const hi = Math.min(MAX, recommendedPct + bandPct);
  const minClamped = Math.min(MAX, minPct);
  const recClamped = Math.min(MAX, recommendedPct);

  return (
    <div>
      <input
        type="range"
        min={0}
        max={MAX}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Chosen margin, slider from 0 to 40 percent"
        aria-valuetext={`${pct(value, 1)} margin`}
        className="block h-6 w-full cursor-pointer accent-accent"
      />
      <div className="relative mt-1 h-3 rounded-full border border-line bg-surface-2" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-danger-line" style={{ right: `calc(100% - ${pos(minClamped)})` }} />
        <div className="absolute inset-y-0 bg-ok-line" style={{ left: pos(lo), right: `calc(100% - ${pos(hi)})` }} />
        <div className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: pos(recClamped) }} />
        <div className="absolute -inset-y-0.5 w-0.5 bg-danger-solid" style={{ left: pos(minClamped) }} />
      </div>
      <div className="relative mt-1 flex justify-between text-xs tabular-nums text-muted" aria-hidden="true">
        <span>0%</span>
        <span>{MAX}%</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-chip bg-danger-line" aria-hidden="true" />
          Below the minimum margin {pct(minPct, 1)}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-chip bg-ok-line" aria-hidden="true" />
          Tolerance band {pct(lo, 1)} to {pct(hi, 1)}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-ink" aria-hidden="true" />
          Recommended {pct(recommendedPct, 1)}
        </li>
      </ul>
    </div>
  );
}
