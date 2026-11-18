/**
 * THE ONE RULE: nobody sees the reservations on their own list.
 *
 * Everything that renders a wish — the screen, the print view, the API — goes
 * through this module. It strips the reservation on the server, so there is
 * nothing in the response for a curious owner to find in the page source.
 *
 * Guests are anonymous: the family link carries no identity. An owner who opens
 * the family link therefore sees their own reservations. That is accepted as an
 * honour system (docs/DESIGN.md), not an oversight.
 *
 * A child with a login buys like a guest but sees only their OWN reservations
 * on the others' lists (Richard, 2026-11-16): what the rest of us have taken
 * is not for a child who might tell. A taken wish looks free to them, and
 * trying to reserve it is the one way they learn it was taken.
 */

export type Viewer =
  | { kind: "guest"; name: string | null }
  | { kind: "owner"; personId: number }
  | { kind: "child"; personId: number };

/** A logged-in member as a viewer: adults are owners, a child is a child. */
export function memberViewer(person: { id: number; isAdult: boolean }): Viewer {
  return person.isAdult ? { kind: "owner", personId: person.id } : { kind: "child", personId: person.id };
}

export type Reservation = {
  id: number;
  guestName: string;
  guestId: string;
  createdAt: string;
};

export type Wish = {
  id: number;
  personId: number;
  title: string;
  url: string | null;
  price: string | null;
  imagePath: string | null;
  favourite: boolean;
  note: string | null;
  /** Off the list for everyone but those who manage it (listForViewer). */
  hidden: boolean;
  /** From the nightly link check; shown only to those who manage the list. */
  linkProblem?: "gone" | "soldout" | null;
};

/** What a viewer is allowed to know about a wish's reservation. */
export type ReservationView =
  | { visible: false }
  | { visible: true; reservation: Reservation | null; mine: boolean };

export type WishView = Wish & { reservation: ReservationView };

/** Sees who has reserved what — the names, not just one's own. */
export function canSeeReservations(viewer: Viewer, listOwnerId: number): boolean {
  if (viewer.kind === "guest") return true;
  if (viewer.kind === "child") return false;
  // Parents manage the children's lists and see everything on them; the spouse's
  // list is a guest list to the other adult. Only one's own list is blind.
  return viewer.personId !== listOwnerId;
}

/** May reserve on this list: anyone, on any list but their own. */
export function canReserve(viewer: Viewer, listOwnerId: number): boolean {
  return viewer.kind === "guest" || viewer.personId !== listOwnerId;
}

/**
 * Who may add, edit and remove wishes on a list: its owner, and either adult
 * for a child's list. The spouse's list is NOT managed — on it, the other adult
 * is a buyer. A child with a login (since 2026-11-16) manages only their own.
 *
 * Except until the spouse first logs in (Richard, 2026-11-16: the list
 * ready before its owner arrives). Before that they see nothing, so no
 * surprise is spoiled; once they set a code, they alone manage it.
 */
export function canManage(
  viewer: { id: number; isAdult: boolean },
  listOwner: { id: number; isAdult: boolean; hasPassword: boolean },
): boolean {
  if (listOwner.id === viewer.id) return true;
  // A child who logs in manages their own list and nothing else.
  if (!viewer.isAdult) return false;
  return !listOwner.isAdult || !listOwner.hasPassword;
}

/**
 * The lists one may add to from outside — the Shortcut and the bookmark:
 * one's own first, then the rest one manages, in the order given.
 */
export function addableLists<P extends { id: number; isAdult: boolean; hasPassword: boolean }>(
  viewer: { id: number; isAdult: boolean },
  people: P[],
): P[] {
  const own = people.filter((p) => p.id === viewer.id);
  const rest = people.filter((p) => p.id !== viewer.id && canManage(viewer, p));
  return [...own, ...rest];
}

/**
 * A guest id is ours only if it has our shape. The cookie is the guest's to
 * edit, and an unchecked one let a guest act as `owner:2` — releasing a
 * parent's reservation or making one in their name (Fable review). The `g_`
 * prefix means no forged value can ever collide with ownerGuestId().
 */
export function isGuestId(id: string): boolean {
  return /^g_[A-Za-z0-9_-]{22}$/.test(id);
}

/** How an adult reserves on a list they do not manage. */
export function ownerGuestId(personId: number): string {
  return `owner:${personId}`;
}

/**
 * `guestId` is the browser cookie that identifies the guest who made a
 * reservation, so they can release it again. Owners use ownerGuestId().
 */
export function viewWish(
  viewer: Viewer,
  wish: Wish,
  reservation: Reservation | null,
  guestId: string | null,
): WishView {
  if (!canReserve(viewer, wish.personId)) {
    return { ...wish, reservation: { visible: false } };
  }
  const mine = reservation !== null && guestId !== null && reservation.guestId === guestId;
  // A child sees their own reservation and nothing else: someone else's is null.
  const shown = canSeeReservations(viewer, wish.personId) || mine ? reservation : null;
  return { ...wish, reservation: { visible: true, reservation: shown, mine } };
}
