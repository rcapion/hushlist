"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { removeWishesAction } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { useT } from "@/i18n/client";

/**
 * "Vælg" on a list (Richard, 2026-11-16: an import that went in twice cost
 * three taps per wish to undo). The cards carry the checkboxes; this form
 * counts them and holds the one bar that deletes them.
 */
export function SelectForm({ personId, children }: { personId: number; children: React.ReactNode }) {
  const t = useT();
  const form = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const boxes = () => Array.from(form.current?.querySelectorAll<HTMLInputElement>('input[name="wishId"]') ?? []);
  const recount = () => setCount(boxes().filter((b) => b.checked).length);
  const all = count > 0 && count === boxes().length;

  return (
    <form ref={form} action={removeWishesAction} onChange={recount}>
      <input type="hidden" name="personId" value={personId} />
      {children}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 py-3 text-sm">
          <button
            type="button"
            className="btn btn-ghost !px-2 !py-1.5"
            onClick={() => {
              for (const b of boxes()) b.checked = !all;
              recount();
            }}
          >
            {all ? t.list.select.none : t.list.select.all}
          </button>
          <Link href={`/liste/${personId}`} className="btn btn-ghost !px-2 !py-1.5">
            {t.list.select.cancel}
          </Link>
          {count > 0 ? (
            <ConfirmButton
              className="btn btn-primary ml-auto !py-1.5"
              question={t.list.select.question(count)}
            >
              {t.list.select.delete(count)}
            </ConfirmButton>
          ) : (
            <span className="ml-auto text-muted">{t.list.select.prompt}</span>
          )}
        </div>
      </div>
    </form>
  );
}
