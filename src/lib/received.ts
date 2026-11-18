/**
 * The history of received wishes: grouped by occasion, and WHEN the giver may
 * be shown. Pure functions, tested in test/received.test.ts.
 *
 * Showing who gave a gift is the one deliberate exception to "nobody sees the
 * reservations on their own list" — and only once it can no longer spoil
 * anything (Richard, 2026-11-16): a month after "Fik det", and never before
 * the occasion itself has passed. Children cannot press "Fik det" at all, so a
 * child cannot mark a wish early to find out who bought it.
 */

import type { Messages } from "@/i18n";

export type Occasion = { key: string; label: string; date: Date };

const DAY = 86_400_000;
/** Before and after a birthday that still counts as "for the birthday". */
const BIRTHDAY_WINDOW_DAYS = 21;
export const REVEAL_AFTER_DAYS = 30;

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

/** Parses "MM-DD"; null for anything else. */
export function parseBirthday(mmdd: string | null): { month: number; day: number } | null {
  const m = mmdd?.match(/^(\d{2})-(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { month, day };
}

/**
 * Christmas: received 1 December – 15 January belongs to that December's Jul.
 * Birthday: within three weeks either side. Both: the nearer one. Otherwise the
 * month it was received.
 */
export function occasionFor(receivedAt: Date, birthday: string | null, name: string, t: Messages["time"]): Occasion {
  const y = receivedAt.getUTCFullYear();
  const candidates: Occasion[] = [];

  const m = receivedAt.getUTCMonth();
  const d = receivedAt.getUTCDate();
  if (m === 11) candidates.push({ key: `jul-${y}`, label: t.christmas(y), date: utc(y, 11, 24) });
  if (m === 0 && d <= 15) candidates.push({ key: `jul-${y - 1}`, label: t.christmas(y - 1), date: utc(y - 1, 11, 24) });

  const b = parseBirthday(birthday);
  if (b) {
    for (const by of [y - 1, y, y + 1]) {
      const date = utc(by, b.month, b.day);
      if (Math.abs(receivedAt.getTime() - date.getTime()) <= BIRTHDAY_WINDOW_DAYS * DAY) {
        candidates.push({ key: `fdag-${by}`, label: t.birthday(name, by), date });
      }
    }
  }

  if (candidates.length > 0) {
    return candidates.reduce((best, c) =>
      Math.abs(c.date.getTime() - receivedAt.getTime()) < Math.abs(best.date.getTime() - receivedAt.getTime()) ? c : best,
    );
  }
  return { key: `m-${y}-${m}`, label: t.month(m, y), date: receivedAt };
}

/** When the giver may be shown: a month after "Fik det", and not before the occasion. */
export function revealAt(receivedAt: Date, occasion: Occasion): Date {
  const month = receivedAt.getTime() + REVEAL_AFTER_DAYS * DAY;
  return new Date(Math.max(month, occasion.date.getTime() + DAY));
}

/** SQLite's datetime('now') is "YYYY-MM-DD HH:MM:SS" in UTC. */
export function parseDbTime(s: string): Date {
  return new Date(s.replace(" ", "T") + "Z");
}

export type HistoryItem = {
  id: number;
  title: string;
  url: string | null;
  imagePath: string | null;
  receivedAt: string;
  /** Only once revealAt has passed; otherwise null, and absent from the page entirely. */
  giver: string | null;
};
export type HistoryGroup = { key: string; label: string; items: HistoryItem[] };

type Row = { id: number; title: string; url: string | null; imagePath: string | null; receivedAt: string; giverName: string | null };

/** Newest occasion first. The giver's name leaves this function only when it may be shown. */
export function groupHistory(
  rows: Row[],
  birthday: string | null,
  name: string,
  now: Date,
  t: Messages["time"],
  /** The viewer could already see the reservation (a spouse, a parent): no wait. */
  seesGivers = false,
): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup & { date: number }>();
  for (const row of rows) {
    const at = parseDbTime(row.receivedAt);
    const occasion = occasionFor(at, birthday, name, t);
    const giver = row.giverName && (seesGivers || now >= revealAt(at, occasion)) ? row.giverName : null;
    const g = groups.get(occasion.key) ?? { key: occasion.key, label: occasion.label, items: [], date: occasion.date.getTime() };
    g.items.push({ id: row.id, title: row.title, url: row.url, imagePath: row.imagePath, receivedAt: row.receivedAt, giver });
    groups.set(occasion.key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.date - a.date)
    .map(({ key, label, items }) => ({ key, label, items }));
}
