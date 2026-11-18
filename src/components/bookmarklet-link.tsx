"use client";

import { useEffect, useRef } from "react";

import { useT } from "@/i18n/client";

/**
 * A link to drag to the bookmarks bar. React 19 refuses javascript: in href,
 * so it is set on the element after render; clicking it here does nothing.
 */
export function BookmarkletLink({ code }: { code: string }) {
  const t = useT();
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", code);
  }, [code]);
  return (
    <a ref={ref} onClick={(e) => e.preventDefault()} className="btn btn-outline cursor-grab text-sm">
      {t.settings.bookmark.link}
    </a>
  );
}
