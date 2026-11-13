/** Material Symbols Outlined glyph, the app icon set. `name` is the ligature, for example "account_tree". */
export default function MaterialSymbol({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${filled ? "material-symbol--filled" : ""} ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}
