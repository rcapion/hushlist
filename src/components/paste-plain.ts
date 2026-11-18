import type { ClipboardEvent } from "react";

/**
 * iOS puts a URL beside any copied text that starts like one, and a field
 * pastes that version: a list of links copied from a code block in a chat
 * app arrived as one line (2026-11-16). The plain text is intact on the
 * clipboard, so insert it ourselves.
 */
export function pastePlainText(e: ClipboardEvent<HTMLTextAreaElement>): void {
  const d = e.clipboardData;
  if (!d?.types.includes("text/uri-list") || d.files.length) return;
  const text = d.getData("text/plain");
  if (!text || text === d.getData("text/uri-list")) return;
  e.preventDefault();
  const ta = e.currentTarget;
  ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}
