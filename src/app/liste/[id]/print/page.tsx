import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { PrintList } from "@/components/print-list";
import { sizesAge } from "@/lib/sizes";
import { getPerson, listForViewer } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { getT } from "@/i18n/server";
import { memberViewer, ownerGuestId } from "@/lib/visibility";

export const dynamic = "force-dynamic";

export default async function OwnerPrint(props: PageProps<"/liste/[id]/print">) {
  const adult = await requireMember();
  const { id } = await props.params;
  const owner = getPerson(Number(id));
  if (!owner) notFound();
  const t = getT();

  return (
    <PrintList
      title={t.print.title(owner.name)}
      sizes={owner.sizes && owner.sizesAt && `${owner.sizes} (${sizesAge(owner.sizesAt, t.time)})`}
      wishes={listForViewer(memberViewer(adult), owner.id, ownerGuestId(adult.id))}
      back={
        <>
          <Link href={`/liste/${owner.id}`} className="btn btn-ghost !px-0">{t.print.back}</Link>
          <PrintButton />
        </>
      }
    />
  );
}
