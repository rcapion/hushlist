"use client";

import { useState, useTransition } from "react";

import { setSizesAction } from "@/app/actions";
import { useT } from "@/i18n/client";

/**
 * Størrelser under the list's name: muted text, its age, and for a child's
 * half-year-old sizes a "måske for lille nu". Those who manage the list tap
 * it to edit in place; with nothing set, guests see nothing at all.
 */
export function SizesLine({
  personId,
  sizes,
  age,
  stale,
  canEdit,
}: {
  personId: number;
  sizes: string | null;
  age: string | null;
  stale: boolean;
  canEdit: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!sizes && !canEdit) return null;

  if (editing) {
    return (
      <form
        className="mt-2 flex gap-2"
        action={(data) =>
          startTransition(async () => {
            await setSizesAction(data);
            setEditing(false);
          })
        }
      >
        <input type="hidden" name="personId" value={personId} />
        <input
          name="sizes"
          defaultValue={sizes ?? ""}
          maxLength={120}
          placeholder={t.list.sizes.placeholder}
          className="field text-sm"
          aria-label={t.list.sizes.label}
          autoFocus
        />
        <button className="btn btn-outline shrink-0 text-sm" disabled={pending}>
          {t.list.sizes.save}
        </button>
      </form>
    );
  }

  const text = sizes ? (
    <>
      <span className="text-ink">{t.list.sizes.heading}</span> {sizes}
      {age && <span className="opacity-70"> · {stale ? t.list.sizes.stale(age) : age}</span>}
    </>
  ) : (
    t.list.sizes.add
  );

  return canEdit ? (
    <button type="button" onClick={() => setEditing(true)} className="mt-2 block text-left text-sm text-muted hover:text-ink">
      {text}
    </button>
  ) : (
    <p className="mt-2 text-sm text-muted">{text}</p>
  );
}
