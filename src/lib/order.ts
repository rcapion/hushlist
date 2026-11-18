import type { WishView } from "@/lib/visibility";

/**
 * What the viewer reserved comes first — the thing they came back to check
 * (Richard, 2026-11-16: a guest overlooked that the reservation had worked) —
 * then what is still free, then what others took, and hidden wishes last.
 * Stable, so the biggest wishes and newest-first hold within each.
 *
 * Reads only what the visibility rule already let through: on one's own list
 * every reservation is `{ visible: false }`, so the order there moves only
 * hidden wishes and cannot hint at anything.
 */
export function buyerOrder(wishes: WishView[]): WishView[] {
  const rank = (w: WishView) => {
    if (w.hidden) return 3;
    const r = w.reservation;
    if (!r.visible || r.reservation === null) return 1;
    return r.mine ? 0 : 2;
  };
  return wishes.map((w, i) => ({ w, i })).sort((a, b) => rank(a.w) - rank(b.w) || a.i - b.i).map(({ w }) => w);
}
