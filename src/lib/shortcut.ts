import type { Locale } from "@/i18n";

/**
 * The one Shortcut for every install, shared by iCloud link: it asks for the
 * address and the key on import (scripts/build-shortcut.py without an origin).
 * Used when the household has set no link of its own. Empty until published.
 */
export const PUBLIC_SHORTCUT_LINKS: Partial<Record<Locale, string>> = {
  // Published 2026-11-18. A changed Shortcut gets a new link: replace both.
  da: "https://www.icloud.com/shortcuts/efaa53710428422c878d961d4cf11b37",
  en: "https://www.icloud.com/shortcuts/e7817b020bea454db18c18becf0fd4d1",
};
