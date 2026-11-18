import { WishImage } from "@/components/wish-image";
import { buyerOrder } from "@/lib/order";
import { displayHost } from "@/lib/product";
import { getT } from "@/i18n/server";
import { TIME_ZONE } from "@/lib/config";
import type { WishView } from "@/lib/visibility";

/**
 * The print view is the viewer's own view on paper: the same WishView, already
 * stripped by the visibility rule. It never queries anything itself.
 *
 * Made to be carried into a shop: a dense list in two columns, what the viewer
 * reserved and what can still be bought first, what others have taken set
 * apart at the end.
 *
 * Each wish is an inline-block: the last one was split across two pages
 * (Richard, 2026-11-16) although it had break-inside: avoid, which Safari
 * does not honour on a flex box in columns. A browser never splits an inline
 * block; it moves it whole to the next column or page.
 */
export function PrintList({
  title,
  sizes,
  wishes,
  back,
}: {
  title: string;
  /** "Tøj 134, sko 33 (for 2 måneder siden)" — what the shop assistant asks. */
  sizes?: string | null;
  wishes: WishView[];
  back: React.ReactNode;
}) {
  const t = getT();
  const ordered = buyerOrder(wishes);
  const takenByOthers = (w: WishView) => w.reservation.visible && w.reservation.reservation !== null && !w.reservation.mine;
  const open = ordered.filter((w) => !takenByOthers(w));
  const taken = ordered.filter(takenByOthers);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:p-0">
      <div className="no-print mb-8 flex items-center justify-between">{back}</div>
      <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h1 className="font-serif text-2xl tracking-tight">{title}</h1>
        <p className="shrink-0 text-xs text-muted">{t.print.printed(t.fmt.longDate(new Date(), TIME_ZONE))}</p>
      </header>
      {sizes && <p className="-mt-2 mb-4 text-sm">{t.print.sizes(sizes)}</p>}
      {wishes.length === 0 ? (
        <p className="text-muted">{t.print.empty}</p>
      ) : (
        <>
          <Items wishes={open} />
          {taken.length > 0 && (
            <>
              <h2 className="mt-5 mb-1 text-xs tracking-wide text-muted uppercase">{t.print.takenByOthers}</h2>
              <Items wishes={taken} taken />
            </>
          )}
        </>
      )}
    </main>
  );
}

function Items({ wishes, taken = false }: { wishes: WishView[]; taken?: boolean }) {
  const t = getT();
  return (
    <ol className="gap-x-8 sm:columns-2 print:columns-2">
      {wishes.map((w) => {
        const r = w.reservation;
        const meta = [w.url ? displayHost(w.url) : null, w.price].filter(Boolean).join(" · ");
        return (
          <li key={w.id} className="inline-block w-full break-inside-avoid align-top">
            <div className="flex gap-3 border-b border-line py-2">
              <WishImage path={w.imagePath} title={w.title} size="sm" />
              <div className="min-w-0 flex-1">
                <p className={`font-serif text-[15px] leading-tight ${taken ? "text-muted line-through decoration-1" : ""}`}>
                  {w.favourite && <span className="text-accent">★ </span>}
                  {w.title}
                </p>
                {(meta || w.note) && (
                  <p className="mt-0.5 text-xs leading-snug text-muted">
                    {meta}
                    {meta && w.note && " — "}
                    {w.note && <span className="text-ink">{w.note}</span>}
                  </p>
                )}
                {r.visible && r.reservation && (
                  <p className="mt-0.5 text-xs text-taken">
                    ✓ {r.mine ? t.print.reservedByYou : t.print.reservedBy(r.reservation.guestName)}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
