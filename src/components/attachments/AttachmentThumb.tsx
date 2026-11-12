import { FileText } from "lucide-react";
import type { Attachment } from "../../studio/types";

type Thumb = Pick<Attachment, "mime" | "url" | "title" | "pages">;

/** Image preview, or a PDF tile with the page count. Uploaded files are only ever shown through img. */
export default function AttachmentThumb({ item, className = "h-16 w-16" }: { item: Thumb; className?: string }) {
  if (item.mime.startsWith("image/")) {
    return <img src={item.url} alt={item.title} loading="lazy" className={`${className} shrink-0 rounded-lg border border-line bg-surface-2 object-cover`} />;
  }
  return (
    <div
      className={`${className} flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-line bg-surface-2 text-ink-2`}
      role="img"
      aria-label={`PDF document${item.pages ? `, ${item.pages} pages` : ""}`}
    >
      <FileText className="h-6 w-6" aria-hidden="true" />
      <span className="text-[10px] font-medium leading-none">{item.pages ? `${item.pages} pages` : "PDF"}</span>
    </div>
  );
}
