"use client";

import { useState } from "react";

import { useT } from "@/i18n/client";

/** Copies `text` and says so for a moment; a prompt to copy by hand where the clipboard is shut. */
export function CopyButton({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.common.copy.prompt, text);
    }
  }

  return (
    <button type="button" onClick={copy} className={`btn btn-outline shrink-0 text-sm ${className}`}>
      {copied ? t.common.copy.copied : (label ?? t.common.copy.label)}
    </button>
  );
}
