"use client";

import { useActionState, useEffect, useRef } from "react";

import { importWishesAction, type FormState } from "@/app/actions";
import { pastePlainText } from "@/components/paste-plain";
import { SubmitButton } from "@/components/submit-button";
import { UndoImport } from "@/components/undo-import";
import { useT } from "@/i18n/client";

/**
 * The import tool in Indstillinger: a pasted list — from Apple Notes, another
 * wishlist, a mail — one wish per line, onto one of the lists the viewer manages.
 */
export function ImportForm({ targets }: { targets: { id: number; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(importWishesAction, undefined);
  const t = useT().settings.import;
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="grid gap-3 text-sm">
      {targets.length > 1 ? (
        <select name="personId" className="field" defaultValue={targets[0].id}>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.name}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="personId" value={targets[0].id} />
      )}
      <textarea
        name="lines"
        rows={8}
        className="field"
        placeholder={t.placeholder}
        required
        onPaste={pastePlainText}
      />
      <div>
        <SubmitButton pending={t.pending}>{t.submit}</SubmitButton>
      </div>
      {state?.error && <p className="text-accent">{state.error}</p>}
      {state?.ok && state.undo ? (
        <UndoImport key={state.undo.wishIds.join()} message={state.ok} undo={state.undo} />
      ) : (
        state?.ok && <p className="text-muted">{state.ok}</p>
      )}
    </form>
  );
}
