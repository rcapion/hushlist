/**
 * The app's languages. Each is a folder here with the same files as da/; see
 * docs/TRANSLATING.md for adding one. Server code gets its messages from
 * getT() (src/i18n/server.ts), client components from useT()
 * (src/i18n/client.tsx).
 */
import { da } from "./da";
import { en } from "./en";
import type { Messages } from "./types";

export type { Messages } from "./types";

export const LOCALES = { da, en } satisfies Record<string, Messages>;
export type Locale = keyof typeof LOCALES;

/** When neither the household nor the host has chosen. */
export const FALLBACK_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && Object.hasOwn(LOCALES, value);
}

export function messagesFor(locale: Locale): Messages {
  return LOCALES[locale];
}
