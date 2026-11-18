"use client";

import { useActionState, useState } from "react";

import { login, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/i18n/client";

type Adult = { id: number; name: string };

/**
 * Name and code. `firstRun` is the one exception: while nobody in the
 * household has a code, the adults are shown so the first one can claim theirs.
 */
export function LoginForm({ firstRun }: { firstRun: Adult[] | null }) {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(login, undefined);
  const [chosen, setChosen] = useState<Adult | null>(firstRun?.length === 1 ? firstRun[0] : null);

  if (firstRun) {
    return (
      <div className="grid gap-4">
        <div className="flex gap-2">
          {firstRun.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setChosen(a)}
              className={`btn flex-1 ${chosen?.id === a.id ? "btn-primary" : "btn-outline"}`}
            >
              {a.name}
            </button>
          ))}
        </div>
        {chosen && (
          <form action={action} className="grid gap-3" key={chosen.id}>
            <input type="hidden" name="personId" value={chosen.id} />
            <input type="text" name="username" value={chosen.name} autoComplete="username" readOnly hidden />
            <p className="text-sm text-muted">{t.guest.login.firstRunPrompt(chosen.name)}</p>
            <input name="password" type="password" className="field" placeholder={t.guest.login.newPassword} autoComplete="new-password" autoFocus required />
            <input name="confirm" type="password" className="field" placeholder={t.guest.login.confirmPassword} autoComplete="new-password" required />
            {state?.error && <p className="text-sm text-accent">{state.error}</p>}
            <div>
              <SubmitButton>{t.guest.login.saveAndLogIn}</SubmitButton>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <input name="username" className="field" placeholder={t.guest.login.name} autoComplete="username" autoCapitalize="words" required />
      <input name="password" type="password" className="field" placeholder={t.guest.login.password} autoComplete="current-password" required />
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
      <div>
        <SubmitButton>{t.guest.login.logIn}</SubmitButton>
      </div>
      <p className="text-sm text-muted">{t.guest.login.noCode}</p>
    </form>
  );
}
