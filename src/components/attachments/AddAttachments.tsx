import { useId, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Check, Plus, Search, SearchX, TriangleAlert, Upload } from "lucide-react";
import type { Attachment } from "../../studio/types";
import { Button, Callout, Card, Chip, SectionTitle, TextInput } from "../ui";
import AttachmentThumb from "./AttachmentThumb";
import { ACCEPTED_MIME, attachmentFromLibrary, formatSize, INLINE_LIMIT_BYTES, KIND_LABEL, licenseText, MAX_UPLOAD_BYTES, searchLibrary } from "./format";

interface Props {
  attachments: Attachment[];
  onAdd: (a: Attachment) => void;
  /** Called with a short sentence after something changed, for the live region. */
  onMessage: (text: string) => void;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => (typeof r.result === "string" ? resolve(r.result) : reject(new Error("unreadable")));
    r.onerror = () => reject(r.error ?? new Error("unreadable"));
    r.readAsDataURL(file);
  });
}

export default function AddAttachments({ attachments, onAdd, onMessage }: Props) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchLibrary(query), [query]);
  const attachedIds = new Set(attachments.map((a) => a.id));

  const [errors, setErrors] = useState<string[]>([]);
  const [sessionOnly, setSessionOnly] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropHintId = useId();

  const attach = (l: (typeof matches)[number]) => {
    const att = attachmentFromLibrary(l);
    onAdd(att);
    onMessage(`Attached ${att.name}.`);
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    const errs: string[] = [];
    const kept: string[] = [];
    let added = 0;
    for (const file of files) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        errs.push(`${file.name}: this file type is not supported. Use a JPG, PNG or PDF.`);
        continue;
      }
      if (file.size === 0) {
        errs.push(`${file.name}: the file is empty.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        errs.push(`${file.name}: ${formatSize(file.size)} is over the 8 MB limit. Choose a smaller file.`);
        continue;
      }
      try {
        const inline = file.size < INLINE_LIMIT_BYTES;
        const url = inline ? await readAsDataUrl(file) : URL.createObjectURL(file);
        onAdd({
          id: `att-up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          title: file.name.replace(/\.[^.]+$/, ""),
          kind: "upload",
          url,
          mime: file.type,
          sizeBytes: file.size,
          origin: "upload",
          addedAt: new Date().toISOString(),
        });
        added += 1;
        if (!inline) kept.push(file.name);
      } catch {
        errs.push(`${file.name}: the file could not be read. Try again.`);
      }
    }
    setErrors(errs);
    setSessionOnly(kept);
    if (added > 0) onMessage(added === 1 ? "Uploaded 1 file." : `Uploaded ${added} files.`);
    else if (errs.length > 0) onMessage("No file was uploaded.");
    setBusy(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handleFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <Card className="p-4">
      <SectionTitle title="Add attachments" hint="Pick a sample file or upload your own." />

      {/* Library search */}
      <div className="mt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-[2.05rem] h-4 w-4 text-muted" aria-hidden="true" />
          <TextInput
            label="Search the sample library"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="For example bed, wardrobe, plan or pdf"
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {matches.length === 1 ? "1 match" : `${matches.length} matches`}
        </p>
        {matches.length === 0 ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-muted">
            <SearchX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-medium text-ink-2">Nothing in the library matches that.</div>
              <div className="mt-0.5">Try bed, wardrobe, plan or pdf.</div>
            </div>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {matches.map((l) => {
              const attached = attachedIds.has(`att-${l.id}`);
              return (
                <li key={l.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-line p-2.5">
                  <AttachmentThumb item={{ mime: l.mime, url: `${import.meta.env.BASE_URL}samples/${l.file}`, title: l.title, pages: l.pages }} className="h-14 w-14" />
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-medium text-ink">{l.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Chip>{KIND_LABEL[l.kind]}</Chip>
                      <Chip>{formatSize(l.sizeBytes)}</Chip>
                    </div>
                    <p className="mt-1 text-xs text-muted">{licenseText(l.license, l.author)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={attached ? "secondary" : "primary"}
                    icon={attached ? Check : Plus}
                    disabled={attached}
                    onClick={() => attach(l)}
                    aria-label={attached ? `${l.title} is attached` : `Attach ${l.title}`}
                    className="shrink-0"
                  >
                    {attached ? "Attached" : "Attach"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Upload */}
      <div className="mt-5 border-t border-line pt-4">
        <h4 className="text-sm font-semibold text-ink">Upload a file</h4>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-2 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
            dragging ? "border-ring bg-warn-soft" : "border-line-strong bg-surface-2"
          }`}
        >
          <Upload className="h-6 w-6 text-muted" aria-hidden="true" />
          <p className="text-sm text-ink-2">Drag a file here, or</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPTED_MIME.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void handleFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <Button icon={Upload} disabled={busy} onClick={() => fileRef.current?.click()} aria-describedby={dropHintId}>
            {busy ? "Reading file" : "Choose a file"}
          </Button>
          <p id={dropHintId} className="text-xs text-muted">
            JPG, PNG or PDF, up to 8 MB. Files are only displayed, never opened or run.
          </p>
        </div>

        {errors.length > 0 ? (
          <Callout tone="danger" icon={TriangleAlert} title="Some files were not added" className="mt-3">
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((er) => (
                <li key={er} className="break-words">
                  {er}
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}
        {sessionOnly.length > 0 ? (
          <Callout tone="warn" title="This file is kept for this session only" className="mt-3">
            {sessionOnly.join(", ")} {sessionOnly.length === 1 ? "is" : "are"} over 1.5 MB, so {sessionOnly.length === 1 ? "it is" : "they are"} not saved in the browser and will be gone after a reload.
          </Callout>
        ) : null}
      </div>
    </Card>
  );
}
