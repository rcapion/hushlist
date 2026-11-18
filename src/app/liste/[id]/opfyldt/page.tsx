import Link from "next/link";
import { notFound } from "next/navigation";

import { unmarkReceivedAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { WishImage } from "@/components/wish-image";
import { getPerson, receivedRows } from "@/lib/db";
import { displayHost } from "@/lib/product";
import { groupHistory } from "@/lib/received";
import { requireMember } from "@/lib/session";
import { getT } from "@/i18n/server";
import { canManage, canSeeReservations, memberViewer } from "@/lib/visibility";

export const dynamic = "force-dynamic";

/**
 * Everything a person has been given, by occasion — to look back on. Who it
 * was from appears only once it can spoil nothing (received.ts decides; the
 * name is not even in the page before then).
 */
export default async function Received(props: PageProps<"/liste/[id]/opfyldt">) {
  const member = await requireMember();
  const t = getT();
  const { id } = await props.params;
  const owner = getPerson(Number(id));
  if (!owner) notFound();

  const own = owner.id === member.id;
  const manage = canManage(member, owner);
  // Whoever could see the reservation on the live list sees the giver at once
  // (a spouse, a parent); the owner and a child wait for received.ts to allow it.
  const seesGivers = canSeeReservations(memberViewer(member), owner.id);
  const groups = groupHistory(receivedRows(owner.id), owner.birthday, owner.name, new Date(), t.time, seesGivers);

  return (
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-24">
      <Link href={`/liste/${owner.id}`} className="btn btn-ghost !px-0">{t.list.received.back}</Link>
      <h1 className="mt-4 font-serif text-3xl tracking-tight">{own ? t.list.received.titleOwn : t.list.received.titleOf(owner.name)}</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        {t.list.received.intro}
      </p>

      {groups.length === 0 ? (
        <p className="py-16 text-center text-muted">{t.list.received.empty}</p>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mb-10">
            <h2 className="mb-3 font-serif text-xl">{g.label}</h2>
            <ul className="grid gap-2">
              {g.items.map((w) => (
                <li key={w.id} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3">
                  <WishImage path={w.imagePath} title={w.title} />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif leading-snug">{w.title}</p>
                    <p className="text-sm text-muted">
                      {[w.giver ? t.list.received.from(w.giver) : null, w.url ? displayHost(w.url) : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {manage && (
                    <form action={unmarkReceivedAction}>
                      <input type="hidden" name="wishId" value={w.id} />
                      <SubmitButton className="btn btn-ghost !px-2 !py-1 text-sm" pending="…">
                        {t.list.received.putBack}
                      </SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
