import Link from "next/link";

import { guestNameAction } from "@/app/actions";
import { MyReservations, myReservations } from "@/components/my-reservations";
import { PeopleNav } from "@/components/people-nav";
import { SizesLine } from "@/components/sizes-line";
import { SubmitButton } from "@/components/submit-button";
import { WishCard } from "@/components/wish-card";
import { listForViewer, listPeople } from "@/lib/db";
import { buyerOrder } from "@/lib/order";
import { currentGuest, requireFamilyToken } from "@/lib/session";
import { sizesAge, sizesStale } from "@/lib/sizes";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function FamilyPage(props: PageProps<"/f/[token]">) {
  const { token } = await props.params;
  requireFamilyToken(token);
  const t = getT();
  const guest = await currentGuest();

  const people = listPeople();
  const { p, kig, reserver, reserveret, optaget } = await props.searchParams;
  const pick = typeof p === "string" ? p : "";

  // The first visit (Richard, 2026-11-16): some of the family are wary of typing
  // anything on the internet. So: who this is from, in names they know; only a
  // first name, and why; and a way in without typing anything at all. The names
  // are only ever shown behind the family link.
  if (!guest.name && kig === undefined) {
    return (
      <main className="mx-auto max-w-md px-6 py-14">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static icon */}
        <img src="/icon.svg" alt="" className="h-16 w-16" />
        <h1 className="mt-6 font-serif text-3xl leading-snug tracking-tight">
          {t.guest.family.welcome.title(people.map((x) => x.name))}
        </h1>
        <p className="mt-3 text-muted">
          {t.guest.family.welcome.intro}
        </p>

        <form action={guestNameAction} className="mt-8 grid gap-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="p" value={pick} />
          {typeof reserver === "string" && /^\d+$/.test(reserver) && <input type="hidden" name="w" value={reserver} />}
          <label htmlFor="name" className="font-serif text-lg">
            {reserver !== undefined ? t.guest.family.welcome.nameBeforeReserving : t.guest.family.welcome.name}
          </label>
          <input
            id="name"
            name="name"
            className="field"
            placeholder={t.guest.family.welcome.namePlaceholder}
            autoComplete="given-name"
            autoCapitalize="words"
            required
            maxLength={40}
          />
          <p className="text-sm text-muted">
            {t.guest.family.welcome.nameWhy}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <SubmitButton>{t.guest.family.welcome.enter}</SubmitButton>
            <Link href={`/f/${token}?kig${pick ? `&p=${pick}` : ""}`} className="text-sm text-muted underline-offset-4 hover:underline">
              {t.guest.family.welcome.justLook}
            </Link>
          </div>
        </form>
      </main>
    );
  }

  const active = people.find((x) => String(x.id) === p) ?? people[0];
  const viewer = { kind: "guest", name: guest.name } as const;
  const list = (personId: number) => listForViewer(viewer, personId, guest.id);
  const wishes = active ? buyerOrder(list(active.id)) : [];
  // Looking without a name keeps `kig` on every link, or the welcome comes back.
  const hrefFor = (x: { id: number }) => `/f/${token}?p=${x.id}${guest.name ? "" : "&kig"}`;
  // Just back from the name form with a reservation: say so where it cannot be
  // missed. Only about a wish on this list, and only what the list itself says.
  const just = wishes.find((w) => String(w.id) === reserveret && w.reservation.visible && w.reservation.mine);
  const lost = wishes.find((w) => String(w.id) === optaget);

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <header className="mb-6 flex items-center justify-between text-sm">
        <span className="font-serif text-lg">{t.shell.appName}</span>
        {guest.name ? (
          <span className="text-muted">{t.guest.family.hello(guest.name)}</span>
        ) : (
          <Link href={`/f/${token}?p=${active?.id ?? ""}`} className="text-muted hover:text-ink">{t.guest.family.writeYourName}</Link>
        )}
      </header>

      {just && active && (
        <div role="status" className="mb-6 rounded-2xl border border-taken bg-taken-soft p-4">
          <p className="font-serif text-lg text-taken">{t.guest.family.reserved(just.title)}</p>
          <p className="mt-1 text-sm">
            {t.guest.family.reservedWhere(active.name)}
          </p>
        </div>
      )}
      {lost && (
        <div role="status" className="mb-6 rounded-2xl border border-line bg-card p-4 text-sm">
          {t.guest.family.lostBefore}
          <b>{lost.title}</b>
          {t.guest.family.lostAfter}
        </div>
      )}

      <PeopleNav people={people} activeId={active?.id} hrefFor={hrefFor} />
      <MyReservations mine={myReservations(people, list)} hrefFor={hrefFor} />

      {active && (
        <>
          <div className="mt-8 mb-6">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="font-serif text-3xl tracking-tight">{t.guest.family.wishesOf(active.name)}</h1>
              {wishes.length > 0 && (
                <Link href={`/f/${token}/print/${active.id}`} className="shrink-0 text-sm text-muted hover:text-ink">
                  {t.guest.family.print}
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {t.guest.family.howTo(active.name)}
            </p>
            <SizesLine
              personId={active.id}
              sizes={active.sizes}
              age={active.sizesAt && sizesAge(active.sizesAt, t.time)}
              stale={!!active.sizesAt && sizesStale(active.sizesAt, active.isAdult)}
              canEdit={false}
            />
          </div>
          {wishes.length === 0 ? (
            <p className="py-16 text-center text-muted">{t.guest.family.noWishes(active.name)}</p>
          ) : (
            <ul className="grid gap-3">
              {wishes.map((w) => (
                <WishCard key={w.id} wish={w} manage={null} buyer={{ kind: "guest", token }} />
              ))}
            </ul>
          )}
        </>
      )}

      <footer className="mt-16 text-center text-xs text-muted">
        <Link href="/?login" className="hover:text-ink">{t.guest.family.livesHere}</Link>
      </footer>
    </main>
  );
}
