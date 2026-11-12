import type { Quotation } from "../../types";
import type { ClarificationDraft, ExtractedField, QuotationCase } from "../../studio/types";

const firstName = (name: string) => name.split(" ")[0] || "there";

/** The line that asks the customer for one missing field. */
export function askLine(field: ExtractedField): string {
  const example = field.unit === "in" ? ", for example 90 inches or 7 ft 6 in" : "";
  return `- ${field.label}${example}`;
}

export function isAsked(draft: ClarificationDraft | null, field: ExtractedField): boolean {
  return !!draft && draft.body.includes(`- ${field.label}`);
}

/** Adds one missing field to the clarification draft, or creates the draft when there is none. */
export function withAskedField(c: QuotationCase, q: Quotation, field: ExtractedField): ClarificationDraft {
  const line = askLine(field);
  const existing = c.clarification;
  if (!existing || existing.status === "sent") {
    return {
      to: c.email.from,
      subject: `Quotation request: more details needed for your ${q.product.toLowerCase()}`,
      body: `Hello ${firstName(c.email.fromName)},\n\nThank you for your request. To prepare an accurate quotation we need one more detail:\n\n${line}\n\nOnce we have it we will send the quotation within two working days.\n\nKind regards,\n${q.estimator}\nALAG`,
      status: "draft",
    };
  }
  if (existing.body.includes(`- ${field.label}`)) return existing;

  const lines = existing.body.split("\n");
  const lastBullet = lines.map((l) => l.startsWith("- ")).lastIndexOf(true);
  if (lastBullet >= 0) {
    lines.splice(lastBullet + 1, 0, line);
    return { ...existing, body: lines.join("\n") };
  }
  const sign = lines.findIndex((l) => /^kind regards/i.test(l));
  if (sign > 0) {
    lines.splice(sign, 0, line, "");
    return { ...existing, body: lines.join("\n") };
  }
  return { ...existing, body: `${existing.body}\n\n${line}` };
}

/** Polite request for a clearer scan or photo, used when the agent could not read the file at all. */
export function betterFileDraft(c: QuotationCase, q: Quotation): ClarificationDraft {
  return {
    to: c.email.from,
    subject: `Quotation request: could you send a clearer copy of your drawing?`,
    body: `Hello ${firstName(c.email.fromName)},\n\nThank you for your request for ${q.product.toLowerCase()}. We could not read the file you sent clearly enough to prepare an accurate quotation.\n\nCould you please send a clearer scan or a new photo? It helps if:\n\n- the page is flat and straight, not tilted\n- the photo or scan is sharp, at 200 dpi or more\n- the sizes (length, width and height) are visible, in inches, feet or cm\n\nOnce we have it we will send the quotation within two working days.\n\nKind regards,\n${q.estimator}\nALAG`,
    status: "draft",
  };
}
