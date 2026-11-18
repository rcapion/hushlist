import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { safeFetch } from "@/lib/safe-fetch";

/**
 * What a product page says about itself: Open Graph tags, JSON-LD Product data,
 * and <title> as the last resort. Parsing is a pure function so it can be tested
 * against saved pages; fetching is separate and allowed to fail.
 */

export type ProductInfo = {
  title: string | null;
  imageUrl: string | null;
  price: string | null;
};

/** A code point a page may name, or the entity is left as it was. */
function codePoint(n: number, entity: string): string {
  const valid = Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff);
  return valid ? String.fromCodePoint(n) : entity;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (m, n) => codePoint(Number(n), m))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => codePoint(parseInt(n, 16), m))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function metaContent(html: string, key: string): string | null {
  // Attribute order varies between sites; match the tag, then pick attributes.
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content?.trim()) return decodeEntities(content.trim());
  }
  return null;
}

type JsonLdOffer = { price?: unknown; lowPrice?: unknown; priceCurrency?: unknown };
type JsonLdNode = {
  "@type"?: unknown;
  "@graph"?: unknown;
  name?: unknown;
  image?: unknown;
  offers?: unknown;
};

function* walk(node: unknown): Generator<JsonLdNode> {
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n);
  } else if (node && typeof node === "object") {
    const obj = node as JsonLdNode;
    yield obj;
    if (obj["@graph"]) yield* walk(obj["@graph"]);
  }
}

function isProduct(node: JsonLdNode): boolean {
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /^(Product|ProductGroup)$/i.test(x));
}

function firstImage(image: unknown): string | null {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return firstImage(image[0]);
  if (image && typeof image === "object" && "url" in image) return firstImage((image as { url: unknown }).url);
  return null;
}

/**
 * "249.95", "249,95", "1.299" (Danish thousands), "1,299.00", "1 299". A dot
 * followed by exactly three digits is a thousands separator: no shop prices to
 * the tenth of an øre.
 */
export function parseAmount(raw: string): number {
  let s = raw.replace(/[\s\u00a0]/g, "").replace(/[^\d.,]/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    s = /,\d{3}$/.test(s) && s.split(",").length > 2 ? s.split(",").join("") : s.replace(",", ".");
  } else if (/\.\d{3}$/.test(s)) {
    s = s.split(".").join("");
  }
  return parseFloat(s);
}

function offerPrice(offers: unknown): { amount: number; currency: string | null } | null {
  for (const offer of walk(offers) as Generator<JsonLdOffer & JsonLdNode>) {
    const raw = offer.price ?? offer.lowPrice;
    const amount = typeof raw === "number" ? raw : typeof raw === "string" ? parseAmount(raw) : NaN;
    if (Number.isFinite(amount) && amount > 0) {
      return { amount, currency: typeof offer.priceCurrency === "string" ? offer.priceCurrency : null };
    }
  }
  return null;
}

export function formatPrice(amount: number, currency: string | null): string {
  const code = (currency ?? "DKK").toUpperCase();
  if (code === "DKK") {
    const whole = Number.isInteger(amount);
    return `${amount.toLocaleString("da-DK", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })} kr.`;
  }
  try {
    return amount.toLocaleString("da-DK", { style: "currency", currency: code });
  } catch {
    return `${amount} ${code}`;
  }
}

export function parseProduct(html: string, pageUrl: string): ProductInfo {
  let title: string | null = null;
  let image: string | null = null;
  let price: string | null = null;

  const scripts = html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue;
    }
    for (const node of walk(data)) {
      if (!isProduct(node)) continue;
      if (!title && typeof node.name === "string") title = decodeEntities(node.name.trim());
      if (!image) image = firstImage(node.image);
      if (!price) {
        const p = offerPrice(node.offers);
        if (p) price = formatPrice(p.amount, p.currency);
      }
    }
  }

  title ??= metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
  image ??= metaContent(html, "og:image") ?? metaContent(html, "og:image:url") ?? metaContent(html, "twitter:image");
  if (!price) {
    const amount = metaContent(html, "product:price:amount") ?? metaContent(html, "og:price:amount");
    const currency = metaContent(html, "product:price:currency") ?? metaContent(html, "og:price:currency");
    const n = amount ? parseAmount(amount) : NaN;
    if (Number.isFinite(n) && n > 0) price = formatPrice(n, currency);
  }
  if (!title) {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    if (t?.trim()) title = decodeEntities(t.trim().replace(/\s+/g, " "));
  }

  let imageUrl: string | null = null;
  if (image) {
    try {
      imageUrl = new URL(image, pageUrl).toString();
    } catch {
      imageUrl = null;
    }
  }
  return { title: title ? title.slice(0, 200) : null, imageUrl, price };
}

/** The shop's name for a wish without a title: "www.br.dk" → "br.dk". */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Most shops are UTF-8; the odd old one is Latin-1 and its "ø" comes out as
 * "�" if read as UTF-8. Header first, then <meta charset> in the first 2 KB.
 */
export function decodeBody(body: Buffer, contentType: string): string {
  const head = body.subarray(0, 2048).toString("latin1");
  const label =
    contentType.match(/charset=["']?([\w-]+)/i)?.[1] ??
    head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(label.toLowerCase()).decode(body);
  } catch {
    return body.toString("utf8");
  }
}

export function describe(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const code = (err as { code?: string }).code;
  const cause = (err as { cause?: unknown }).cause;
  return [err.name, code, err.message, cause instanceof Error ? `cause: ${cause.message}` : null]
    .filter(Boolean)
    .join(" ");
}

export async function fetchProduct(url: string): Promise<ProductInfo> {
  try {
    const res = await safeFetch(url);
    if (res.status >= 400 || !/html/i.test(res.contentType)) {
      console.warn(`fetchProduct ${displayHost(url)}: HTTP ${res.status} ${res.contentType}`);
      return { title: null, imageUrl: null, price: null };
    }
    const info = parseProduct(decodeBody(res.body, res.contentType), res.url);
    // A 2xx with nothing in it is a bot wall as often as an odd shop page, and
    // the user sees the same fallback title either way: say which it was.
    if (!info.title || !info.imageUrl) {
      console.warn(
        `fetchProduct ${displayHost(url)}: HTTP ${res.status} ${res.contentType} ${res.body.length} B,` +
          ` ${info.title ? "title" : "no title"}, ${info.imageUrl ? "image" : "no image"}`,
      );
    }
    return info;
  } catch (err) {
    // A failure the user sees only as "the shop would not show us": the log
    // is the one place that says why (host only, never the full URL).
    console.warn(`fetchProduct ${displayHost(url)}: ${describe(err)}`);
    return { title: null, imageUrl: null, price: null };
  }
}

// ── images ──────────────────────────────────────────────────────────────────

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function imageDir(dataDir: string): string {
  return path.join(dataDir, "images");
}

/**
 * A local copy, because a hotlinked shop image disappears with the product
 * page. Returns the file name, or null — a wish without a picture is fine.
 */
export async function downloadImage(imageUrl: string, dataDir: string): Promise<string | null> {
  try {
    const res = await safeFetch(imageUrl, { maxBytes: 8_000_000, accept: "image/*" });
    // The bytes decide, as for uploads — not what the shop's server claims.
    const type = res.contentType.split(";")[0].trim().toLowerCase();
    const ext = sniffImage(res.body);
    if (res.status >= 400 || !ext) {
      console.warn(`downloadImage ${displayHost(imageUrl)}: HTTP ${res.status} ${type} ${res.body.length} B`);
      return null;
    }
    const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
    const dir = imageDir(dataDir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), res.body);
    return name;
  } catch (err) {
    console.warn(`downloadImage ${displayHost(imageUrl)}: ${describe(err)}`);
    return null;
  }
}

/**
 * The type of an uploaded picture, from its first bytes — never from the name
 * or the browser's word for it. Only raster formats the image route serves;
 * anything else (SVG, HTML, a renamed PDF) is null.
 */
export function sniffImage(buf: Buffer): "jpg" | "png" | "webp" | "gif" | "avif" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString("latin1", 0, 6))) return "gif";
  if (buf.length >= 12 && buf.toString("latin1", 4, 12) === "ftypavif") return "avif";
  return null;
}

/**
 * Most bytes one uploaded picture may have. The browser shrinks it to a few
 * hundred KB; more buys nothing, and Next buffers an action's body BEFORE the
 * action can check who is asking, so the ceiling is also what an anonymous
 * caller can make the server hold per request (Fable review, 2026-11-16).
 */
export const MAX_UPLOAD_BYTES = 1_500_000;

/** A picture someone chose themselves. Returns the stored name, or null if it is not a picture. */
export function saveUploadedImage(buf: Buffer, dataDir: string): string | null {
  if (buf.length === 0 || buf.length > MAX_UPLOAD_BYTES) return null;
  const ext = sniffImage(buf);
  if (!ext) return null;
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  const dir = imageDir(dataDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  return name;
}

/** Only names this module wrote: no path separators, no tricks. */
export function isImageName(name: string): boolean {
  return /^[0-9a-f]{24}\.(jpg|png|webp|gif|avif)$/.test(name);
}

export function imageContentType(name: string): string {
  const ext = name.split(".").pop()!;
  return Object.entries(IMAGE_TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
}

export function deleteImage(name: string | null, dataDir: string): void {
  if (!name || !isImageName(name)) return;
  fs.rmSync(path.join(imageDir(dataDir), name), { force: true });
}
