import alagMark from "../../assets/alag-mark.svg";

/** Branded loading mark: the ALAG logo on a tile inside a rotating amber ring. Styles are `.brand-loader*` in index.css. */
export default function BrandLoader({ label, size = "md" }: { label?: string; size?: "sm" | "md" }) {
  return (
    <div role="status" aria-live="polite" aria-label={label ?? "Loading"} className="brand-loader">
      <div className={`brand-loader__mark brand-loader__mark--${size}`} aria-hidden="true">
        <span className="brand-loader__ring" />
        <span className="brand-loader__tile">
          <img src={alagMark} alt="" draggable={false} className="brand-loader__logo" />
        </span>
      </div>
      {label ? <span className="brand-loader__label">{label}</span> : null}
    </div>
  );
}
