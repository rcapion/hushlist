/**
 * A download's Content-Disposition with a name that may not be ASCII: the real
 * name in filename* (RFC 6266, which Safari honours), and an ASCII fallback in
 * filename for clients that do not. "Ønskeliste.shortcut" → "Onskeliste.shortcut".
 */
export function contentDisposition(name: string): string {
  const ascii = name
    .replace(/Æ/g, "AE").replace(/æ/g, "ae").replace(/Ø/g, "O").replace(/ø/g, "o")
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** An iCloud link to a shared Shortcut, normalised; null for anything else. */
export function iCloudShortcutLink(input: string): string | null {
  const m = input.trim().match(/^https:\/\/(?:www\.)?icloud\.com\/shortcuts\/([0-9a-f]{32})\/?$/i);
  return m ? `https://www.icloud.com/shortcuts/${m[1].toLowerCase()}` : null;
}
