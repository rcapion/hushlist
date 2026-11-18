/**
 * Everything a host may set, read from the environment in one place. Each one
 * is optional; docs/CONFIGURATION.md says what it does and when to set it.
 *
 * Every variable is HUSHLIST_<NAME>. ONSKELISTE_<NAME>, the names from before
 * the app was published, is still read when the new one is absent, so an
 * existing install keeps working without touching its compose file.
 *
 * Imported by client components too (through the i18n helpers). There
 * process.env is empty, so every value must have a sensible default.
 */
function setting(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  for (const prefix of ["HUSHLIST_", "ONSKELISTE_"]) {
    const value = process.env[prefix + name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * The address the family uses, e.g. "https://wishes.example.com". Optional:
 * without it the app builds links from the Host and X-Forwarded-* headers its
 * proxy sends. Set it when the proxy does not send them, or sends the wrong
 * ones. It also decides whether cookies are Secure.
 */
export function publicUrl(): URL | null {
  const value = setting("PUBLIC_URL");
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    throw new Error(`HUSHLIST_PUBLIC_URL is not a URL: ${value}`);
  }
}

/** The SQLite file. Its directory holds the pictures and the backup copy too. */
export function databasePath(): string {
  return setting("DB_PATH") ?? `${process.cwd()}/data/hushlist.db`;
}

/** Dates on paper, occasions and the hour of the link check. */
export const TIME_ZONE = setting("TIMEZONE") ?? "Europe/Copenhagen";

/**
 * The household's language until an adult picks one in the app (src/i18n).
 * An unknown code is ignored there, not here: this module knows no languages.
 */
export function defaultLanguage(): string | undefined {
  return setting("LANGUAGE");
}

/** The nightly check of every wish's link; "off" makes no request at night. */
export function linkCheckEnabled(): boolean {
  return setting("LINK_CHECK") !== "off";
}

/** The HTTP proxy every outbound fetch goes through, if any. */
export function egressProxy(): string | undefined {
  return setting("EGRESS_PROXY");
}
