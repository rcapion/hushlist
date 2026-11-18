import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { PrintList } from "@/components/print-list";
import { sizesAge } from "@/lib/sizes";
import { getPerson, listForViewer } from "@/lib/db";
import { currentGuest, requireFamilyToken } from "@/lib/session";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function GuestPrint(props: PageProps<"/f/[token]/print/[id]">) {
  const { token, id } = await props.params;
  requireFamilyToken(token);
  const owner = getPerson(Number(id));
  if (!owner) notFound();
  const t = getT();
  const guest = await currentGuest();

  return (
    <PrintList
      title={t.print.title(owner.name)}
      sizes={owner.sizes && owner.sizesAt && `${owner.sizes} (${sizesAge(owner.sizesAt, t.time)})`}
      wishes={listForViewer({ kind: "guest", name: guest.name }, owner.id, guest.id)}
      back={
        <>
          <Link href={`/f/${token}?p=${owner.id}`} className="btn btn-ghost !px-0">{t.print.back}</Link>
          <PrintButton />
        </>
      }
    />
  );
}
