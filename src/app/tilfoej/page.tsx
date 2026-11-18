import Link from "next/link";

import { AddFromPage } from "@/components/add-from-page";
import { listPeople } from "@/lib/db";
import { currentMember } from "@/lib/session";
import { getT } from "@/i18n/server";
import { addableLists } from "@/lib/visibility";
import { findUrl } from "@/lib/wishes";

export const dynamic = "force-dynamic";

/** Where the "Ønsk dig" bookmark lands: one click to say whose list. */
export default async function AddFromBookmark(props: PageProps<"/tilfoej">) {
  const t = getT();
  const member = await currentMember();
  const { url } = await props.searchParams;
  const found = typeof url === "string" ? findUrl(url) : null;

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-serif text-3xl tracking-tight">{t.guest.addFromBookmark.title}</h1>
      {!member ? (
        <p className="mt-4 text-muted">
          {t.guest.addFromBookmark.logInFirst}{" "}
          <Link href="/" className="underline">{t.guest.addFromBookmark.logIn}</Link>
        </p>
      ) : !found ? (
        <p className="mt-4 text-muted">{t.guest.addFromBookmark.noLink}</p>
      ) : (
        <>
          <p className="mt-2 mb-8 break-all text-sm text-muted">{found.url}</p>
          <AddFromPage
            url={found.url}
            lists={addableLists(member, listPeople()).map((p) => ({
              id: p.id,
              label: p.id === member.id ? t.guest.addFromBookmark.toYourList : t.guest.addFromBookmark.toList(p.name),
            }))}
          />
        </>
      )}
    </main>
  );
}
