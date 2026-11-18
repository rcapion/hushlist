"use client";

import { useActionState, useEffect, useRef } from "react";

import { addWishAction, type FormState } from "@/app/actions";
import { pastePlainText } from "@/components/paste-plain";
import { SubmitButton } from "@/components/submit-button";
import { UndoImport } from "@/components/undo-import";
import { useT } from "@/i18n/client";

export function AddWishForm({ personId, placeholder }: { personId: number; placeholder: string }) {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(addWishAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  const opened = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
    // A typed wish, or a link the shop refused: fold its Ret open in the list,
    // and close the one opened for the wish before. The cursor stays here, so
    // the next wish can be typed straight away and the details left for later.
    opened.current?.removeAttribute("open");
    opened.current = null;
    if (state?.open) {
      const details = document.querySelector<HTMLDetailsElement>(`#wish-${state.open} details[data-edit]`);
      if (details) {
        details.open = true;
        opened.current = details;
        details.closest("li")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [state]);

  return (
    <form ref={form} action={action} className="no-print">
      <input type="hidden" name="personId" value={personId} />
      <div className="flex gap-2">
        {/* A textarea, not an input: iOS turns the line breaks of a pasted list
            into spaces in a one-line field, and a list became one wish. */}
        <textarea
          name="input"
          className="field resize-none [field-sizing:content] max-h-48"
          rows={1}
          placeholder={placeholder}
          autoComplete="off"
          required
          onPaste={pastePlainText}
          onKeyDown={(e) => {
            // Enter adds, as before; Shift+Enter (and paste) keep line breaks.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <SubmitButton pending={t.list.add.pending} className="btn btn-primary self-start">{t.list.add.button}</SubmitButton>
      </div>
      {state?.error && <p className="mt-2 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.undo ? (
        <div key={state.undo.wishIds.join()} className="mt-2">
          <UndoImport message={state.ok} undo={state.undo} />
        </div>
      ) : (
        // A plain success (addWishAction's own message) needs no words: the wish opens.
        state?.ok && state.ok !== t.server.actions.added && <p className="mt-2 text-sm text-muted">{state.ok}</p>
      )}
    </form>
  );
}
