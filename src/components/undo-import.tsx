"use client";

import { useState, useTransition } from "react";

import { undoImportAction } from "@/app/actions";
import { useT } from "@/i18n/client";

/** The answer to an import, with the one button that takes it all back. */
export function UndoImport({ message, undo }: { message: string; undo: { personId: number; wishIds: number[] } }) {
  const t = useT();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return <p className="text-sm text-muted">{t.list.undoImport.done(undo.wishIds.length)}</p>;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
      <span>{message}</span>
      <button
        type="button"
        className="btn btn-ghost !px-0 !py-0 text-ink underline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await undoImportAction(undo.personId, undo.wishIds);
            setDone(true);
          })
        }
      >
        {pending ? t.list.undoImport.pending : t.list.undoImport.undo}
      </button>
    </p>
  );
}
