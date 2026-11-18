import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { databasePath } from "@/lib/config";
import { LINK_STRIKES, type LinkVerdict } from "@/lib/link-verdict";
import {
  viewWish,
  type Reservation,
  type Viewer,
  type Wish,
  type WishView,
} from "@/lib/visibility";

export const DATA_DIR = path.dirname(databasePath());

/** The signed Apple Shortcut, if the host has made one (docs/SHORTCUT.md). */
export function signedShortcutPath(): string {
  return path.join(DATA_DIR, "hushlist.shortcut");
}

function dbPath(): string {
  return databasePath();
}

// Opened lazily, never at import time: `next build` imports every route in
// parallel workers, and a migration at module scope races for the write lock
// (SQLITE_BUSY). Learned in handleliste; see its src/lib/db.ts.
let handle: Database.Database | null = null;

function db(): Database.Database {
  if (handle) return handle;

  fs.mkdirSync(path.dirname(dbPath()), { recursive: true });
  handle = new Database(dbPath());
  handle.pragma("journal_mode = WAL");
  handle.pragma("busy_timeout = 5000");
  handle.pragma("foreign_keys = ON");
  migrate(handle);
  return handle;
}

export function initializeDatabase(): void {
  db();
}

/**
 * A whole, consistent copy at `backup/<the database's file name>`, for whatever backs up
 * the data directory (a live SQLite file and its WAL can be copied at two
 * different moments). VACUUM INTO a temporary name, then
 * a rename, so the backup never sees half a file. Restore: stop the app, put
 * this file in place of the database, delete -wal and -shm.
 */
export function backupDatabase(dir = path.join(DATA_DIR, "backup")): string {
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, path.basename(dbPath()));
  const tmp = `${dest}.tmp`;
  fs.rmSync(tmp, { force: true });
  db().prepare("VACUUM INTO ?").run(tmp);
  fs.renameSync(tmp, dest);
  return dest;
}

/** Checkpoints the WAL on shutdown, so the database file is whole on its own. */
export function closeDatabase(): void {
  handle?.close();
  handle = null;
}

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      is_adult INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      api_key_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS wishes (
      id INTEGER PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT,
      price TEXT,
      image_path TEXT,
      favourite INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- One wish, one reservation: no quantities in v1.
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY,
      wish_id INTEGER NOT NULL UNIQUE REFERENCES wishes(id) ON DELETE CASCADE,
      guest_name TEXT NOT NULL,
      guest_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Only the hash of a session token is stored: a copied database file
    -- logs nobody in.
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Columns added after the first release. SQLite has no ADD COLUMN IF NOT
  // EXISTS, so ask the table.
  const has = (table: string, column: string) =>
    (d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
  if (!has("people", "invite_hash")) d.exec("ALTER TABLE people ADD COLUMN invite_hash TEXT");
  if (!has("people", "invite_created_at")) d.exec("ALTER TABLE people ADD COLUMN invite_created_at TEXT");
  // "Fik det" keeps the wish (2026-11-16): received_at moves it to the history,
  // and it can be put back. birthday is "MM-DD" only, for grouping that history.
  if (!has("wishes", "received_at")) d.exec("ALTER TABLE wishes ADD COLUMN received_at TEXT");
  if (!has("people", "birthday")) d.exec("ALTER TABLE people ADD COLUMN birthday TEXT");
  // Skjul (Richard, 2026-11-16): off the list everyone else sees, without
  // being received or deleted. Only those who manage the list see it.
  if (!has("wishes", "hidden_at")) d.exec("ALTER TABLE wishes ADD COLUMN hidden_at TEXT");
  // Størrelser (Richard, 2026-11-17): one free-text line per person, and when it was set.
  if (!has("people", "sizes")) d.exec("ALTER TABLE people ADD COLUMN sizes TEXT");
  if (!has("people", "sizes_at")) d.exec("ALTER TABLE people ADD COLUMN sizes_at TEXT");
  // The nightly link check (Richard, 2026-11-17). link_problem is what the list
  // shows; link_seen/link_strikes count nights in a row with the same verdict.
  if (!has("wishes", "link_problem")) d.exec("ALTER TABLE wishes ADD COLUMN link_problem TEXT");
  if (!has("wishes", "link_seen")) d.exec("ALTER TABLE wishes ADD COLUMN link_seen TEXT");
  if (!has("wishes", "link_strikes")) d.exec("ALTER TABLE wishes ADD COLUMN link_strikes INTEGER NOT NULL DEFAULT 0");

  // The family link's secret. Rotating it is replacing this row.
  d.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('family_token', ?)").run(
    newToken(),
  );
}

export function newToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ── family link ─────────────────────────────────────────────────────────────

export function familyToken(): string {
  const row = db().prepare("SELECT value FROM settings WHERE key = 'family_token'").get() as
    | { value: string }
    | undefined;
  if (!row) throw new Error("family_token missing: database not migrated");
  return row.value;
}

/** Constant-time, so the token cannot be guessed a character at a time. */
export function isFamilyToken(candidate: string): boolean {
  const a = Buffer.from(sha256(candidate));
  const b = Buffer.from(sha256(familyToken()));
  return crypto.timingSafeEqual(a, b);
}

export function rotateFamilyToken(): string {
  const token = newToken();
  db().prepare("UPDATE settings SET value = ? WHERE key = 'family_token'").run(token);
  return token;
}

// ── language ────────────────────────────────────────────────────────────────

/**
 * The language an adult chose under Indstillinger, or null. Not checked
 * against the known languages here: src/i18n/server.ts ignores what it does
 * not know, so removing a language never breaks an install that used it.
 * Null too if the database cannot be read, so a page can still say so.
 */
export function householdLanguage(): string | null {
  try {
    const row = db().prepare("SELECT value FROM settings WHERE key = 'language'").get() as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function setHouseholdLanguage(code: string): void {
  db()
    .prepare("INSERT INTO settings (key, value) VALUES ('language', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(code);
}

// ── people ──────────────────────────────────────────────────────────────────

export type Person = {
  id: number;
  name: string;
  isAdult: boolean;
  hasPassword: boolean;
  /** "MM-DD", or null. */
  birthday: string | null;
  /** Free text, "Tøj 134, sko 33", and when it was last set (ISO); null when empty. */
  sizes: string | null;
  sizesAt: string | null;
};

type PersonRow = {
  id: number;
  name: string;
  is_adult: number;
  password_hash: string | null;
  birthday: string | null;
  sizes: string | null;
  sizes_at: string | null;
};

function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    isAdult: row.is_adult === 1,
    hasPassword: row.password_hash !== null,
    birthday: row.birthday ?? null,
    sizes: row.sizes ?? null,
    sizesAt: row.sizes_at ?? null,
  };
}

/**
 * Alphabetical, everywhere the household is listed (Richard, 2026-11-16).
 * Sorted here with Danish collation, not in SQL: SQLite's ORDER BY puts Æ, Ø
 * and Å by byte, not after Z.
 */
const byName = new Intl.Collator("da", { sensitivity: "base" });

export function listPeople(): Person[] {
  const rows = db().prepare("SELECT * FROM people ORDER BY id").all() as PersonRow[];
  return rows.map(toPerson).sort((a, b) => byName.compare(a.name, b.name));
}

/**
 * For the login: the member with this name, in any case, if they have a code.
 * Compared here, not in SQL: SQLite's lower() knows only ASCII, so "ÆGIR" and
 * "ægir" would not match (found testing "FORÆLDER", 2026-11-16).
 */
export function memberByName(name: string): Person | null {
  const wanted = name.trim().toLocaleLowerCase("da");
  if (!wanted) return null;
  const rows = db()
    .prepare("SELECT * FROM people WHERE password_hash IS NOT NULL ORDER BY id")
    .all() as PersonRow[];
  const row = rows.find((r) => r.name.trim().toLocaleLowerCase("da") === wanted);
  return row ? toPerson(row) : null;
}

export function getPerson(id: number): Person | null {
  const row = db().prepare("SELECT * FROM people WHERE id = ?").get(id) as PersonRow | undefined;
  return row ? toPerson(row) : null;
}

export function addPerson(name: string, isAdult: boolean): Person {
  const result = db()
    .prepare(
      `INSERT INTO people (name, is_adult, sort_order)
       VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM people))`,
    )
    .run(name, isAdult ? 1 : 0);
  return getPerson(Number(result.lastInsertRowid))!;
}

export function renamePerson(id: number, name: string): void {
  db().prepare("UPDATE people SET name = ? WHERE id = ?").run(name, id);
}

/** Children only: an adult is removed by nobody but the database's owner. */
export function removeChild(id: number): void {
  db().prepare("DELETE FROM people WHERE id = ? AND is_adult = 0").run(id);
}

export function passwordHash(personId: number): string | null {
  const row = db().prepare("SELECT password_hash FROM people WHERE id = ?").get(personId) as
    | { password_hash: string | null }
    | undefined;
  return row?.password_hash ?? null;
}

export function setPasswordHash(personId: number, hash: string): void {
  db().prepare("UPDATE people SET password_hash = ? WHERE id = ?").run(
    hash,
    personId,
  );
}

/**
 * The household's first password. Conditional in SQL — no adult may have one
 * yet — so two people racing cannot both win, and it can never happen twice.
 */
export function claimFirstPassword(personId: number, hash: string): boolean {
  const result = db()
    .prepare(
      `UPDATE people SET password_hash = ? WHERE id = ? AND is_adult = 1 AND password_hash IS NULL
         AND NOT EXISTS (SELECT 1 FROM people WHERE is_adult = 1 AND password_hash IS NOT NULL)`,
    )
    .run(hash, personId);
  return result.changes === 1;
}

/**
 * Only the very first password is free to claim. After that, an adult without
 * one gets in through an invitation made by one who has (Fable review: the
 * open claim let anyone who reached the login page take the second account).
 */
export function anyAdultHasPassword(): boolean {
  return Boolean(
    db().prepare("SELECT 1 FROM people WHERE is_adult = 1 AND password_hash IS NOT NULL").get(),
  );
}

/** An invitation for an adult who has no password yet. Returns the token once. */
export function createInvite(personId: number): string | null {
  const token = newToken();
  const result = db()
    .prepare(
      `UPDATE people SET invite_hash = ?, invite_created_at = datetime('now')
        WHERE id = ? AND password_hash IS NULL`,
    )
    .run(sha256(token), personId);
  return result.changes === 1 ? token : null;
}

// A link pasted into a chat should not stay a key for ever (Fable review).
const INVITE_DAYS = 7;

export function personByInvite(token: string): Person | null {
  const row = db()
    .prepare(
      `SELECT * FROM people WHERE invite_hash = ? AND password_hash IS NULL
         AND invite_created_at >= datetime('now', '-${INVITE_DAYS} days')`,
    )
    .get(sha256(token)) as PersonRow | undefined;
  return row ? toPerson(row) : null;
}

/** Claiming through an invitation spends it. */
export function claimByInvite(token: string, hash: string): Person | null {
  const person = personByInvite(token);
  if (!person) return null;
  const result = db()
    .prepare(
      `UPDATE people SET password_hash = ?, invite_hash = NULL
        WHERE id = ? AND invite_hash = ? AND password_hash IS NULL`,
    )
    .run(hash, person.id, sha256(token));
  return result.changes === 1 ? person : null;
}

export function setApiKeyHash(personId: number, hash: string | null): void {
  db().prepare("UPDATE people SET api_key_hash = ? WHERE id = ?").run(hash, personId);
}

export function personByApiKey(key: string): Person | null {
  const row = db()
    .prepare("SELECT * FROM people WHERE api_key_hash = ? AND is_adult = 1")
    .get(sha256(key)) as PersonRow | undefined;
  return row ? toPerson(row) : null;
}

export function hasApiKey(personId: number): boolean {
  const row = db().prepare("SELECT api_key_hash FROM people WHERE id = ?").get(personId) as
    | { api_key_hash: string | null }
    | undefined;
  return Boolean(row?.api_key_hash);
}

// ── sessions ────────────────────────────────────────────────────────────────

// A year, then log in again. Checked on read, pruned on every new login.
const SESSION_DAYS = 365;

export function createSession(personId: number): string {
  const token = newToken();
  db().prepare(`DELETE FROM sessions WHERE created_at < datetime('now', '-${SESSION_DAYS} days')`).run();
  db().prepare("INSERT INTO sessions (token_hash, person_id) VALUES (?, ?)").run(
    sha256(token),
    personId,
  );
  return token;
}

export function personBySession(token: string): Person | null {
  const row = db()
    .prepare(
      `SELECT p.* FROM sessions s JOIN people p ON p.id = s.person_id
        WHERE s.token_hash = ? AND p.password_hash IS NOT NULL
          AND s.created_at >= datetime('now', '-${SESSION_DAYS} days')`,
    )
    .get(sha256(token)) as PersonRow | undefined;
  return row ? toPerson(row) : null;
}

export function deleteSession(token: string): void {
  db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

/**
 * A child who forgot their code: an adult clears it, so a new invitation can be
 * made. Never an adult's — that would let one adult lock the other out.
 */
export function resetChildPassword(personId: number): boolean {
  const result = db()
    .prepare("UPDATE people SET password_hash = NULL, invite_hash = NULL WHERE id = ? AND is_adult = 0")
    .run(personId);
  db().prepare("DELETE FROM sessions WHERE person_id = ?").run(personId);
  return result.changes === 1;
}

/** After a password change: every other device has to log in again. */
export function deleteSessionsFor(personId: number, except: string | null): void {
  db()
    .prepare("DELETE FROM sessions WHERE person_id = ? AND token_hash != ?")
    .run(personId, except ? sha256(except) : "");
}

// ── wishes ──────────────────────────────────────────────────────────────────

export type WishFields = {
  title: string;
  url?: string | null;
  price?: string | null;
  imagePath?: string | null;
  favourite?: boolean;
  note?: string | null;
};

export function addWish(personId: number, fields: WishFields): number {
  const result = db()
    .prepare(
      `INSERT INTO wishes (person_id, title, url, price, image_path, favourite, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      personId,
      fields.title,
      fields.url ?? null,
      fields.price ?? null,
      fields.imagePath ?? null,
      fields.favourite ? 1 : 0,
      fields.note ?? null,
    );
  return Number(result.lastInsertRowid);
}

export function updateWish(
  wishId: number,
  fields: Pick<WishFields, "title" | "url" | "price" | "note">,
): void {
  db()
    .prepare(
      `UPDATE wishes SET title = ?, price = ?, note = ?,
              link_problem = CASE WHEN url IS ? THEN link_problem END,
              link_seen = CASE WHEN url IS ? THEN link_seen END,
              link_strikes = CASE WHEN url IS ? THEN link_strikes ELSE 0 END,
              url = ?
        WHERE id = ?`,
    )
    .run(fields.title, fields.price ?? null, fields.note ?? null, fields.url ?? null, fields.url ?? null, fields.url ?? null, fields.url ?? null, wishId);
}

/**
 * Replaces (or, with null, removes) a wish's picture, in one transaction so two
 * uploads cannot both read the same old name. Returns the file that is no
 * longer used — the old one, or the new one itself if the wish is gone.
 */
export function setWishImage(wishId: number, imagePath: string | null): string | null {
  return db().transaction(() => {
    const row = db().prepare("SELECT image_path FROM wishes WHERE id = ?").get(wishId) as
      | { image_path: string | null }
      | undefined;
    if (!row) return imagePath; // deleted meanwhile ("Fik det"): the new file is the orphan
    db().prepare("UPDATE wishes SET image_path = ? WHERE id = ?").run(imagePath, wishId);
    return row.image_path;
  })();
}

export function toggleFavourite(wishId: number): void {
  db().prepare("UPDATE wishes SET favourite = 1 - favourite WHERE id = ?").run(wishId);
}

export function toggleHidden(wishId: number): void {
  db()
    .prepare("UPDATE wishes SET hidden_at = CASE WHEN hidden_at IS NULL THEN datetime('now') END WHERE id = ?")
    .run(wishId);
}

/** The owner of a wish, so a route can check it against what the viewer manages. */
export function wishOwner(wishId: number): number | null {
  const row = db().prepare("SELECT person_id FROM wishes WHERE id = ?").get(wishId) as
    | { person_id: number }
    | undefined;
  return row?.person_id ?? null;
}

/** Returns false if someone else got there first. */
export function reserve(wishId: number, guestName: string, guestId: string): boolean {
  const result = db()
    .prepare(
      // Only a wish that exists and is still on the list (Fable review: a
      // received one could be reserved, and a bogus id was a 500).
      `INSERT OR IGNORE INTO reservations (wish_id, guest_name, guest_id)
       SELECT id, ?, ? FROM wishes WHERE id = ? AND received_at IS NULL AND hidden_at IS NULL`,
    )
    .run(guestName, guestId, wishId);
  return result.changes === 1;
}

/** A parent clearing a reservation on a child's list, whoever made it. */
export function clearReservation(wishId: number): void {
  db().prepare("DELETE FROM reservations WHERE wish_id = ?").run(wishId);
}

/** A guest may release only their own reservation. */
export function release(wishId: number, guestId: string): boolean {
  const result = db()
    .prepare("DELETE FROM reservations WHERE wish_id = ? AND guest_id = ?")
    .run(wishId, guestId);
  return result.changes === 1;
}

/** Deleted for good ("Slet"): the wish and its reservation go together. */
export function removeWish(wishId: number): string | null {
  const row = db().prepare("SELECT image_path FROM wishes WHERE id = ?").get(wishId) as
    | { image_path: string | null }
    | undefined;
  db().prepare("DELETE FROM wishes WHERE id = ?").run(wishId);
  return row?.image_path ?? null;
}

/**
 * Several at once, after an import gone wrong. Only wishes on this person's
 * list: an id from someone else's list is ignored, not deleted. Returns the
 * pictures to remove.
 */
export function removeWishes(personId: number, wishIds: number[]): string[] {
  const pick = db().prepare("SELECT image_path FROM wishes WHERE id = ? AND person_id = ?");
  const drop = db().prepare("DELETE FROM wishes WHERE id = ? AND person_id = ?");
  const images: string[] = [];
  db().transaction(() => {
    for (const wishId of wishIds) {
      const row = pick.get(wishId, personId) as { image_path: string | null } | undefined;
      if (!row) continue;
      drop.run(wishId, personId);
      if (row.image_path) images.push(row.image_path);
    }
  })();
  return images;
}

/** "Fik det": off the list and into the history, reservation kept (it says who gave it). */
export function markReceived(wishId: number): boolean {
  return (
    db().prepare("UPDATE wishes SET received_at = datetime('now') WHERE id = ? AND received_at IS NULL").run(wishId)
      .changes === 1
  );
}

/** "Læg tilbage på listen": a mistaken "Fik det" is never final. */
export function unmarkReceived(wishId: number): boolean {
  return db().prepare("UPDATE wishes SET received_at = NULL WHERE id = ? AND received_at IS NOT NULL").run(wishId)
    .changes === 1;
}

export function setBirthday(personId: number, mmdd: string | null): void {
  db().prepare("UPDATE people SET birthday = ? WHERE id = ?").run(mmdd, personId);
}

/** Empty clears it. The date moves only when the text changes, so a re-save is not news. */
export function setSizes(personId: number, sizes: string): void {
  const value = sizes.trim() || null;
  db()
    .prepare(
      "UPDATE people SET sizes = ?, sizes_at = CASE WHEN ? IS NULL THEN NULL WHEN sizes IS ? THEN sizes_at ELSE ? END WHERE id = ?",
    )
    .run(value, value, value, new Date().toISOString(), personId);
}

// ── the nightly link check ─────────────────────────────────────────────────

/** Every link on a list today: not received, hidden ones included (their owner sees them). */
export function linksToCheck(): { id: number; url: string }[] {
  return db()
    .prepare("SELECT id, url FROM wishes WHERE url IS NOT NULL AND received_at IS NULL ORDER BY id")
    .all() as { id: number; url: string }[];
}

/**
 * One night's verdict on one link. "unknown" (a refusal, a timeout) changes
 * nothing; "ok" clears; a problem is shown only on its second night in a row.
 */
export function recordLinkVerdict(wishId: number, verdict: LinkVerdict): void {
  if (verdict === "unknown") return;
  if (verdict === "ok") {
    db().prepare("UPDATE wishes SET link_problem = NULL, link_seen = NULL, link_strikes = 0 WHERE id = ?").run(wishId);
    return;
  }
  db()
    .prepare(
      `UPDATE wishes SET link_strikes = CASE WHEN link_seen IS ? THEN link_strikes + 1 ELSE 1 END,
                         link_seen = ?
        WHERE id = ?`,
    )
    .run(verdict, verdict, wishId);
  db()
    .prepare(`UPDATE wishes SET link_problem = CASE WHEN link_strikes >= ? THEN link_seen END WHERE id = ?`)
    .run(LINK_STRIKES, wishId);
}

export type LinkCheckRun = { at: string; checked: number; flagged: number; unknown: number };

export function saveLinkCheckRun(run: LinkCheckRun): void {
  db().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('link_check', ?)").run(JSON.stringify(run));
}

export function lastLinkCheckRun(): LinkCheckRun | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = 'link_check'").get() as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as LinkCheckRun) : null;
}

export function flaggedLinkCount(): number {
  return (
    db().prepare("SELECT count(*) AS n FROM wishes WHERE link_problem IS NOT NULL AND received_at IS NULL").get() as {
      n: number;
    }
  ).n;
}

/** Every picture a person's wishes hold, received ones included — for removing a child. */
export function imagePathsOf(personId: number): string[] {
  return (
    db().prepare("SELECT image_path FROM wishes WHERE person_id = ? AND image_path IS NOT NULL").all(personId) as {
      image_path: string;
    }[]
  ).map((r) => r.image_path);
}

export type ReceivedRow = {
  id: number;
  title: string;
  url: string | null;
  imagePath: string | null;
  receivedAt: string;
  /** Who reserved it, if anyone. NOT for display as it stands — see received.ts. */
  giverName: string | null;
};

/** The raw history. Pages go through received.ts, which decides what may be shown. */
export function receivedRows(personId: number): ReceivedRow[] {
  return (
    db()
      .prepare(
        `SELECT w.id, w.title, w.url, w.image_path, w.received_at, r.guest_name
           FROM wishes w LEFT JOIN reservations r ON r.wish_id = w.id
          WHERE w.person_id = ? AND w.received_at IS NOT NULL
          ORDER BY w.received_at DESC, w.id DESC`,
      )
      .all(personId) as {
      id: number;
      title: string;
      url: string | null;
      image_path: string | null;
      received_at: string;
      guest_name: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    imagePath: r.image_path,
    receivedAt: r.received_at,
    giverName: r.guest_name,
  }));
}

type WishRow = {
  id: number;
  person_id: number;
  title: string;
  url: string | null;
  price: string | null;
  image_path: string | null;
  favourite: number;
  note: string | null;
  hidden_at: string | null;
  link_problem: string | null;
  r_id: number | null;
  r_guest_name: string | null;
  r_guest_id: string | null;
  r_created_at: string | null;
};

/**
 * The only way wishes leave the database. Hidden wishes stay out unless the
 * caller has checked that the viewer manages this list (canManage): the
 * default is the safe one, so the family link and the print view never ask.
 */
export function listForViewer(
  viewer: Viewer,
  personId: number,
  guestId: string | null = null,
  { withHidden = false }: { withHidden?: boolean } = {},
): WishView[] {
  const rows = db()
    .prepare(
      `SELECT w.*, r.id AS r_id, r.guest_name AS r_guest_name, r.guest_id AS r_guest_id,
              r.created_at AS r_created_at
         FROM wishes w LEFT JOIN reservations r ON r.wish_id = w.id
        WHERE w.person_id = ? AND w.received_at IS NULL AND (? OR w.hidden_at IS NULL)
        ORDER BY w.favourite DESC, w.created_at DESC, w.id DESC`,
    )
    .all(personId, withHidden ? 1 : 0) as WishRow[];

  return rows.map((row) => {
    const wish: Wish = {
      id: row.id,
      personId: row.person_id,
      title: row.title,
      url: row.url,
      price: row.price,
      imagePath: row.image_path,
      favourite: row.favourite === 1,
      note: row.note,
      hidden: row.hidden_at !== null,
      linkProblem: row.link_problem === "gone" || row.link_problem === "soldout" ? row.link_problem : null,
    };
    const reservation: Reservation | null =
      row.r_id === null
        ? null
        : {
            id: row.r_id,
            guestName: row.r_guest_name!,
            guestId: row.r_guest_id!,
            createdAt: row.r_created_at!,
          };
    return viewWish(viewer, wish, reservation, guestId);
  });
}
