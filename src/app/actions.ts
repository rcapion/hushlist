"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isLocale } from "@/i18n";
import { getT } from "@/i18n/server";
import * as db from "@/lib/db";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/lib/password";
import { ipBlocked, recordFailure, recordIpFailure, recordSuccess, waitMs } from "@/lib/throttle";
import { deleteImage } from "@/lib/product";
import {
  currentGuest,
  logIn,
  clientIp,
  logOut,
  rememberFamily,
  requireAdult,
  requireMember,
  requireFamilyToken,
  sessionToken,
  setGuestName,
} from "@/lib/session";
import { canManage, canReserve, memberViewer, ownerGuestId } from "@/lib/visibility";
import { MAX_IMPORT_LINES, createWishFromInput, findUrl, parseImportLines } from "@/lib/wishes";

/** `open`: a wish just added that wants its details filled in — the list folds its Ret open. */
export type FormState =
  | { error?: string; ok?: string; key?: string; open?: number; undo?: { personId: number; wishIds: number[] } }
  | undefined;

function text(form: FormData, key: string, max = 500): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function id(form: FormData, key: string): number {
  const n = Number(form.get(key));
  if (!Number.isInteger(n) || n <= 0) throw new Error(`bad ${key}`);
  return n;
}

// ── first run ───────────────────────────────────────────────────────────────

export async function setupHousehold(_: FormState, form: FormData): Promise<FormState> {
  if (db.listPeople().length > 0) redirect("/");
  const adults = [text(form, "adult1", 60), text(form, "adult2", 60)].filter(Boolean);
  const children = text(form, "children", 500)
    .split(/[\n,]/)
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean);
  if (adults.length === 0) return { error: getT().server.actions.needAdult };
  for (const name of adults) db.addPerson(name, true);
  for (const name of children) db.addPerson(name, false);
  redirect("/");
}

// ── adults ──────────────────────────────────────────────────────────────────

// Verified against when the name matches nobody, so a wrong name costs the same
// scrypt as a wrong code and the answer time does not tell which it was.
const DUMMY_HASH = hashPassword("ingen-har-denne-kode");

/**
 * Name and code, typed. The page lists nobody (2026-11-16, before going
 * public): who lives here is not for the internet, and every failure gives the
 * same answer — unknown name, no code yet, or wrong code.
 */
export async function login(_: FormState, form: FormData): Promise<FormState> {
  const t = getT().server.actions;
  const password = String(form.get("password") ?? "");

  // The household's very first code, chosen while nobody has one: the only time
  // the page shows the adults to pick from (see page.tsx).
  if (!db.anyAdultHasPassword()) {
    const person = db.getPerson(id(form, "personId"));
    if (!person?.isAdult) return { error: t.pickPerson };
    const problem = checkNewPassword(password, String(form.get("confirm") ?? ""));
    if (problem) return { error: problem };
    if (!db.claimFirstPassword(person.id, hashPassword(password))) {
      return { error: t.codeAlreadyChosen };
    }
    await logIn(person.id);
    redirect(`/liste/${person.id}`);
  }

  // Every failure below looks and takes the same — unknown name, an account in
  // backoff, a wrong code — or the timing tells a stranger which names exist
  // (Fable review, 2026-11-16, measured: 7 ms vs 42 ms). Only an address over
  // its limit is answered at once, and that tells it nothing it did not do.
  const ip = await clientIp();
  if (ipBlocked(ip)) {
    console.warn(`[login] refused: address over its limit (${ip})`);
    // Says only what this connection did itself, nothing about any name — and
    // tells a family behind one address why the right code is not taken.
    return { error: t.ipBlocked };
  }
  const person = db.memberByName(text(form, "username", 60));
  const stored = person ? db.passwordHash(person.id) : null;
  const checkable = person && stored && waitMs(person.id) === 0;
  if (!checkable || !verifyPassword(password, checkable ? stored : DUMMY_HASH)) {
    if (!checkable) verifyPassword(password, DUMMY_HASH);
    if (person) recordFailure(person.id);
    recordIpFailure(ip);
    console.warn(`[login] failed: ${person ? `account ${person.id}` : "unknown name"} from ${ip}`);
    return { error: t.wrongLogin };
  }
  recordSuccess(person.id);
  await logIn(person.id);
  redirect(`/liste/${person.id}`);
}

function checkNewPassword(password: string, confirm: string): string | null {
  const t = getT().server.actions;
  if (password.length < MIN_PASSWORD_LENGTH) return t.codeTooShort(MIN_PASSWORD_LENGTH);
  if (password !== confirm) return t.codesDiffer;
  return null;
}

/** An adult without a code, invited by one with: the link is shown once. */
export async function createInviteAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdult();
  const token = db.createInvite(id(form, "personId"));
  if (!token) return { error: getT().server.actions.alreadyHasCode };
  return { key: token };
}

export async function acceptInviteAction(_: FormState, form: FormData): Promise<FormState> {
  const t = getT().server.actions;
  const token = text(form, "token", 100);
  // The token before the scrypt: a junk token must cost nothing (Fable review).
  if (!db.personByInvite(token)) return { error: t.inviteInvalid };
  const problem = checkNewPassword(String(form.get("password") ?? ""), String(form.get("confirm") ?? ""));
  if (problem) return { error: problem };
  const person = db.claimByInvite(token, hashPassword(String(form.get("password"))));
  if (!person) return { error: t.inviteInvalid };
  await logIn(person.id);
  redirect(`/liste/${person.id}`);
}

export async function logout(): Promise<void> {
  await logOut();
  // To the login, not "/": a browser that has also used the family link would
  // otherwise land a household member on the guest view.
  redirect("/?login");
}

async function managedList(form: FormData) {
  const member = await requireMember();
  const owner = db.getPerson(id(form, "personId"));
  if (!owner || !canManage(member, owner)) throw new Error("not yours to edit");
  return { adult: member, owner };
}

async function managedWish(form: FormData) {
  const adult = await requireMember();
  const wishId = id(form, "wishId");
  const ownerId = db.wishOwner(wishId);
  const owner = ownerId ? db.getPerson(ownerId) : null;
  if (!owner || !canManage(adult, owner)) throw new Error("not yours to edit");
  return { adult, owner, wishId };
}

export async function addWishAction(state: FormState, form: FormData): Promise<FormState> {
  const { owner } = await managedList(form);
  // Several lines pasted into the one box are several wishes, not one wish
  // with the rest as its note (Richard's first wishthis paste, 2026-11-16).
  if (parseImportLines(String(form.get("input") ?? "")).length > 1) {
    const many = new FormData();
    many.set("personId", String(owner.id));
    many.set("lines", String(form.get("input")));
    return importWishesAction(state, many);
  }
  const t = getT().server.actions;
  const input = text(form, "input", 2000);
  if (!input) return { error: t.emptyWish };
  const { id: wishId, fetched } = await createWishFromInput(owner.id, input);
  revalidatePath(`/liste/${owner.id}`);
  // A typed wish has no shop to ask, and a refused link has nothing but its
  // address: both open for price, note and picture. A fetched one is done.
  // Every new wish opens for editing, link or not (Richard, 2026-11-16).
  if (!fetched) return { ok: t.shopRefused, open: wishId };
  return { ok: t.added, open: wishId };
}

/**
 * From the bookmark on a computer: the shop page's link and its head, read in
 * the browser that could see it (docs/DESIGN.md). Always a click on our
 * own page first, so a stranger's page cannot add wishes by opening /tilfoej.
 */
export async function addFromPageAction(form: FormData): Promise<void> {
  const { owner } = await managedList(form);
  const found = findUrl(text(form, "url", 2000));
  if (!found) redirect(`/liste/${owner.id}`);
  const html = String(form.get("html") ?? "").slice(0, 200_000);
  await createWishFromInput(owner.id, found.url, html.trim() ? html : undefined);
  revalidatePath(`/liste/${owner.id}`);
  redirect(`/liste/${owner.id}`);
}

/** Many at once: a pasted list, one wish per line, fetched one after another. */
export async function importWishesAction(_: FormState, form: FormData): Promise<FormState> {
  const { owner } = await managedList(form);
  const t = getT().server.actions;
  const lines = parseImportLines(String(form.get("lines") ?? "").slice(0, 60_000));
  if (lines.length === 0) return { error: t.noLines };
  if (lines.length > MAX_IMPORT_LINES) {
    return { error: t.tooManyLines(MAX_IMPORT_LINES, lines.length) };
  }
  let unfetched = 0;
  const wishIds: number[] = [];
  for (const line of lines) {
    const { id: wishId, fetched } = await createWishFromInput(owner.id, line.slice(0, 2000));
    wishIds.push(wishId);
    if (!fetched) unfetched++;
  }
  revalidatePath(`/liste/${owner.id}`);
  // The list is named, and the import can be taken back: a wrong pick in the
  // list chooser put a whole list on the wrong child (Richard, 2026-11-16).
  return {
    ok:
      t.imported(lines.length, owner.name) + (unfetched ? ` ${t.importUnfetched(unfetched)}` : ""),
    undo: { personId: owner.id, wishIds },
  };
}

/** "Fortryd" under an import: exactly the wishes it made, and only on that list. */
export async function undoImportAction(personId: number, wishIds: number[]): Promise<void> {
  const form = new FormData();
  form.set("personId", String(personId));
  const { owner } = await managedList(form);
  const ids = wishIds.filter((n) => Number.isInteger(n) && n > 0);
  for (const image of db.removeWishes(owner.id, ids)) deleteImage(image, db.DATA_DIR);
  revalidatePath(`/liste/${owner.id}`);
}

/** Called by EditWishForm on every field it leaves; the answer is what it shows. */
export async function updateWishAction(form: FormData): Promise<{ error?: string } | undefined> {
  const { owner, wishId } = await managedWish(form);
  const t = getT().server.actions;
  const title = text(form, "title", 200);
  if (!title) return { error: t.needTitle };
  // A web address has no spaces; the field wraps, so a paste may bring a line break.
  let url = text(form, "url", 2000).replace(/\s+/g, "");
  // "br.dk/lego" means https://br.dk/lego; anything that is not a web address is refused, not dropped.
  if (url && !/^https?:\/\//i.test(url)) {
    if (!/^[\w.-]+\.[a-z]{2,}([/?#]|$)/i.test(url)) return { error: t.badUrl };
    url = `https://${url}`;
  }
  db.updateWish(wishId, {
    title,
    url: url || null,
    price: text(form, "price", 40) || null,
    note: text(form, "note", 500) || null,
  });
  revalidatePath(`/liste/${owner.id}`);
}

export async function removeImageAction(form: FormData): Promise<void> {
  const { owner, wishId } = await managedWish(form);
  deleteImage(db.setWishImage(wishId, null), db.DATA_DIR);
  revalidatePath(`/liste/${owner.id}`);
}

export async function toggleFavouriteAction(form: FormData): Promise<void> {
  const { owner, wishId } = await managedWish(form);
  db.toggleFavourite(wishId);
  revalidatePath(`/liste/${owner.id}`);
}

/** Skjul: off everyone else's list, not received and not deleted. */
export async function toggleHiddenAction(form: FormData): Promise<void> {
  const { owner, wishId } = await managedWish(form);
  db.toggleHidden(wishId);
  revalidatePath(`/liste/${owner.id}`);
}

/**
 * "Fik det": off the list, into the history. Called by FikDetButton after its
 * grace period — the press itself only starts a countdown that can be undone.
 * Adults only: a child marking a wish early would learn who reserved it once
 * the history shows givers (received.ts).
 */
export async function markReceivedAction(form: FormData): Promise<void> {
  const { adult, owner, wishId } = await managedWish(form);
  if (!adult.isAdult) return;
  db.markReceived(wishId);
  revalidatePath(`/liste/${owner.id}`);
  revalidatePath(`/liste/${owner.id}/opfyldt`);
}

/** "Læg tilbage på listen": a mistaken "Fik det" is never final. */
export async function unmarkReceivedAction(form: FormData): Promise<void> {
  const { owner, wishId } = await managedWish(form);
  db.unmarkReceived(wishId);
  revalidatePath(`/liste/${owner.id}`);
  revalidatePath(`/liste/${owner.id}/opfyldt`);
}

/** Birthdays, "MM-DD", for grouping the history. Adults set them for everyone. */
/** Størrelser: whoever manages the list — oneself, a parent for a child. */
export async function setSizesAction(form: FormData): Promise<void> {
  const { owner } = await managedList(form);
  db.setSizes(owner.id, text(form, "sizes", 120).replace(/\s+/g, " "));
  revalidatePath(`/liste/${owner.id}`);
}

export async function setBirthdayAction(form: FormData): Promise<void> {
  await requireAdult();
  const person = db.getPerson(id(form, "personId"));
  if (!person) return;
  const day = Number(form.get("day"));
  const month = Number(form.get("month"));
  // A real date (29 February allowed): not 31 April, which Date would roll into May.
  const valid =
    Number.isInteger(day) && Number.isInteger(month) && month >= 1 && month <= 12 && day >= 1 &&
    new Date(Date.UTC(2000, month - 1, day)).getUTCDate() === day;
  db.setBirthday(person.id, valid ? `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null);
  revalidatePath("/indstillinger");
}

/** "Slet": gone for good, picture included. */
export async function removeWishAction(form: FormData): Promise<void> {
  const { owner, wishId } = await managedWish(form);
  deleteImage(db.removeWish(wishId), db.DATA_DIR);
  revalidatePath(`/liste/${owner.id}`);
}

/** "Vælg" on a list: the ticked wishes go, then back to the list as usual. */
export async function removeWishesAction(form: FormData): Promise<void> {
  const { owner } = await managedList(form);
  const ids = form.getAll("wishId").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  for (const image of db.removeWishes(owner.id, ids)) deleteImage(image, db.DATA_DIR);
  revalidatePath(`/liste/${owner.id}`);
  redirect(`/liste/${owner.id}`);
}

/**
 * A logged-in member buying for someone else. Never on their own list. A child
 * cannot see others' reservations, so a taken wish looks free to them; the
 * refusal is said out loud rather than leaving a button that does nothing.
 */
export async function ownerReserveAction(form: FormData): Promise<void> {
  const member = await requireMember();
  const wishId = id(form, "wishId");
  const ownerId = db.wishOwner(wishId);
  if (!ownerId || !canReserve(memberViewer(member), ownerId)) return;
  if (form.get("release")) db.release(wishId, ownerGuestId(member.id));
  else if (!db.reserve(wishId, member.name, ownerGuestId(member.id))) redirect(`/liste/${ownerId}?optaget=${wishId}`);
  revalidatePath(`/liste/${ownerId}`);
}

/** A parent undoing a reservation on a child's list — a griefing guest, a mistake. */
export async function clearReservationAction(form: FormData): Promise<void> {
  const { adult, owner, wishId } = await managedWish(form);
  // Never on one's own list: clearing blind would still tell you something was there.
  if (owner.id === adult.id) return;
  db.clearReservation(wishId);
  revalidatePath(`/liste/${owner.id}`);
}

// ── settings ────────────────────────────────────────────────────────────────

export async function rotateFamilyLinkAction(): Promise<void> {
  await requireAdult();
  db.rotateFamilyToken();
  revalidatePath("/indstillinger");
}

/** The household's language (Indstillinger). Every page follows at once. */
export async function setLanguageAction(form: FormData): Promise<void> {
  await requireAdult();
  const code = form.get("language");
  if (!isLocale(code)) return;
  db.setHouseholdLanguage(code);
  revalidatePath("/", "layout");
}

export async function addChildAction(form: FormData): Promise<void> {
  await requireAdult();
  const name = text(form, "name", 60);
  if (name) db.addPerson(name, false);
  revalidatePath("/", "layout");
}

export async function renamePersonAction(form: FormData): Promise<void> {
  const adult = await requireAdult();
  const person = db.getPerson(id(form, "personId"));
  const name = text(form, "name", 60);
  if (!person || !name || !canManage(adult, person)) return;
  db.renamePerson(person.id, name);
  revalidatePath("/", "layout");
}

export async function removeChildAction(form: FormData): Promise<void> {
  await requireAdult();
  const person = db.getPerson(id(form, "personId"));
  if (!person || person.isAdult) return;
  for (const name of db.imagePathsOf(person.id)) deleteImage(name, db.DATA_DIR);
  db.removeChild(person.id);
  revalidatePath("/", "layout");
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const adult = await requireMember();
  const t = getT().server.actions;
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const stored = db.passwordHash(adult.id);
  if (waitMs(adult.id) > 0) return { error: t.tooManyAttempts };
  if (!stored || !verifyPassword(current, stored)) {
    recordFailure(adult.id);
    return { error: t.currentWrong };
  }
  if (next.length < MIN_PASSWORD_LENGTH) return { error: t.minLength(MIN_PASSWORD_LENGTH) };
  db.setPasswordHash(adult.id, hashPassword(next));
  db.deleteSessionsFor(adult.id, await sessionToken());
  return { ok: t.passwordChanged };
}

/** The key is shown once, in the response, and only its hash is kept. */
export async function createApiKeyAction(_: FormState): Promise<FormState> {
  const adult = await requireAdult();
  const key = `ol_${crypto.randomBytes(24).toString("base64url")}`;
  db.setApiKeyHash(adult.id, db.sha256(key));
  revalidatePath("/indstillinger");
  return { key };
}

/** A child who forgot their code. Then: a new invitation. */
export async function resetChildPasswordAction(form: FormData): Promise<void> {
  await requireAdult();
  db.resetChildPassword(id(form, "personId"));
  revalidatePath("/indstillinger");
}

export async function revokeApiKeyAction(): Promise<void> {
  const adult = await requireAdult();
  db.setApiKeyHash(adult.id, null);
  revalidatePath("/indstillinger");
}

// ── guests ──────────────────────────────────────────────────────────────────

export async function guestNameAction(form: FormData): Promise<void> {
  const token = text(form, "token", 100);
  requireFamilyToken(token);
  const name = text(form, "name", 40);
  const guestId = name ? await setGuestName(name) : null;
  await rememberFamily(token);
  // Asked for a name on the way to Reservér: reserve it now, so it is one press,
  // not two (Richard). reserve() is first-come; if someone was quicker, the list
  // simply shows it taken.
  // The list then says plainly that it worked, or that someone was quicker:
  // a quiet ✓ on the card was overlooked (Richard, 2026-11-16).
  const w = Number(text(form, "w", 12));
  let outcome = "";
  if (guestId && Number.isInteger(w) && w > 0) {
    outcome = db.reserve(w, name, guestId) ? `&reserveret=${w}` : `&optaget=${w}`;
  }
  // Back to the person they were looking at, if any.
  const p = text(form, "p", 12);
  redirect(`/f/${token}?${/^\d+$/.test(p) ? `p=${p}` : ""}${outcome}`);
}

export async function guestReserveAction(form: FormData): Promise<void> {
  const token = text(form, "token", 100);
  requireFamilyToken(token);
  const guest = await currentGuest();
  const wishId = id(form, "wishId");
  if (!guest.id || !guest.name) {
    // Looked without a name and now wants to reserve: ask for it, gently, and
    // come back to the same list afterwards.
    const owner = db.wishOwner(wishId);
    redirect(`/f/${token}?reserver=${wishId}${owner ? `&p=${owner}` : ""}`);
  }
  await rememberFamily(token);
  if (form.get("release")) db.release(wishId, guest.id);
  else db.reserve(wishId, guest.name, guest.id);
  revalidatePath(`/f/${token}`);
}
