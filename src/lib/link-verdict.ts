/**
 * What one night's visit says about a wish's link. Only what a shop says
 * plainly counts: 404/410 is gone, schema.org availability OutOfStock (or
 * SoldOut, Discontinued) on every offer is sold out. A refusal (403, 429), a
 * server error, a timeout or a page with no product data says nothing about
 * the wish — H&M refuses our server every night — so it is "unknown", and
 * unknown changes nothing.
 */
export type LinkVerdict = "ok" | "gone" | "soldout" | "unknown";

/** Nights in a row before a problem shows: one shop outage is not a dead link. */
export const LINK_STRIKES = 2;

export function linkVerdict(status: number, availability: "in" | "out" | null): LinkVerdict {
  if (status === 404 || status === 410) return "gone";
  if (status >= 400 || status < 200) return "unknown";
  if (availability === "out") return "soldout";
  return "ok";
}

const OUT = /(OutOfStock|SoldOut|Discontinued)$/i;
const IN = /(InStock|InStoreOnly|LimitedAvailability|OnlineOnly|PreOrder|PreSale|BackOrder)$/i;

function* nodes(value: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(value)) for (const v of value) yield* nodes(v);
  else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    yield obj;
    for (const key of ["@graph", "offers", "hasVariant"]) if (obj[key]) yield* nodes(obj[key]);
  }
}

/**
 * "out" only when the page names an availability and every one is out: a
 * product in several sizes is not sold out because one size is. Read from
 * JSON-LD, then og/product:availability metas.
 */
export function parseAvailability(html: string): "in" | "out" | null {
  const seen: string[] = [];
  for (const [, body] of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      for (const node of nodes(JSON.parse(body.trim()))) {
        if (typeof node.availability === "string") seen.push(node.availability.trim());
      }
    } catch {
      // A broken block is the shop's; the next may be fine.
    }
  }
  if (seen.length === 0) {
    for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
      if (!/\b(?:property|name)\s*=\s*["'](?:og|product):availability["']/i.test(tag)) continue;
      const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]?.trim();
      if (content) seen.push(/^(oos|out of stock|discontinued)$/i.test(content) ? "OutOfStock" : content);
    }
  }
  if (seen.length === 0) return null;
  if (seen.some((a) => IN.test(a) || /^(instock|in stock|available for order|preorder)$/i.test(a))) return "in";
  return seen.every((a) => OUT.test(a)) ? "out" : null;
}
