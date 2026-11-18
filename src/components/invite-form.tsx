"use client";

import { useActionState } from "react";

import { acceptInviteAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/i18n/client";

export function InviteForm({ token, name }: { token: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInviteAction, undefined);
  const t = useT().settings.acceptInvite;
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      <input type="text" name="username" value={name} autoComplete="username" readOnly hidden />
      <input name="password" type="password" className="field" placeholder={t.password} autoComplete="new-password" autoFocus required />
      <input name="confirm" type="password" className="field" placeholder={t.confirm} autoComplete="new-password" required />
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
      <div>
        <SubmitButton>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
