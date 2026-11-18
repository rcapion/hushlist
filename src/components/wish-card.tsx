import {
  clearReservationAction,
  guestReserveAction,
  ownerReserveAction,
  removeImageAction,
  removeWishAction,
  toggleFavouriteAction,
  toggleHiddenAction,
} from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { EditWishForm } from "@/components/edit-wish-form";
import { FikDetButton } from "@/components/fik-det-button";
import { SubmitButton } from "@/components/submit-button";
import { WishImage } from "@/components/wish-image";
import { WishImageUpload } from "@/components/wish-image-upload";
import { displayHost } from "@/lib/product";
import { getT } from "@/i18n/server";
import type { WishView } from "@/lib/visibility";

/**
 * `manage`: the viewer may edit this list. `received` is null when they may
 * not press "Fik det" (a child: see received.ts for why).
 * `buyer`: how the viewer reserves — as a logged-in adult, or as a guest with
 * the family token. Null on one's own list, where there is nothing to buy.
 *
 * One row of actions under the wish, and only what the viewer can do there.
 * A free wish says nothing about being free: that is the default.
 */
type Props = {
  wish: WishView;
  manage: { received: string | null } | null;
  buyer: { kind: "owner" } | { kind: "guest"; token: string } | null;
};

/** `select`: the list is in "Vælg" mode — a checkbox instead of the actions, for SelectForm. */
export function WishCard({ wish, manage, buyer, select = false }: Props & { select?: boolean }) {
  const t = getT();
  const r = wish.reservation;
  const takenByOther = r.visible && r.reservation !== null && !r.mine;
  const mine = r.visible && r.reservation !== null && r.mine;
  const meta = [wish.price, wish.url ? displayHost(wish.url) : null].filter(Boolean).join(" · ");

  return (
    // On a phone the actions take their own line; on a wide screen they sit
    // at the right, beside the wish.
    // Mine stands out: the card one comes back to look for.
    <li
      id={`wish-${wish.id}`}
      className={`relative flex scroll-mt-4 flex-wrap items-end gap-x-4 gap-y-3 rounded-2xl border p-4 ${mine ? "border-taken bg-taken-soft/50" : "border-line bg-card"}`}
    >
      {/* Only the wish fades when someone else took it; its edit form stays legible. */}
      <div className={`flex min-w-0 flex-1 basis-80 gap-4 ${select ? "pr-8" : ""} ${takenByOther || wish.hidden ? "opacity-60" : ""}`}>
        <WishImage path={wish.imagePath} title={wish.title} />
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg leading-snug">
            {wish.url && !select ? (
              <a href={wish.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {wish.title}
              </a>
            ) : (
              wish.title
            )}
          </h3>
          {(wish.favourite || meta || wish.hidden) && (
            <p className="mt-0.5 text-sm text-muted">
              {wish.hidden && <span className="text-ink">{t.list.card.hidden}{(wish.favourite || meta) && " · "}</span>}
              {wish.favourite && <span className="text-accent">{t.list.card.favourite}{meta && " · "}</span>}
              {meta}
            </p>
          )}
          {wish.note && <p className="mt-1 text-sm">{wish.note}</p>}
          {/* The nightly link check: for those who can fix it, never for guests. */}
          {manage && wish.linkProblem && (
            <p className="mt-1 text-sm text-accent">
              {wish.linkProblem === "gone" ? t.list.card.linkGone : t.list.card.soldOut}
            </p>
          )}
        </div>
      </div>

      {select ? (
        // The whole card toggles it: a 20 px box is a small target on a phone.
        <label className="absolute inset-0 flex cursor-pointer items-start justify-end rounded-2xl p-4 has-[:checked]:ring-2 has-[:checked]:ring-accent">
          <input type="checkbox" name="wishId" value={wish.id} className="size-5 accent-accent" aria-label={wish.title} />
        </label>
      ) : (
        <Actions wish={wish} manage={manage} buyer={buyer} />
      )}
    </li>
  );
}

function Actions({ wish, manage, buyer }: Props) {
  const t = getT();
  const r = wish.reservation;
  const reserved = r.visible ? r.reservation : null;
  const mine = r.visible && r.mine;

  let status: React.ReactNode = null;
  if (reserved && mine) status = <span className="font-medium text-taken">{t.list.card.reservedByYou}</span>;
  else if (reserved) status = <span className="text-taken">{t.list.card.reservedBy(reserved.guestName)}</span>;

  // Reserve when free, undo when it is mine; someone else's is not ours to touch.
  // A hidden wish is not for giving until it is shown again (db.reserve agrees).
  const canReserve = r.visible && buyer !== null && !wish.hidden && (reserved === null || mine);
  // A parent on a child's list may undo a reservation that should not be there.
  const clearable = manage !== null && reserved !== null && !mine ? reserved.guestName : null;

  if (!status && !canReserve && !manage) return null;

  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm max-sm:basis-full has-[details[open]]:basis-full">
      {status && <span className="mr-auto">{status}</span>}

      {/* The buttons move as one: a lone "Fik det" on a line of its own reads as a different thing.
          Ret comes first, quiet, so it does not sit between the two that act on the wish (Richard, 2026-11-16). */}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1 has-[details[open]]:basis-full">
        {manage && <Manage wish={wish} clearable={clearable} />}

        {canReserve && (
          <form action={buyer?.kind === "guest" ? guestReserveAction : ownerReserveAction}>
            <input type="hidden" name="wishId" value={wish.id} />
            {buyer?.kind === "guest" && <input type="hidden" name="token" value={buyer.token} />}
            {mine ? (
              <SubmitButton className="btn btn-ghost !px-2 !py-1.5 text-sm" name="release" value="1" pending="…">
                {t.list.card.undo}
              </SubmitButton>
            ) : (
              <SubmitButton className="btn btn-outline !py-1.5 text-sm" pending="…">
                {t.list.card.reserve}
              </SubmitButton>
            )}
          </form>
        )}

        {manage && manage.received !== null && <FikDetButton wishId={wish.id} />}
      </div>
    </div>
  );
}

/** "Ret" opens everything rare; "Fik det" stays out, because it ends every wish. */
function Manage({ wish, clearable }: { wish: WishView; clearable: string | null }) {
  const t = getT();
  return (
    <details data-edit className="group open:order-last open:basis-full">
      <summary className="btn btn-ghost !px-2 !py-1.5 list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{t.list.card.edit}</span>
        <span className="hidden group-open:inline">{t.list.card.close}</span>
      </summary>
      <EditWishForm
        wishId={wish.id}
        initial={{ title: wish.title, price: wish.price ?? "", url: wish.url ?? "", note: wish.note ?? "" }}
      />
      {/* Saves at once too: the picture shows on the card as proof. */}
      <WishImageUpload wishId={wish.id} hasImage={wish.imagePath !== null} />
      <div className="mt-2 flex flex-wrap items-center justify-between">
        <form action={toggleFavouriteAction}>
          <input type="hidden" name="wishId" value={wish.id} />
          <SubmitButton className="btn btn-ghost !px-2 !py-1.5 text-sm">
            {wish.favourite ? t.list.card.unfavourite : t.list.card.makeFavourite}
          </SubmitButton>
        </form>
        <form action={toggleHiddenAction}>
          <input type="hidden" name="wishId" value={wish.id} />
          <SubmitButton className="btn btn-ghost !px-2 !py-1.5 text-sm">
            {wish.hidden ? t.list.card.unhide : t.list.card.hide}
          </SubmitButton>
        </form>
        {clearable && (
          <form action={clearReservationAction}>
            <input type="hidden" name="wishId" value={wish.id} />
            <ConfirmButton className="btn btn-ghost !px-2 !py-1.5 text-sm" question={t.list.card.clearQuestion(clearable)}>
              {t.list.card.clear}
            </ConfirmButton>
          </form>
        )}
        {wish.imagePath && (
          <form action={removeImageAction}>
            <input type="hidden" name="wishId" value={wish.id} />
            <SubmitButton className="btn btn-ghost !px-2 !py-1.5 text-sm">{t.list.card.removeImage}</SubmitButton>
          </form>
        )}
        <form action={removeWishAction}>
          <input type="hidden" name="wishId" value={wish.id} />
          <ConfirmButton className="btn btn-ghost !px-2 !py-1.5 text-sm" question={t.list.card.deleteQuestion(wish.title)}>
            {t.list.card.delete}
          </ConfirmButton>
        </form>
      </div>
    </details>
  );
}
