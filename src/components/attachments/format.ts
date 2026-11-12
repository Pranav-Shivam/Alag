import { LIBRARY } from "../../studio/defaults";
import type { Attachment, AttachmentKind, LibraryItem } from "../../studio/types";
import type { Tone } from "../ui";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Files under this size are stored as a data URL so they survive a reload. */
export const INLINE_LIMIT_BYTES = 1.5 * 1024 * 1024;
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "application/pdf"];

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const KIND_LABEL: Record<AttachmentKind, string> = {
  sketch: "Sketch",
  drawing: "Drawing",
  photo: "Photo",
  pdf: "PDF",
  upload: "Upload",
};

export const ORIGIN_LABEL: Record<Attachment["origin"], string> = {
  email: "From email",
  library: "From library",
  upload: "Uploaded",
};

export const ORIGIN_TONE: Record<Attachment["origin"], Tone> = {
  email: "info",
  library: "teal",
  upload: "violet",
};

export function authorFor(att: Pick<Attachment, "name">): string | undefined {
  return LIBRARY.find((l) => l.file === att.name)?.author;
}

/** One plain sentence about what the license allows and what credit is needed. */
export function licenseText(license: string | undefined, author: string | undefined): string {
  if (!license) return "Your own file. No license information.";
  if (/^CC BY/i.test(license)) {
    return `${license}. Reuse requires credit to the author${author ? `: ${author}` : ""}, and a link to the license.`;
  }
  if (/public domain/i.test(license)) return `${license}. Free to use, no credit required${author ? ` (author: ${author})` : ""}.`;
  return `${license}${author ? `. Author: ${author}` : ""}.`;
}

export function attachmentFromLibrary(l: LibraryItem): Attachment {
  return {
    id: `att-${l.id}`,
    name: l.file,
    title: l.title,
    kind: l.kind,
    url: `/samples/${l.file}`,
    mime: l.mime,
    sizeBytes: l.sizeBytes,
    pages: l.pages,
    origin: "library",
    license: l.license,
    sourceUrl: l.sourceUrl,
    addedAt: new Date().toISOString(),
  };
}

/** Every word must match some keyword or title word. Empty query matches everything. */
export function searchLibrary(query: string): LibraryItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return LIBRARY;
  return LIBRARY.filter((l) => {
    const hay = [
      ...l.title.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean),
      ...l.keywords.map((k) => k.toLowerCase()),
      ...l.keywords.flatMap((k) => k.toLowerCase().split(/\s+/)),
      l.kind,
    ];
    return words.every((w) => hay.some((h) => h.includes(w)));
  });
}

/** data: URLs cannot be opened as a top level page in most browsers, so open them as a blob instead. */
export function openFile(url: string, mime: string): void {
  let target = url;
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    const bin = atob(url.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    target = URL.createObjectURL(new Blob([bytes], { type: mime }));
  }
  window.open(target, "_blank", "noopener,noreferrer");
}
