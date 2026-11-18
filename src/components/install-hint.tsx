"use client";

import { useEffect, useState } from "react";

import { useT } from "@/i18n/client";

const DISMISSED = "onskeliste.installHint";

/** Safari on an iPhone or iPad, not already opened from the Home Screen. Other iOS browsers have other menus. */
function wanted(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const standalone = (navigator as { standalone?: boolean }).standalone === true;
  return ios && safari && !standalone && localStorage.getItem(DISMISSED) === null;
}

function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center">
      <span className="grid size-11 place-items-center rounded-xl border border-line bg-paper">{icon}</span>
      <span className="text-xs leading-tight">{label}</span>
    </div>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Share = (
  <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4" {...stroke} />
    <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" {...stroke} />
  </svg>
);

const AddSquare = (
  <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="4" {...stroke} />
    <path d="M12 8.5v7M8.5 12h7" {...stroke} />
  </svg>
);

const Arrow = <span className="mt-3 text-muted" aria-hidden>→</span>;

/**
 * "Læg den på hjemmeskærmen", drawn (Richard, 2026-11-17). Two steps, not three:
 * the first draft drew iOS 26's ••• button, which iOS 27 does not have (Richard).
 * Apple's own guide says "Page Menu → Share, or the Share button", so the one
 * icon that does not move is Del, and the menu is a sentence, not a picture.
 * Once dismissed, never again on this browser.
 */
export function InstallHint() {
  const t = useT().shell.installHint;
  const [show, setShow] = useState(false);
  useEffect(() => setShow(wanted()), []);
  if (!show) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED, new Date().toISOString());
    setShow(false);
  }

  return (
    <aside className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-line bg-card p-4 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="font-serif text-lg leading-snug">{t.title}</p>
        <button type="button" onClick={dismiss} className="-mt-1 -mr-1 px-2 text-xl text-muted" aria-label={t.close}>
          ×
        </button>
      </div>
      <div className="flex items-start justify-center gap-2">
        <Step icon={Share} label={t.share} />
        {Arrow}
        <Step icon={AddSquare} label={t.addToHomeScreen} />
      </div>
      <p className="mt-3 text-center text-xs text-muted">{t.footer}</p>
    </aside>
  );
}
