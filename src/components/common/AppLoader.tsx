import BrandLoader from "./BrandLoader";

type Props = {
  message?: string;
  className?: string;
  /** `panel` (default) is the branded mark for a loading region. `icon` is a small inline ring for buttons and status rows. */
  variant?: "panel" | "icon";
  size?: "xs" | "sm" | "md";
  /** Icon only: ring color for use on a lime button. */
  onMint?: boolean;
  /** Panel only: cover the parent (it needs `relative`) instead of taking its place. */
  overlay?: boolean;
  /** Overlay only: dim the content underneath. */
  dim?: boolean;
};

export default function AppLoader({ message, className = "", variant = "panel", size = "md", onMint = false, overlay = false, dim = false }: Props) {
  if (variant === "icon") {
    return <span className={`loader-ring loader-ring--${size === "md" ? "sm" : size} ${onMint ? "loader-ring--on-mint" : ""} ${className}`} aria-hidden="true" />;
  }
  return (
    <div className={`app-loader ${overlay ? "app-loader--overlay" : "app-loader--panel"} ${overlay && dim ? "app-loader--dim" : ""} ${className}`} aria-busy="true">
      <div className="app-loader__slot">
        <BrandLoader label={message} size={size === "md" ? "md" : "sm"} />
      </div>
    </div>
  );
}
