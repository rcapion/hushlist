import type { Messages } from "@/i18n";

const DAY = 24 * 60 * 60 * 1000;

/** Children grow out of a size in about half a year; adults do not. */
const STALE_DAYS = 182;

/** "today", "3 days ago", "4 months ago", "over a year ago" — in the household's language. */
export function sizesAge(setAt: string, t: Messages["time"], now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(setAt).getTime()) / DAY);
  if (days < 1) return t.today;
  if (days === 1) return t.yesterday;
  if (days < 31) return t.daysAgo(days);
  const months = Math.floor(days / 30.44);
  if (months < 12) return t.monthsAgo(months);
  return t.overAYear;
}

export function sizesStale(setAt: string, isAdult: boolean, now = new Date()): boolean {
  return !isAdult && now.getTime() - new Date(setAt).getTime() > STALE_DAYS * DAY;
}
