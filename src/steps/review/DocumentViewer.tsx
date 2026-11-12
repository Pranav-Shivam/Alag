import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, FileText, ImageOff, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button, Callout } from "../../components/ui";
import type { Attachment, ExtractedField } from "../../studio/types";
import { BOX_CLASS, BOX_LABEL_CLASS, STATE_META } from "./fieldMeta";

const isPdf = (a: Attachment) => a.mime === "application/pdf" || a.kind === "pdf";

interface Props {
  attachments: Attachment[];
  currentId: string;
  onChangeAttachment: (id: string) => void;
  fields: ExtractedField[];
  selectedKey: string | null;
  onSelectField: (key: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  open: boolean;
  onToggle: () => void;
}

export default function DocumentViewer({ attachments, currentId, onChangeAttachment, fields, selectedKey, onSelectField, page, onPageChange, open, onToggle }: Props) {
  const current = attachments.find((a) => a.id === currentId) ?? attachments[0];

  return (
    <section aria-label="Document viewer" data-viewer className="min-w-0 rounded-xl border border-line bg-surface shadow-xs">
      <div className="flex items-center gap-2 border-b border-line p-2.5">
        <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        {attachments.length > 1 ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label htmlFor="review-attachment" className="shrink-0 text-xs font-medium text-ink-2">
              Document
            </label>
            <select
              id="review-attachment"
              value={current?.id ?? ""}
              onChange={(e) => onChangeAttachment(e.target.value)}
              className="min-h-8 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2 text-xs text-ink hover:border-muted focus:border-ring"
            >
              {attachments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="min-w-0 flex-1 truncate text-xs font-medium text-ink-2">{current ? current.name : "No document attached"}</div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="review-viewer-body"
          className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 text-xs font-medium text-ink-2 hover:bg-surface-2 @2xl:hidden"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          {open ? "Hide document" : "Show document"}
        </button>
      </div>

      <div id="review-viewer-body" className={`h-80 @2xl:block @2xl:h-[34rem] ${open ? "block" : "hidden"}`}>
        {!current ? (
          <div className="grid h-full place-items-center p-4 text-center text-sm text-muted">There is no attachment on this quotation yet. Add one in the email step.</div>
        ) : isPdf(current) ? (
          <PdfStage key={current.id} att={current} page={page} onPageChange={onPageChange} />
        ) : (
          <ImageStage key={current.id} att={current} fields={fields} selectedKey={selectedKey} onSelectField={onSelectField} />
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Shared ------------------------------ */

function FileError({ att }: { att: Attachment }) {
  return (
    <div className="grid h-full place-items-center p-3">
      <div className="max-w-sm">
        <Callout tone="danger" title="This file could not be shown" icon={ImageOff}>
          <p>The browser could not load {att.name}.</p>
          <a
            href={att.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-danger-line bg-surface px-2.5 text-xs font-medium text-danger-fg hover:bg-surface-2"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open in new tab
          </a>
        </Callout>
      </div>
    </div>
  );
}

/* ------------------------------ PDF ------------------------------ */

function PdfStage({ att, page, onPageChange }: { att: Attachment; page: number; onPageChange: (p: number) => void }) {
  const pages = Math.max(1, att.pages ?? 1);
  const safePage = Math.min(Math.max(1, page), pages);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-2.5 pt-2">
        <Button size="sm" variant="secondary" icon={ChevronLeft} aria-label="Previous page" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} />
        <label className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
          Page
          <select
            value={safePage}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="min-h-8 rounded-lg border border-line-strong bg-surface px-2 text-xs text-ink hover:border-muted focus:border-ring"
          >
            {Array.from({ length: pages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <span className="font-normal text-muted">of {pages}</span>
        </label>
        <Button size="sm" variant="secondary" icon={ChevronRight} aria-label="Next page" disabled={safePage >= pages} onClick={() => onPageChange(safePage + 1)} />
        <a
          href={`${att.url}#page=${safePage}`}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-accent-fg hover:bg-surface-2"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Open in new tab
        </a>
      </div>
      <p className="px-2.5 py-1.5 text-xs text-muted">Highlights are shown on images. For PDFs, each field shows its page.</p>
      <object key={`${att.url}-${safePage}`} data={`${att.url}#page=${safePage}`} type="application/pdf" aria-label={`${att.title}, page ${safePage}`} className="mx-2.5 mb-2.5 min-h-0 flex-1 rounded-md border border-line bg-surface-2">
        <FileError att={att} />
      </object>
    </div>
  );
}

/* ------------------------------ Image with zoom, pan and highlight boxes ------------------------------ */

interface View {
  z: number;
  x: number;
  y: number;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

function ImageStage({ att, fields, selectedKey, onSelectField }: { att: Attachment; fields: ExtractedField[]; selectedKey: string | null; onSelectField: (key: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; sx: number; sy: number; vx: number; vy: number } | null>(null);

  const boxes = fields.filter((f) => f.source?.attachmentId === att.id && f.source.box);

  // Track the size of the viewing area.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // At zoom 1 the image fits the area. These are its pixel sizes at zoom 1.
  const fitScale = nat && size.w > 0 && size.h > 0 ? Math.min(size.w / nat.w, size.h / nat.h) : 0;
  const w0 = nat ? nat.w * fitScale : 0;
  const h0 = nat ? nat.h * fitScale : 0;

  const fit = useCallback(() => setView({ z: 1, x: (size.w - w0) / 2, y: (size.h - h0) / 2 }), [size.w, size.h, w0, h0]);

  // Fit again whenever the area or the image size changes.
  useEffect(() => {
    if (w0 > 0) setView({ z: 1, x: (size.w - w0) / 2, y: (size.h - h0) / 2 });
  }, [size.w, size.h, w0, h0]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView((v) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * factor));
      const k = z / v.z;
      return { z, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  // Wheel zoom needs a non passive listener so the page does not scroll at the same time.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, failed]);

  // Bring the selected box into view when it is off screen.
  useEffect(() => {
    if (!selectedKey || w0 <= 0) return;
    const b = boxes.find((f) => f.key === selectedKey)?.source?.box;
    if (!b) return;
    setView((v) => {
      const l = v.x + b[0] * w0 * v.z;
      const t = v.y + b[1] * h0 * v.z;
      if (l >= 0 && t >= 0 && l + b[2] * w0 * v.z <= size.w && t + b[3] * h0 * v.z <= size.h) return v;
      return { ...v, x: size.w / 2 - (b[0] + b[2] / 2) * w0 * v.z, y: size.h / 2 - (b[1] + b[3] / 2) * h0 * v.z };
    });
    // Only react to a new selection, not to every change of the boxes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const center = () => ({ x: size.w / 2, y: size.h / 2 });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }));
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) {
      drag.current = null;
      setDragging(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = 40;
    if (e.key === "+" || e.key === "=") zoomAt(1.25, center().x, center().y);
    else if (e.key === "-") zoomAt(0.8, center().x, center().y);
    else if (e.key === "0") fit();
    else if (e.key === "ArrowLeft") setView((v) => ({ ...v, x: v.x + step }));
    else if (e.key === "ArrowRight") setView((v) => ({ ...v, x: v.x - step }));
    else if (e.key === "ArrowUp") setView((v) => ({ ...v, y: v.y + step }));
    else if (e.key === "ArrowDown") setView((v) => ({ ...v, y: v.y - step }));
    else return;
    e.preventDefault();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2">
        <Button size="sm" variant="secondary" icon={ZoomOut} aria-label="Zoom out" onClick={() => zoomAt(0.8, center().x, center().y)} />
        <Button size="sm" variant="secondary" icon={ZoomIn} aria-label="Zoom in" onClick={() => zoomAt(1.25, center().x, center().y)} />
        <Button size="sm" variant="secondary" icon={Maximize2} onClick={fit}>
          Fit
        </Button>
        <span className="text-xs tabular-nums text-muted" aria-live="polite">
          {Math.round(view.z * 100)}%
        </span>
        <span className="ml-auto hidden text-xs text-muted @md:inline">Scroll to zoom, drag to pan</span>
      </div>

      {failed ? (
        <div className="min-h-0 flex-1">
          <FileError att={att} />
        </div>
      ) : (
        <div
          ref={wrapRef}
          tabIndex={0}
          role="group"
          aria-label={`${att.title}. Plus and minus zoom, zero fits, arrow keys pan.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{ touchAction: view.z > 1 ? "none" : "pan-y" }}
          className={`relative m-2.5 min-h-0 flex-1 select-none overflow-hidden rounded-md border border-line bg-surface-2 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <img
            src={att.url}
            alt={att.title}
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setFailed(true)}
            className="pointer-events-none absolute left-0 top-0 max-w-none"
            style={nat ? { width: w0 * view.z, height: h0 * view.z, transform: `translate(${view.x}px, ${view.y}px)` } : { opacity: 0 }}
          />
          {nat
            ? boxes.map((f) => {
                const b = f.source?.box;
                if (!b) return null;
                const meta = STATE_META[f.state];
                const selected = f.key === selectedKey;
                const left = view.x + b[0] * w0 * view.z;
                const top = view.y + b[1] * h0 * view.z;
                const width = Math.max(8, b[2] * w0 * view.z);
                const height = Math.max(8, b[3] * h0 * view.z);
                const labelBelow = top < 22;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${f.label}, ${meta.label}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onSelectField(f.key)}
                    style={{ left, top, width, height }}
                    className={`absolute cursor-pointer rounded-sm border-2 ${selected ? `z-10 ${BOX_CLASS[meta.tone].selected}` : BOX_CLASS[meta.tone].idle}`}
                  >
                    <span
                      className={`pointer-events-none absolute left-[-2px] max-w-40 truncate whitespace-nowrap rounded border px-1 text-[11px] font-medium leading-4 ${labelBelow ? "top-full mt-0.5" : "bottom-full mb-0.5"} ${
                        selected ? BOX_LABEL_CLASS[meta.tone].selected : BOX_LABEL_CLASS[meta.tone].idle
                      }`}
                    >
                      {f.label}
                    </span>
                  </button>
                );
              })
            : null}
        </div>
      )}
    </div>
  );
}
