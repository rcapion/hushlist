"use client";

import { useState } from "react";

import { useT } from "@/i18n/client";

/**
 * The family link, where it is needed: the phone's own share sheet (Beskeder,
 * Mail, Messenger), or the clipboard where there is none. Only adults get it;
 * the page decides.
 */
export function ShareButton({
  url,
  text,
  title,
  label,
}: {
  url: string;
  text: string;
  title?: string;
  label?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? t.common.share.title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.common.copy.prompt, url);
    }
  }

  return (
    <button type="button" onClick={share} className="btn btn-outline !px-3 !py-1.5 text-sm" aria-label={label ?? t.common.share.label}>
      {/* The share glyph iPhone users know: a box with an arrow up. */}
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      </svg>
      {copied ? t.common.copy.copied : t.common.share.button}
    </button>
  );
}
