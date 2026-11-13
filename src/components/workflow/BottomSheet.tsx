import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

interface Props {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Full-height bottom sheet for phones and tablets. The app header stays visible above it.
 * Esc closes, body scroll is locked, focus moves in on open and is kept inside while open.
 */
export default function BottomSheet({ labelledBy, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Keep Tab inside the sheet while it is open.
  const trap = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 starting:opacity-0" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={trap}
        className="fixed inset-x-0 bottom-0 top-28 z-50 flex flex-col overflow-hidden rounded-t-surface border border-b-0 border-line-strong bg-surface shadow-raised outline-none transition-transform duration-200 ease-out starting:translate-y-full"
      >
        <div aria-hidden="true" className="flex shrink-0 justify-center pb-1 pt-2">
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </>
  );
}
