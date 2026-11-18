import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * THE ONE RULE, end to end through the database: nobody sees the reservations
 * on their own list — not as a flag, not as a name, not as an empty object that
 * happens to be falsy. If this test fails, the app spoils Christmas.
 */

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onske-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
process.env.HUSHLIST_DB_PATH = path.join(dir, "test.db");

type Db = typeof import("../src/lib/db");
let db: Db;
let richard: { id: number };
let anna: { id: number };
let barnA: { id: number };
let richardsWish: number;
let barnAsWish: number;

test.before(async () => {
  db = await import("../src/lib/db");
  richard = db.addPerson("Richard", true);
  anna = db.addPerson("Anna", true);
  barnA = db.addPerson("Barn A", false);
  richardsWish = db.addWish(richard.id, { title: "Kaffekværn" });
  barnAsWish = db.addWish(barnA.id, { title: "Lego" });
  db.reserve(richardsWish, "Anna", "cookie-anna");
  db.reserve(barnAsWish, "Mormor", "cookie-mormor");
});

const asOwner = (p: { id: number }) => ({ kind: "owner" as const, personId: p.id });
const guest = { kind: "guest" as const, name: "Mormor" };

test("an owner sees nothing on their own list", () => {
  const [wish] = db.listForViewer(asOwner(richard), richard.id);
  assert.deepEqual(wish.reservation, { visible: false });
  // Nothing about the reservation may survive in the serialised response.
  assert.doesNotMatch(JSON.stringify(wish), /Anna|cookie/);
});

test("the spouse sees the reservation on the other adult's list", () => {
  const [wish] = db.listForViewer(asOwner(anna), richard.id);
  assert.equal(wish.reservation.visible, true);
  assert.equal(wish.reservation.visible && wish.reservation.reservation?.guestName, "Anna");
});

test("parents see reservations on a child's list", () => {
  for (const parent of [richard, anna]) {
    const [wish] = db.listForViewer(asOwner(parent), barnA.id);
    assert.equal(wish.reservation.visible && wish.reservation.reservation?.guestName, "Mormor");
  }
});

test("a guest sees reservations, and knows which are theirs", () => {
  const [wish] = db.listForViewer(guest, barnA.id, "cookie-mormor");
  assert.equal(wish.reservation.visible && wish.reservation.mine, true);
  const [other] = db.listForViewer(guest, richard.id, "cookie-mormor");
  assert.equal(other.reservation.visible && other.reservation.mine, false);
});

test("a wish can be reserved once, and released only by whoever reserved it", () => {
  assert.equal(db.reserve(barnAsWish, "Farmor", "cookie-farmor"), false);
  assert.equal(db.release(barnAsWish, "cookie-farmor"), false);
  assert.equal(db.release(barnAsWish, "cookie-mormor"), true);
  assert.equal(db.reserve(barnAsWish, "Farmor", "cookie-farmor"), true);
});

test("'fik det' takes the wish off the list", () => {
  db.markReceived(richardsWish);
  assert.equal(db.listForViewer(asOwner(anna), richard.id).length, 0);
});

test("the family token exists and is long", () => {
  assert.ok(db.familyToken().length >= 32);
});

test("only the household's first password is free; the rest come by invitation (Fable review)", async () => {
  const { hashPassword } = await import("../src/lib/password");
  assert.equal(db.anyAdultHasPassword(), false);
  assert.equal(db.claimFirstPassword(richard.id, hashPassword("richard-kode")), true);
  // Anna's account can no longer be claimed by whoever reaches the login page.
  assert.equal(db.claimFirstPassword(anna.id, hashPassword("angriber")), false);
  assert.equal(db.passwordHash(anna.id), null);

  const invite = db.createInvite(anna.id)!;
  assert.ok(invite);
  assert.equal(db.claimByInvite("wrong-token", hashPassword("x")), null);
  assert.equal(db.claimByInvite(invite, hashPassword("anna-kode"))?.id, anna.id);
  assert.equal(db.claimByInvite(invite, hashPassword("igen")), null, "an invitation works once");
  assert.equal(db.createInvite(anna.id), null, "no invitation for someone with a code");
});

test("sessions log in, and stop when deleted", () => {
  const token = db.createSession(richard.id);
  assert.equal(db.personBySession(token)?.id, richard.id);
  assert.equal(db.personBySession("forged"), null);
  db.deleteSession(token);
  assert.equal(db.personBySession(token), null);
});

test("a link the shop will not show us keeps our title and note", async () => {
  const { createWishFromInput } = await import("../src/lib/wishes");
  // A blocked address fails the fetch at once, without the network.
  const { id, fetched } = await createWishFromInput(anna.id, "http://127.0.0.1/hjul Hjulkapsel sæt — Center kapsel og møtrikker");
  assert.equal(fetched, false);
  const wish = db.listForViewer(asOwner(richard), anna.id).find((w) => w.id === id)!;
  assert.equal(wish.title, "Hjulkapsel sæt");
  assert.equal(wish.note, "Center kapsel og møtrikker");
  const plain = await createWishFromInput(anna.id, "Borehammer — med ledning");
  const w2 = db.listForViewer(asOwner(richard), anna.id).find((w) => w.id === plain.id)!;
  assert.deepEqual([w2.title, w2.note], ["Borehammer", "med ledning"]);
});

test("a child is invited like an adult, and a parent can reset a forgotten code", async () => {
  const { hashPassword } = await import("../src/lib/password");
  const invite = db.createInvite(barnA.id)!;
  assert.ok(invite, "children can be invited since 2026-11-16");
  assert.equal(db.claimByInvite(invite, hashPassword("barn-kode"))?.id, barnA.id);
  const token = db.createSession(barnA.id);
  assert.equal(db.personBySession(token)?.id, barnA.id);
  // Barn A's own list is blind to Barn A, but still open to the parents.
  const own = db.listForViewer(asOwner(barnA), barnA.id);
  assert.ok(own.every((w) => !w.reservation.visible));
  assert.ok(db.listForViewer(asOwner(richard), barnA.id).some((w) => w.reservation.visible));

  assert.equal(db.resetChildPassword(barnA.id), true);
  assert.equal(db.personBySession(token), null, "a reset ends the child's sessions");
  assert.equal(db.resetChildPassword(richard.id), false, "an adult's code is never reset this way");
});

test("a picture set on a wish deleted meanwhile is handed back as the orphan (Fable review)", () => {
  const wishId = db.addWish(anna.id, { title: "Midlertidig", imagePath: "aaaaaaaaaaaaaaaaaaaaaaaa.jpg" });
  assert.equal(db.setWishImage(wishId, "bbbbbbbbbbbbbbbbbbbbbbbb.jpg"), "aaaaaaaaaaaaaaaaaaaaaaaa.jpg");
  db.removeWish(wishId);
  assert.equal(db.setWishImage(wishId, "cccccccccccccccccccccccc.jpg"), "cccccccccccccccccccccccc.jpg");
});

test("login looks people up by name, any case, and only those with a code", () => {
  assert.equal(db.memberByName("  richard ")?.id, richard.id);
  assert.equal(db.memberByName("RICHARD")?.id, richard.id);
  db.renamePerson(richard.id, "Ægir");
  assert.equal(db.memberByName("ÆGIR")?.id, richard.id, "Danish letters fold too");
  db.renamePerson(richard.id, "Richard");
  assert.equal(db.memberByName("Ingen"), null);
  const noCode = db.addPerson("Uden Kode", false);
  assert.equal(db.memberByName("Uden Kode"), null, "a person without a code cannot be logged into");
  db.removeChild(noCode.id);
});

test("'Fik det' moves a wish to the history, keeps its giver, and can be undone", () => {
  const wishId = db.addWish(anna.id, { title: "Tørklæde" });
  db.reserve(wishId, "Farmor", "g_" + "f".repeat(22));
  assert.equal(db.markReceived(wishId), true);
  assert.equal(db.markReceived(wishId), false, "twice is once");
  assert.ok(!db.listForViewer(asOwner(richard), anna.id).some((w) => w.id === wishId), "off the list");
  const row = db.receivedRows(anna.id).find((r) => r.id === wishId);
  assert.equal(row?.giverName, "Farmor");
  assert.equal(db.unmarkReceived(wishId), true);
  assert.ok(db.listForViewer(asOwner(richard), anna.id).some((w) => w.id === wishId), "back on the list");
  assert.ok(!db.receivedRows(anna.id).some((r) => r.id === wishId));
});

test("a received wish cannot be reserved, and a bogus one is simply refused (Fable review)", () => {
  const wishId = db.addWish(anna.id, { title: "Handsker" });
  db.markReceived(wishId);
  assert.equal(db.reserve(wishId, "Sen", "g_" + "s".repeat(22)), false);
  assert.equal(db.reserve(999999, "Ingen", "g_" + "n".repeat(22)), false);
});

test("a child sees their own reservations on the others' lists, and no one else's", () => {
  const child = db.addPerson("Barn B", false);
  const asChild = { kind: "child" as const, personId: child.id };
  const taken = db.addWish(anna.id, { title: "Tørklæde" });
  const free = db.addWish(anna.id, { title: "Bog" });
  db.reserve(taken, "Richard", "owner:" + richard.id);
  db.reserve(free, "Barn B", "owner:" + child.id);
  const list = db.listForViewer(asChild, anna.id, "owner:" + child.id);
  const byTitle = (t: string) => list.find((w) => w.title === t)!;
  // Taken by someone else: looks exactly like a free wish, and no name in the payload.
  assert.deepEqual(byTitle("Tørklæde").reservation, { visible: true, reservation: null, mine: false });
  assert.doesNotMatch(JSON.stringify(list), /Richard|owner:1\b/);
  // Their own: shown, so they can find it and undo it.
  const mine = byTitle("Bog").reservation;
  assert.equal(mine.visible && mine.mine, true);
  // And their own list stays blind.
  db.addWish(child.id, { title: "Cykel" });
  assert.deepEqual(db.listForViewer(asChild, child.id)[0].reservation, { visible: false });
});
