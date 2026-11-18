import "server-only";

import { defaultLanguage } from "@/lib/config";
import { householdLanguage } from "@/lib/db";
import { FALLBACK_LOCALE, isLocale, messagesFor, type Locale, type Messages } from "@/i18n";

/**
 * The household's language: what an adult chose under Indstillinger, else
 * HUSHLIST_LANGUAGE, else English. Read per request — it is one row.
 */
export function getLocale(): Locale {
  const chosen = householdLanguage();
  if (isLocale(chosen)) return chosen;
  const host = defaultLanguage();
  if (isLocale(host)) return host;
  return FALLBACK_LOCALE;
}

/** The messages for server components, actions and routes. */
export function getT(): Messages {
  return messagesFor(getLocale());
}
