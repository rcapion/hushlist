"use client";

import { useT } from "@/i18n/client";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      {t.print.print}
    </button>
  );
}
