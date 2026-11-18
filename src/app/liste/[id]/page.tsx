import Link from "next/link";
import { notFound } from "next/navigation";

import { AddWishForm } from "@/components/add-wish-form";
import { MyReservations, myReservations } from "@/components/my-reservations";
import { PeopleNav } from "@/components/people-nav";
import { SelectForm } from "@/components/select-form";
import { ShareButton } from "@/components/share-button";
import { SizesLine } from "@/components/sizes-line";
import { WishCard } from "@/components/wish-card";
import { familyToken, getPerson, listForViewer, listPeople, receivedRows } from "@/lib/db";
import { buyerOrder } from "@/lib/order";
import { sizesAge, sizesStale } from "@/lib/sizes";
import { publicOrigin, requireMember } from "@/lib/session";
import { getT } from "@/i18n/server";
import { canManage, canReserve, memberViewer, ownerGuestId } from "@/lib/visibility";

export const dynamic = "force-dynamic";

export default async function ListPage(props: PageProps<"/liste/[id]">) {
  const adult = await requireMember();
  const t = getT();
  const { id } = await props.params;
  const { optaget, vaelg } = await props.searchParams;
  const owner = getPerson(Number(id));
  if (!owner) notFound();

  const own = owner.id === adult.id;
  const manage = canManage(adult, owner);
  const viewer = memberViewer(adult);
  const buys = canReserve(viewer, owner.id);
  const people = listPeople();
  // Hidden wishes only on lists this adult manages: their own, the children's.
  const list = (personId: number) => {
    const person = people.find((x) => x.id === personId);
    const withHidden = person !== undefined && canManage(adult, person);
    return listForViewer(viewer, personId, ownerGuestId(adult.id), { withHidden });
  };
  const wishes = buyerOrder(list(owner.id));
  // Back from a refused Reservér: someone was quicker, or (to a child) it was taken all along.
  const lost = buys ? wishes.find((w) => String(w.id) === optaget) : undefined;
  const received = receivedRows(owner.id).length;
  // "Vælg": tick several and delete them at once. Only where one may delete.
  const selecting = manage && vaelg !== undefined && wishes.length > 0;

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <header className="no-print mb-6 flex items-center justify-between text-sm">
        <span className="font-serif text-lg">{t.list.page.brand}</span>
        <div className="flex items-center gap-3">
          {adult.isAdult && (
            <ShareButton
              url={`${await publicOrigin()}/f/${familyToken()}`}
              text={t.list.page.shareText(t.fmt.list(people.map((x) => x.name)))}
            />
          )}
          <Link href="/indstillinger" className="btn btn-ghost !px-0">{t.list.page.settings}</Link>
        </div>
      </header>

      <PeopleNav people={people} activeId={owner.id} hrefFor={(p) => `/liste/${p.id}`} />
      <MyReservations mine={myReservations(people, list)} hrefFor={(p) => `/liste/${p.id}`} />

      <div className="mt-8 mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl tracking-tight">{own ? t.list.page.titleOwn : t.list.page.titleOf(owner.name)}</h1>
          <div className="flex shrink-0 gap-4 text-sm">
            {received > 0 && (
              <Link href={`/liste/${owner.id}/opfyldt`} className="text-muted hover:text-ink">
                {t.list.page.received(received)}
              </Link>
            )}
            {manage && wishes.length > 1 && !selecting && (
              <Link href={`/liste/${owner.id}?vaelg`} className="text-muted hover:text-ink">
                {t.list.page.select}
              </Link>
            )}
            {wishes.length > 0 && (
              <Link href={`/liste/${owner.id}/print`} className="text-muted hover:text-ink">
                {t.list.page.print}
              </Link>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">
          {own
            ? t.list.page.seesOwn
            : manage
              ? t.list.page.seesManage(owner.name)
              : adult.isAdult
                ? t.list.page.seesAdult(owner.name)
                : t.list.page.seesChild}
        </p>
        <SizesLine
          personId={owner.id}
          sizes={owner.sizes}
          age={owner.sizesAt && sizesAge(owner.sizesAt, t.time)}
          stale={!!owner.sizesAt && sizesStale(owner.sizesAt, owner.isAdult)}
          canEdit={manage}
        />
      </div>

      {lost && (
        <div role="status" className="mb-6 rounded-2xl border border-line bg-card p-4 text-sm">
          {t.list.page.lostBefore}<b>{lost.title}</b>{t.list.page.lostAfter}
        </div>
      )}

      {manage && !selecting && (
        <div className="mb-6">
          <AddWishForm personId={owner.id} placeholder={t.list.page.addPlaceholder} />
        </div>
      )}

      {wishes.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {manage ? t.list.page.emptyManage : t.list.page.empty}
        </p>
      ) : selecting ? (
        <SelectForm personId={owner.id}>
          <ul className="grid gap-3">
            {wishes.map((w) => (
              <WishCard key={w.id} wish={w} manage={null} buyer={null} select />
            ))}
          </ul>
        </SelectForm>
      ) : (
        <ul className="grid gap-3">
          {wishes.map((w) => (
            <WishCard
              key={w.id}
              wish={w}
              manage={manage ? { received: adult.isAdult ? (own ? t.list.page.gotItOwn : t.list.page.gotItOf(owner.name)) : null } : null}
              buyer={buys ? { kind: "owner" } : null}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
