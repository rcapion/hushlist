"use client";

import { useActionState } from "react";

import { setupHousehold, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/i18n/client";

export function SetupForm() {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(setupHousehold, undefined);
  return (
    <form action={action} className="grid gap-3">
      <label className="text-sm text-muted">{t.guest.setup.adults}</label>
      <input name="adult1" className="field" placeholder={t.guest.setup.adult1Example} required />
      <input name="adult2" className="field" placeholder={t.guest.setup.adult2Example} />
      <label className="mt-3 text-sm text-muted">{t.guest.setup.children}</label>
      <textarea name="children" className="field" rows={3} />
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
      <div className="mt-2">
        <SubmitButton>{t.guest.setup.start}</SubmitButton>
      </div>
    </form>
  );
}
