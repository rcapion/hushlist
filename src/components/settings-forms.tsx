"use client";

import { useActionState } from "react";

import { changePasswordAction, createApiKeyAction, createInviteAction, type FormState } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { ShareButton } from "@/components/share-button";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/i18n/client";

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, undefined);
  const t = useT().settings.code;
  return (
    <form action={action} className="grid max-w-sm gap-3">
      <input name="current" type="password" className="field" placeholder={t.current} autoComplete="current-password" required />
      <input name="next" type="password" className="field" placeholder={t.next} autoComplete="new-password" required />
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
      {state?.ok && <p className="text-sm text-taken">{state.ok}</p>}
      <div>
        <SubmitButton className="btn btn-outline text-sm">{t.change}</SubmitButton>
      </div>
    </form>
  );
}

export function ApiKeyForm({ hasKey }: { hasKey: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(createApiKeyAction, undefined);
  const t = useT().settings.apiKey;
  return (
    <form action={action} className="grid gap-3">
      {state?.key ? (
        <>
          <input readOnly value={state.key} className="field font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex items-center gap-3">
            <CopyButton text={state.key} className="!px-3 !py-1.5" />
            <p className="text-sm text-muted">{t.pasteNow}</p>
          </div>
        </>
      ) : (
        <div>
          {hasKey ? (
            <ConfirmButton className="btn btn-outline text-sm" question={t.newQuestion}>
              {t.makeNew}
            </ConfirmButton>
          ) : (
            <SubmitButton className="btn btn-outline text-sm">{t.make}</SubmitButton>
          )}
        </div>
      )}
    </form>
  );
}

export function InviteButton({ personId, name, origin }: { personId: number; name: string; origin: string }) {
  const [state, action] = useActionState<FormState, FormData>(createInviteAction, undefined);
  const t = useT().settings.invite;
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="personId" value={personId} />
      {state?.key ? (
        <>
          <input readOnly value={`${origin}/invitation/${state.key}`} className="field font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
          {/* Straight into Beskeder from here (Richard, 2026-11-16): the link is made to be sent. */}
          <div className="flex gap-2">
            <ShareButton
              url={`${origin}/invitation/${state.key}`}
              text={t.shareText(name)}
              title={t.shareTitle}
              label={t.shareLabel(name)}
            />
            <CopyButton text={`${origin}/invitation/${state.key}`} className="!px-3 !py-1.5" />
          </div>
          <p className="text-sm text-muted">{t.sendTo(name)}</p>
        </>
      ) : (
        <div>
          <SubmitButton className="btn btn-outline text-sm">{t.make(name)}</SubmitButton>
        </div>
      )}
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
    </form>
  );
}
