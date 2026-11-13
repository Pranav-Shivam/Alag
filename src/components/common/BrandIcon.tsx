import { BRAND_ICONS } from "../../data/brandIcons";

const SIZE = {
  sm: { tile: "h-7 w-7", glyph: "h-5 w-5", wide: "w-6", text: "text-2xs" },
  md: { tile: "h-10 w-10", glyph: "h-7 w-7", wide: "w-8", text: "text-xs" },
};

/** True when the brand colour would be hard to see on the white tile. */
function isNearBlack(hex: string): boolean {
  const n = parseInt(hex, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum < 0.2;
}

function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/**
 * Brand mark of a connected product on a white tile. Marks come from src/data/brandIcons.ts.
 * Products with no available mark get an initials badge in theme colors, so it never looks like a logo.
 */
export default function BrandIcon({ icon, name, size = "md" }: { icon: string; name: string; size?: "sm" | "md" }) {
  const s = SIZE[size];
  const data = icon ? BRAND_ICONS[icon] : undefined;

  if (!data) {
    return (
      <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-control border border-line bg-surface-2 font-semibold text-ink-2 ${s.tile} ${s.text}`}>
        {initials(name)}
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-control bg-tile text-on-tile ring-1 ring-line ${s.tile}`}>
      {data.kind === "color" ? (
        // Wordmark-style logos are much wider than tall, so they get the full tile width instead of a square box.
        <svg viewBox={`0 0 ${data.w} ${data.h}`} className={data.w / data.h > 1.5 ? `h-auto ${s.wide}` : s.glyph} dangerouslySetInnerHTML={{ __html: data.body }} />
      ) : (
        <svg viewBox="0 0 24 24" className={s.glyph}>
          <path d={data.path} fill={isNearBlack(data.hex) ? "currentColor" : `#${data.hex}`} />
        </svg>
      )}
    </span>
  );
}
