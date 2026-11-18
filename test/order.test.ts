import assert from "node:assert/strict";
import test from "node:test";

import { buyerOrder } from "../src/lib/order";
import type { ReservationView, WishView } from "../src/lib/visibility";

const taken = { id: 1, guestName: "Mormor", guestId: "g_x", createdAt: "" };
const wish = (id: number, reservation: ReservationView, hidden = false): WishView => ({
  id, personId: 1, title: `w${id}`, url: null, price: null, imagePath: null, favourite: false, note: null, hidden, reservation,
});

test("mine first, then free, then others', each in the order given", () => {
  const list = [
    wish(1, { visible: true, reservation: taken, mine: false }),
    wish(2, { visible: true, reservation: null, mine: false }),
    wish(3, { visible: true, reservation: taken, mine: true }),
    wish(4, { visible: true, reservation: null, mine: false }),
  ];
  assert.deepEqual(buyerOrder(list).map((w) => w.id), [3, 2, 4, 1]);
});

test("one's own list keeps its order: hidden reservations cannot move a wish", () => {
  const list = [1, 2, 3].map((id) => wish(id, { visible: false }));
  assert.deepEqual(buyerOrder(list).map((w) => w.id), [1, 2, 3]);
});

test("hidden wishes go last", () => {
  const list = [wish(1, { visible: false }, true), wish(2, { visible: false }), wish(3, { visible: false })];
  assert.deepEqual(buyerOrder(list).map((w) => w.id), [2, 3, 1]);
});
