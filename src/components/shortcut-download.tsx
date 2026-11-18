"use client";

import { useEffect, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { useT } from "@/i18n/client";

/**
 * "Hent genvejen" in Safari; in the Home Screen app, the way to Safari instead.
 * There a download either leaves the app on a page with no way back (in place)
 * or opens a window that stays blank (target=_blank) — both seen on an iPhone,
 * 2026-11-18. So the app only points to Safari, with the address to paste.
 */
export function ShortcutDownload({ settingsUrl }: { settingsUrl: string }) {
  const t = useT().settings.iphone;
  const [standalone, setStandalone] = useState<boolean | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches);
  }, []);
  if (standalone === null) return null;
  if (!standalone) {
    return (
      <a href="/hushlist.shortcut" className="btn btn-outline mt-3 text-sm">
        {t.download}
      </a>
    );
  }
  return (
    <div className="mt-3 text-sm">
      <p className="text-muted">{t.downloadInSafari}</p>
      <CopyButton text={settingsUrl} label={t.copySettingsAddress} className="mt-2 text-sm" />
    </div>
  );
}
