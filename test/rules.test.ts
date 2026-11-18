import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../src/lib/password";
import { da } from "../src/i18n/da";
import { en } from "../src/i18n/en";
import { canManage, canSeeReservations, addableLists } from "../src/lib/visibility";

const richard = { id: 1, isAdult: true, hasPassword: true };
const anna = { id: 2, isAdult: true, hasPassword: true };
const child = { id: 3, isAdult: false, hasPassword: false };

test("an adult manages their own list and the children's, never the spouse's", () => {
  assert.ok(canManage(richard, richard));
  assert.ok(canManage(richard, child));
  assert.ok(!canManage(richard, anna));
});

test("the spouse's list can be made ready until she first logs in, and no longer", () => {
  assert.ok(canManage(richard, { ...anna, hasPassword: false }));
  assert.ok(!canManage(richard, anna));
  // A child cannot, whatever the list's state.
  assert.ok(!canManage(child, { ...anna, hasPassword: false }));
});

test("a child with a login manages their own list and nobody else's", () => {
  const sibling = { id: 4, isAdult: false, hasPassword: false };
  assert.ok(canManage(child, child));
  assert.ok(!canManage(child, sibling));
  assert.ok(!canManage(child, richard));
  // ...and is blind on their own list, like everyone, while buying for the others.
  assert.ok(!canSeeReservations({ kind: "owner", personId: child.id }, child.id));
  assert.ok(canSeeReservations({ kind: "owner", personId: child.id }, sibling.id));
});

test("reservations: blind on one's own list only", () => {
  assert.ok(!canSeeReservations({ kind: "owner", personId: 1 }, 1));
  assert.ok(canSeeReservations({ kind: "owner", personId: 1 }, 2));
  assert.ok(canSeeReservations({ kind: "owner", personId: 1 }, 3));
  assert.ok(canSeeReservations({ kind: "guest", name: "Mormor" }, 1));
});

test("passwords", () => {
  const stored = hashPassword("hemmelig-kode");
  assert.ok(verifyPassword("hemmelig-kode", stored));
  assert.ok(!verifyPassword("Hemmelig-kode", stored));
  assert.ok(!verifyPassword("x", "garbage"));
  assert.notEqual(hashPassword("a"), hashPassword("a"), "salted");
});

test("genitive and lists of names, in Danish and English", () => {
  assert.equal(da.fmt.genitive("Anna"), "Annas");
  assert.equal(da.fmt.genitive("Klaus"), "Klaus'");
  assert.equal(en.fmt.genitive("Anna"), "Anna's");
  assert.equal(en.fmt.genitive("James"), "James'");
  assert.equal(da.fmt.list(["Anna", "Mads", "Ida"]), "Anna, Mads og Ida");
  assert.equal(en.fmt.list(["Anna", "Mads", "Ida"]), "Anna, Mads and Ida");
});

test("every language has exactly the keys of Danish", async () => {
  const { LOCALES } = await import("../src/i18n");
  const shape = (o: object, at = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? shape(v, `${at}${k}.`) : [`${at}${k}:${typeof v}`])).sort();
  for (const [code, messages] of Object.entries(LOCALES)) assert.deepEqual(shape(messages), shape(da), code);
});

test("a guest cookie cannot claim to be an owner", async () => {
  const { isGuestId, ownerGuestId } = await import("../src/lib/visibility");
  assert.ok(isGuestId("g_" + "a".repeat(22)));
  assert.ok(!isGuestId(ownerGuestId(2)));
  assert.ok(!isGuestId("g_short"));
  assert.ok(!isGuestId("x" + "a".repeat(23)));
});

test("backoff slows guessing but never locks the owner out", async () => {
  const { recordFailure, recordSuccess, waitMs } = await import("../src/lib/throttle");
  const t = 1_000_000;
  for (let i = 0; i < 10; i++) recordFailure(99, t);
  assert.equal(waitMs(99, t + 2000), 0, "one probe gets through");
  assert.ok(waitMs(99, t + 2500) > 0, "but not a second one straight after");
  assert.equal(waitMs(99, t + 4100), 0, "and the next comes two seconds later");
  recordSuccess(99);
  assert.equal(waitMs(99, t + 4200), 0);
});

test("an address is cut off after 50 failures in ten minutes, and let in again after", async () => {
  const { ipBlocked, recordIpFailure } = await import("../src/lib/throttle");
  const t = 5_000_000;
  for (let i = 0; i < 49; i++) recordIpFailure("203.0.113.9", t);
  assert.equal(ipBlocked("203.0.113.9", t), false);
  recordIpFailure("203.0.113.9", t);
  assert.equal(ipBlocked("203.0.113.9", t + 1000), true);
  assert.equal(ipBlocked("198.51.100.1", t + 1000), false, "other addresses unaffected");
  assert.equal(ipBlocked("203.0.113.9", t + 10 * 60_000 + 1), false);
});

test("the Shortcut and the bookmark offer one's own list first, then only the lists one manages", () => {
  const people = [
    { ...child, name: "Barn A" },
    { ...anna, name: "Anna" },
    { ...richard, name: "Richard" },
  ];
  assert.deepEqual(addableLists(richard, people).map((p) => p.name), ["Richard", "Barn A"]);
  assert.deepEqual(addableLists(child, people).map((p) => p.name), ["Barn A"]);
});
