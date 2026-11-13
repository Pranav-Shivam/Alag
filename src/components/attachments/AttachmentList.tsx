import { ExternalLink, Paperclip, Trash2 } from "lucide-react";
import type { Attachment } from "../../studio/types";
import { Button, Card, Chip, SectionTitle } from "../ui";
import AttachmentThumb from "./AttachmentThumb";
import { authorFor, formatSize, KIND_LABEL, licenseText, openFile, ORIGIN_LABEL, ORIGIN_TONE } from "./format";

export default function AttachmentList({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (a: Attachment) => void }) {
  return (
    <Card className="p-4">
      <SectionTitle title={`Attachments (${attachments.length})`} hint="Files the AI reads in the next step." />
      {attachments.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-control border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-muted">
          <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
          No files yet. Attach one from the sample library or upload your own below.
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {attachments.map((a) => (
            <li key={a.id} className="flex min-w-0 gap-3 rounded-control border border-line p-3">
              <AttachmentThumb item={a} className="h-16 w-16 @md:h-20 @md:w-20" />
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-semibold text-ink">{a.title}</div>
                <div className="break-all text-xs text-muted">{a.name}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Chip>{KIND_LABEL[a.kind]}</Chip>
                  <Chip tone={ORIGIN_TONE[a.origin]}>{ORIGIN_LABEL[a.origin]}</Chip>
                  <Chip>{formatSize(a.sizeBytes)}</Chip>
                  {a.pages ? <Chip>{a.pages} pages</Chip> : null}
                </div>
                <p className="mt-1.5 text-xs text-ink-2">{licenseText(a.license, authorFor(a))}</p>
                {a.url.startsWith("blob:") ? <p className="mt-1 text-xs text-warn-fg">This file is kept for this session only.</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" icon={ExternalLink} onClick={() => openFile(a.url, a.mime)} aria-label={`Open ${a.name} in a new tab`}>
                    Open
                  </Button>
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => onRemove(a)} aria-label={`Remove ${a.name}`}>
                    Remove
                  </Button>
                  {a.sourceUrl ? (
                    <a
                      href={a.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 rounded-control px-1.5 text-xs font-medium text-accent-fg underline underline-offset-2 hover:text-accent-hover"
                    >
                      Source
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">for {a.name}, opens in a new tab</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
