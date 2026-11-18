import { existsSync } from "node:fs";

import Link from "next/link";

import {
  addChildAction,
  logout,
  removeChildAction,
  renamePersonAction,
  resetChildPasswordAction,
  revokeApiKeyAction,
  rotateFamilyLinkAction,
  setLanguageAction,
} from "@/app/actions";
import { ApiKeyForm, InviteButton, PasswordForm } from "@/components/settings-forms";
import { BookmarkletLink } from "@/components/bookmarklet-link";
import { BirthdayForm } from "@/components/birthday-form";
import { ConfirmButton } from "@/components/confirm-button";
import { DeviceOnly } from "@/components/device-only";
import { ImportForm } from "@/components/import-form";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { familyToken, hasApiKey, listPeople, signedShortcutPath } from "@/lib/db";
import { bookmarklet } from "@/lib/bookmarklet";
import { publicOrigin, requireMember } from "@/lib/session";
import { canManage } from "@/lib/visibility";
import { LOCALES } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";

/** Run on the phone by the Shortcut: only what parseProduct reads, a few kB. */
const SAFARI_SCRIPT = `var parts = [];
document.querySelectorAll('title, meta[property], meta[name], script[type="application/ld+json"]')
  .forEach(function (e) { parts.push(e.outerHTML); });
completion(parts.join("\\n"));`;

/**
 * Signed on a Mac from scripts/build-shortcut.py and put in the data directory
 * (docs/SHORTCUT.md), so a host can add it without rebuilding the app. Absent
 * until then, and the recipe stands alone.
 */
const hasSignedShortcut = () => existsSync(signedShortcutPath());

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="mb-4 font-serif text-xl">{title}</h2>
      {children}
    </section>
  );
}

function ImportSection({ targets }: { targets: { id: number; name: string }[] }) {
  const t = getT().settings.import;
  return (
    <Section title={t.title}>
      <p className="mb-3 text-sm text-muted">{t.intro}</p>
      <ImportForm targets={targets} />
    </Section>
  );
}

/** Each guide where it applies (Richard, 2026-11-17); `all` is the way past that. */
function ForDevice({ on, all, children }: { on: "ios" | "computer"; all: boolean; children: React.ReactNode }) {
  return all ? children : <DeviceOnly on={on}>{children}</DeviceOnly>;
}

async function BookmarkSection() {
  const t = getT().settings.bookmark;
  return (
    <Section title={t.title}>
      <p className="mb-3 text-sm text-muted">{t.intro}</p>
      <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm">
        <li>
          {t.step1.before}<b>⌘⇧B</b>{t.step1.mac}<b>Ctrl+Shift+B</b>{t.step1.after}
        </li>
        <li>{t.step2}</li>
        <li>
          {t.step3.before}<b>{t.step3.button}</b>{t.step3.after}
        </li>
      </ol>
      <BookmarkletLink code={bookmarklet(await publicOrigin())} />
    </Section>
  );
}

function OtherDevices({ all }: { all: boolean }) {
  return all ? null : (
    <p className="border-t border-line py-6 text-sm">
      <Link href="/indstillinger?alle" className="text-muted underline">
        {getT().settings.otherDevices}
      </Link>
    </p>
  );
}

function LanguageSection() {
  const t = getT().settings;
  const current = getLocale();
  return (
    <Section title={t.language.title}>
      <p className="mb-3 text-sm text-muted">{t.language.intro}</p>
      <form action={setLanguageAction} className="flex gap-2">
        <select name="language" defaultValue={current} className="field !w-auto" aria-label={t.language.title}>
          {Object.entries(LOCALES).map(([code, messages]) => (
            <option key={code} value={code} lang={messages.meta.htmlLang}>
              {messages.meta.name}
            </option>
          ))}
        </select>
        <SubmitButton className="btn btn-outline text-sm">{t.save}</SubmitButton>
      </form>
    </Section>
  );
}

function CodeSection() {
  const t = getT().settings.code;
  return (
    <Section title={t.title}>
      <PasswordForm />
      <form action={logout} className="mt-6">
        <button className="btn btn-ghost !px-0 text-sm">{t.logout}</button>
      </form>
    </Section>
  );
}

export default async function Settings(props: PageProps<"/indstillinger">) {
  const adult = await requireMember();
  const s = getT().settings;
  const all = (await props.searchParams).alle !== undefined;

  // A child sees their code and nothing else: the family link would show them
  // their own reservations, and the rest is the parents' business.
  if (!adult.isAdult) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
        <Link href={`/liste/${adult.id}`} className="btn btn-ghost !px-0">{s.back}</Link>
        <h1 className="mt-4 mb-4 font-serif text-3xl tracking-tight">{s.title}</h1>
        <ImportSection targets={[{ id: adult.id, name: adult.name }]} />
        <ForDevice on="computer" all={all}>
          <BookmarkSection />
        </ForDevice>
        <CodeSection />
        <OtherDevices all={all} />
      </main>
    );
  }

  const origin = await publicOrigin();
  const familyLink = `${origin}/f/${familyToken()}`;
  const people = listPeople();
  const children = people.filter((p) => !p.isAdult);
  const uninvited = people.filter((p) => !p.hasPassword);
  const i = s.iphone;

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <Link href={`/liste/${adult.id}`} className="btn btn-ghost !px-0">{s.back}</Link>
      <h1 className="mt-4 mb-4 font-serif text-3xl tracking-tight">{s.title}</h1>

      <Section title={s.familyLink.title}>
        <p className="mb-3 text-sm text-muted">{s.familyLink.intro}</p>
        <div className="flex gap-2">
          <input readOnly value={familyLink} className="field min-w-0 font-mono text-sm" />
          <CopyButton text={familyLink} />
        </div>
        <form action={rotateFamilyLinkAction} className="mt-2">
          <ConfirmButton
            className="btn btn-ghost !px-0 text-sm"
            question={s.familyLink.rotateQuestion}
          >
            {s.familyLink.rotate}
          </ConfirmButton>
        </form>
      </Section>

      {uninvited.length > 0 && (
        <Section title={s.invite.title}>
          <p className="mb-3 text-sm text-muted">{s.invite.intro}</p>
          <div className="grid gap-4">
            {uninvited.map((p) => (
              <InviteButton key={p.id} personId={p.id} name={p.name} origin={origin} />
            ))}
          </div>
        </Section>
      )}

      <Section title={s.birthdays.title}>
        <p className="mb-3 text-sm text-muted">{s.birthdays.intro}</p>
        <div className="grid gap-2">
          {people.map((p) => (
            <BirthdayForm key={p.id} personId={p.id} name={p.name} birthday={p.birthday} />
          ))}
        </div>
      </Section>

      <Section title={s.children.title}>
        <ul className="grid gap-3">
          {children.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
              <form action={renamePersonAction} className="flex min-w-0 flex-1 basis-64 gap-2">
                <input type="hidden" name="personId" value={c.id} />
                <input name="name" defaultValue={c.name} className="field min-w-0" required />
                <SubmitButton className="btn btn-outline text-sm">{s.save}</SubmitButton>
              </form>
              {c.hasPassword && (
                <form action={resetChildPasswordAction}>
                  <input type="hidden" name="personId" value={c.id} />
                  <ConfirmButton className="btn btn-ghost text-sm" question={s.children.resetQuestion(c.name)}>
                    {s.children.reset}
                  </ConfirmButton>
                </form>
              )}
              <form action={removeChildAction}>
                <input type="hidden" name="personId" value={c.id} />
                <ConfirmButton className="btn btn-ghost text-sm" question={s.children.removeQuestion(c.name)}>
                  {s.children.remove}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={addChildAction} className="mt-3 flex gap-2">
          <input name="name" className="field" placeholder={s.children.addPlaceholder} required />
          <SubmitButton className="btn btn-outline text-sm">{s.children.add}</SubmitButton>
        </form>
      </Section>

      <ImportSection
        targets={people.filter((p) => canManage(adult, p)).map((p) => ({ id: p.id, name: p.id === adult.id ? s.import.myList : s.import.listOf(p.name) }))}
      />

      <ForDevice on="ios" all={all}>
        <Section title={i.title}>
          <p className="mb-3 text-sm text-muted">{i.intro}</p>
          {hasSignedShortcut() ? (
            <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm">
              <li>
                {i.signed.step1.before}<b>{i.signed.step1.key}</b>{i.signed.step1.middle}<b>{i.signed.step1.copy}</b>{i.signed.step1.after}
              </li>
              <li>
                {i.signed.step2.before}<b>{i.signed.step2.get}</b>{i.signed.step2.after}
              </li>
              <li>
                {i.signed.step3.before}<b>{i.signed.step3.add}</b>{i.signed.step3.after}
              </li>
              <li>
                {i.signed.step4.before}<b>{i.signed.step4.share}</b> → <b>{i.shortcutName}</b>{i.signed.step4.middle}
                <b>{i.signed.step4.edit}</b>{i.signed.step4.after}
              </li>
            </ol>
          ) : (
            <p className="mb-3 text-sm text-muted">{i.unsigned}</p>
          )}
          <ApiKeyForm hasKey={hasApiKey(adult.id)} />
          {hasApiKey(adult.id) && (
            <form action={revokeApiKeyAction} className="mt-2">
              <SubmitButton className="btn btn-ghost !px-0 text-sm">{i.deleteKey}</SubmitButton>
            </form>
          )}
          {hasSignedShortcut() && (
            <a href="/hushlist.shortcut" download={`${i.shortcutName}.shortcut`} className="btn btn-outline mt-3 text-sm">
              {i.download}
            </a>
          )}
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted">
              {hasSignedShortcut() ? i.buildYourself : i.howToBuild}
            </summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5">
              <li>{i.build.step1.before}<b>{i.build.step1.shareSheet}</b>{i.build.step1.after}</li>
              <li>{i.build.step2.before}<b>{i.build.step2.action}</b>{i.build.step2.after}<code className="break-all">{origin}/api/wishes</code>{i.build.step2.end}</li>
              <li>{i.build.step3.method}<b>POST</b>{i.build.step3.header}<code>Authorization</code> = <code>Bearer</code>{i.build.step3.plus}</li>
              <li>{i.build.step4.body}<b>JSON</b>{i.build.step4.field}<code>url</code> = <i>{i.build.step4.input}</i>{i.build.step4.child}<code>til</code>{i.build.step4.childAfter}</li>
              <li>{i.build.step5.before}<b>{i.build.step5.dictionary}</b>{i.build.step5.middle}<code>message</code>{i.build.step5.and}<b>{i.build.step5.notify}</b>{i.build.step5.after}</li>
            </ol>
          </details>
          {/* The downloaded Shortcut reads the page itself; only a hand-built one needs this. */}
          {!hasSignedShortcut() && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted">{i.safari.summary}</summary>
              <p className="mt-3">{i.safari.intro}</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                <li>{i.safari.step1.before}<b>{i.safari.step1.pages}</b>{i.safari.step1.after}</li>
                <li>{i.safari.step2.before}<b>{i.safari.step2.getUrl}</b>{i.safari.step2.middle}<b>{i.safari.step2.runJs}</b>{i.safari.step2.after}</li>
                <li>{i.safari.step3.before}<code>html</code> = <i>{i.safari.step3.result}</i>{i.safari.step3.after}</li>
              </ol>
              <pre className="mt-3 overflow-x-auto rounded bg-black/5 p-3 text-xs">{SAFARI_SCRIPT}</pre>
            </details>
          )}
        </Section>
      </ForDevice>

      <ForDevice on="computer" all={all}>
        <BookmarkSection />
      </ForDevice>
      <LanguageSection />
      <CodeSection />
      <OtherDevices all={all} />
    </main>
  );
}
