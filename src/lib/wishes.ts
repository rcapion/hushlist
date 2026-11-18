import { addWish, DATA_DIR } from "@/lib/db";
import { displayHost, downloadImage, fetchProduct, parseProduct } from "@/lib/product";

/**
 * A pasted URL somewhere in the text: "se den her https://…" works too.
 * `raw` is the text as typed, so it can be cut out of the input again — the
 * normalised form ("https://x.dk" → "https://x.dk/") is not in it.
 */
export function findUrl(input: string): { url: string; raw: string } | null {
  const match = input.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  try {
    return { url: new URL(match[0]).toString(), raw: match[0] };
  } catch {
    return null;
  }
}

/**
 * The page's own address, from the head the Safari Shortcut sends: og:url, then
 * the canonical link, then a JSON-LD "url". For when the Shortcut's own link
 * field arrives empty (seen on an iPhone, 2026-11-18). Only http(s).
 */
export function urlFromPageHead(html: string): string | null {
  const candidates = [
    html.match(/<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:url["']/i)?.[1],
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1],
    html.match(/"url"\s*:\s*"(https?:\/\/[^"]+)"/i)?.[1],
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const found = findUrl(raw.replace(/&amp;/g, "&"));
    if (found) return found.url;
  }
  return null;
}

export function extractUrl(input: string): string | null {
  return findUrl(input)?.url ?? null;
}

/**
 * One box for everything: a link is fetched for title, picture and price; plain
 * text is just a wish. A fetch that fails still makes the wish, named after
 * the shop, so pasting never ends in an error.
 */
export async function createWishFromInput(
  personId: number,
  input: string,
  pageHtml?: string,
): Promise<{ id: number; fetched: boolean }> {
  const text = input.trim();
  const found = findUrl(text);
  if (!found) {
    // "Borehammer — med ledning, gerne med mejselfunktion": title, then note.
    const [title, ...note] = text.split(/\s+—\s+/);
    return {
      id: addWish(personId, { title: title.slice(0, 200), note: note.join(" — ").slice(0, 500) || null }),
      fetched: true,
    };
  }

  const { url, raw } = found;
  // The Shortcut, run from Safari, sends the page as the phone saw it: shops
  // that wall off servers (H&M) let a phone through. Same parser either way;
  // the server only fetches when the phone's copy gave no title.
  const fromPhone = pageHtml ? parseProduct(pageHtml, url) : null;
  const info = fromPhone?.title ? fromPhone : await fetchProduct(url);
  const imagePath = info.imageUrl ? await downloadImage(info.imageUrl, DATA_DIR) : null;
  // Text beside the link: "titel — note". The shop's own title wins when the
  // fetch worked; ours is the fallback when it did not.
  const rest = text.replace(raw, "").replace(/\s+/g, " ").trim();
  const [ownTitle, ...noteParts] = rest ? rest.split(/\s+—\s+/) : [""];
  const note = noteParts.join(" — ") || null;
  const id = addWish(personId, {
    title: (info.title ?? (ownTitle || displayHost(url))).slice(0, 200),
    url,
    price: info.price,
    imagePath,
    note: (info.title ? (rest.includes(" — ") ? note : rest || null) : note)?.slice(0, 500) ?? null,
  });
  return { id, fetched: info.title !== null };
}

/** Most wishes one paste may create; each with a link costs a fetch. */
export const MAX_IMPORT_LINES = 30;

/**
 * One wish per line, from anywhere: Apple Notes checklists ("- [ ] …"),
 * bullets, numbered lists. Empty lines are skipped.
 */
export function parseImportLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•◦▪]\s*)?(?:\[[ xX✓]?\]\s*)?(?:\d+[.)]\s+)?/, "")
        .trim(),
    )
    .filter(Boolean);
}
