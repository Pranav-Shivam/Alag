import { useId } from "react";
import type { ReactNode } from "react";
import { useElementWidth } from "./shared";

/* Small inline SVG charts. Drawn at the real pixel width so text stays readable on phones.
   Strokes and fills use currentColor with a token text class, never a raw color. */

const H = 220;
const PAD = { l: 40, r: 14, t: 16, b: 30 };

export interface ChartPoint {
  label: string; // x axis label, short
  fullLabel: string; // used in the table and tooltip
  value: number;
  detail?: string; // extra column in the table
}

function DataTable({ valueHeader, detailHeader, points, fmt }: { valueHeader: string; detailHeader?: string; points: ChartPoint[]; fmt: (n: number) => string }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer rounded-chip text-muted hover:text-ink">View the data as a table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1 pr-3 font-medium">
                Week starting
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                {valueHeader}
              </th>
              {detailHeader ? (
                <th scope="col" className="py-1 font-medium">
                  {detailHeader}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.fullLabel} className="border-t border-line text-ink-2">
                <th scope="row" className="py-1 pr-3 font-normal">
                  {p.fullLabel}
                </th>
                <td className="py-1 pr-3 tabular-nums">{fmt(p.value)}</td>
                {detailHeader ? <td className="py-1 tabular-nums">{p.detail}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function labelStep(n: number, innerW: number): number {
  const fit = Math.max(1, Math.floor(innerW / 64));
  return Math.max(1, Math.ceil(n / fit));
}

function Frame({ title, desc, w, children }: { title: string; desc: string; w: number; children: ReactNode }) {
  const id = useId();
  return (
    <svg role="img" aria-labelledby={`${id}-t ${id}-d`} width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="block max-w-full">
      <title id={`${id}-t`}>{title}</title>
      <desc id={`${id}-d`}>{desc}</desc>
      {children}
    </svg>
  );
}

/** Line plus area of a 0 to 100 score, with a dashed line at the pass score. */
export function TrendChart({ points, threshold, title, desc, valueHeader, detailHeader }: { points: ChartPoint[]; threshold: number; title: string; desc: string; valueHeader: string; detailHeader?: string }) {
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const iw = Math.max(40, w - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const vals = points.map((p) => p.value);
  const lo = Math.max(0, Math.floor((Math.min(...vals, threshold) - 5) / 10) * 10);
  const hi = 100;
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;
  const x = (i: number) => (points.length === 1 ? PAD.l + iw / 2 : PAD.l + (i * iw) / (points.length - 1));
  const tickStep = hi - lo > 50 ? 20 : 10;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += tickStep) ticks.push(t);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const base = PAD.t + ih;
  const area = points.length > 0 ? `${line} L${x(points.length - 1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z` : "";
  const step = labelStep(points.length, iw);

  return (
    <div ref={ref} className="min-w-0">
      <Frame title={title} desc={desc} w={w}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={PAD.l + iw} y1={y(t)} y2={y(t)} stroke="currentColor" strokeWidth={1} className="text-line" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-current text-muted">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={PAD.l + iw} y1={y(threshold)} y2={y(threshold)} stroke="currentColor" strokeWidth={1.5} strokeDasharray="5 4" className="text-warn-solid" />
        <text x={PAD.l + iw} y={y(threshold) - 5} textAnchor="end" fontSize={11} fontWeight={600} className="fill-current text-warn-fg">
          {`Pass score ${threshold}`}
        </text>
        {area ? <path d={area} fill="currentColor" fillOpacity={0.12} className="text-chart-1" /> : null}
        {line ? <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="text-chart-1" /> : null}
        {points.map((p, i) => (
          <g key={p.fullLabel}>
            <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="currentColor" className="text-chart-1">
              <title>{`${p.fullLabel}: ${p.value.toFixed(1)}${p.detail ? `, ${p.detail}` : ""}`}</title>
            </circle>
            {i % step === 0 ? (
              <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} className="fill-current text-muted">
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </Frame>
      <DataTable valueHeader={valueHeader} detailHeader={detailHeader} points={points} fmt={(n) => n.toFixed(1)} />
    </div>
  );
}

/** Plain bar chart from zero. */
export function BarChart({ points, title, desc, valueHeader, detailHeader, fmt }: { points: ChartPoint[]; title: string; desc: string; valueHeader: string; detailHeader?: string; fmt: (n: number) => string }) {
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const iw = Math.max(40, w - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const max = Math.max(...points.map((p) => p.value), 0);
  const niceMax = max === 0 ? 1 : niceCeil(max);
  const y = (v: number) => PAD.t + ih - (v / niceMax) * ih;
  const slot = iw / Math.max(1, points.length);
  const barW = Math.max(4, Math.min(36, slot * 0.6));
  const step = labelStep(points.length, iw);
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <div ref={ref} className="min-w-0">
      <Frame title={title} desc={desc} w={w}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={PAD.l + iw} y1={y(t)} y2={y(t)} stroke="currentColor" strokeWidth={1} className="text-line" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-current text-muted">
              {fmt(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          return (
            <g key={p.fullLabel}>
              <rect x={cx - barW / 2} y={y(p.value)} width={barW} height={Math.max(1, PAD.t + ih - y(p.value))} rx={3} fill="currentColor" className="text-chart-1">
                <title>{`${p.fullLabel}: ${fmt(p.value)}${p.detail ? `, ${p.detail}` : ""}`}</title>
              </rect>
              {i % step === 0 ? (
                <text x={cx} y={H - 10} textAnchor="middle" fontSize={11} className="fill-current text-muted">
                  {p.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </Frame>
      <DataTable valueHeader={valueHeader} detailHeader={detailHeader} points={points} fmt={fmt} />
    </div>
  );
}

function niceCeil(v: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * pow;
}
