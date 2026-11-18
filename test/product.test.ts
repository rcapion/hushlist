import assert from "node:assert/strict";
import test from "node:test";

import { decodeBody, displayHost, formatPrice, parseAmount, isImageName, parseProduct } from "../src/lib/product";
import { isBlockedAddress } from "../src/lib/safe-fetch";
import { extractUrl, findUrl } from "../src/lib/wishes";

test("JSON-LD Product wins over Open Graph", () => {
  const html = `<html><head>
    <meta property="og:title" content="Shop &amp; Co – LEGO Bil">
    <meta property="og:image" content="/og.jpg">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite"},
      {"@type":"Product","name":"LEGO City Bil","image":["https://cdn.shop.dk/bil.jpg"],
       "offers":{"@type":"Offer","price":"249.95","priceCurrency":"DKK"}}]}</script>
  </head></html>`;
  assert.deepEqual(parseProduct(html, "https://shop.dk/p/1"), {
    title: "LEGO City Bil",
    imageUrl: "https://cdn.shop.dk/bil.jpg",
    price: "249,95 kr.",
  });
});

test("Open Graph and product:price, with a relative image and either attribute order", () => {
  const html = `<meta content="Kaffekværn" property="og:title"><meta property='og:image' content='/img/k.png'>
    <meta property="product:price:amount" content="1.299"><meta property="product:price:currency" content="DKK">`;
  const info = parseProduct(html, "https://www.shop.dk/x/y");
  assert.equal(info.title, "Kaffekværn");
  assert.equal(info.imageUrl, "https://www.shop.dk/img/k.png");
  assert.equal(info.price, "1.299 kr.");
});

test("<title> is the last resort, and broken JSON-LD is ignored", () => {
  const html = `<script type="application/ld+json">{not json</script><title>  En  bog \n</title>`;
  assert.deepEqual(parseProduct(html, "https://x.dk"), { title: "En bog", imageUrl: null, price: null });
});

test("prices", () => {
  assert.equal(parseAmount("249.95"), 249.95);
  assert.equal(parseAmount("249,95"), 249.95);
  assert.equal(parseAmount("1.299"), 1299);
  assert.equal(parseAmount("1.299,00"), 1299);
  assert.equal(parseAmount("1,299.00"), 1299);
  assert.equal(parseAmount("1 299 kr."), 1299);
  assert.equal(formatPrice(500, "DKK"), "500 kr.");
  assert.equal(formatPrice(500, null), "500 kr.");
  assert.match(formatPrice(20, "EUR"), /20,00\s€/);
});

test("urls in pasted text", () => {
  assert.equal(extractUrl("se den her https://br.dk/lego?id=1 tak"), "https://br.dk/lego?id=1");
  assert.equal(extractUrl("en rød cykel"), null);
  assert.equal(displayHost("https://www.br.dk/x"), "br.dk");
});

test("image names cannot escape the image directory", () => {
  assert.ok(isImageName("0123456789abcdef01234567.jpg"));
  assert.ok(!isImageName("../onskeliste.db"));
  assert.ok(!isImageName("0123456789abcdef01234567.jpg/../../x"));
  assert.ok(!isImageName("0123456789abcdef01234567.svg"));
});

test("SSRF guard blocks the house and allows the internet", () => {
  for (const ip of ["192.168.1.10", "10.0.0.1", "127.0.0.1", "169.254.169.254", "100.101.102.103",
                    "0.0.0.0", "::1", "::ffff:192.168.1.10", "fd7a:115c:a1e0::1", "fe80::1"]) {
    assert.ok(isBlockedAddress(ip), ip);
  }
  for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) {
    assert.ok(!isBlockedAddress(ip), ip);
  }
});

test("an impossible entity does not cost the whole page (Fable review)", () => {
  const html = `<meta property="og:title" content="Bog &#9999999999; &#xD800; &amp; mere">`;
  assert.equal(parseProduct(html, "https://x.dk").title, "Bog &#9999999999; &#xD800; & mere");
});

test("Latin-1 pages keep their ø", () => {
  const body = Buffer.from("<title>Rød cykel</title>", "latin1");
  assert.equal(decodeBody(body, "text/html; charset=ISO-8859-1"), "<title>Rød cykel</title>");
  assert.equal(decodeBody(Buffer.from("<title>Rød</title>"), "text/html"), "<title>Rød</title>");
});

test("the typed URL is what gets cut out of the text", () => {
  assert.deepEqual(findUrl("https://example.com  rød farve"), { url: "https://example.com/", raw: "https://example.com" });
});

test("pasted lists: Notes checklists, bullets and numbers are stripped", async () => {
  const { parseImportLines } = await import("../src/lib/wishes");
  assert.deepEqual(
    parseImportLines("🛒 Ønsker\n- [ ] Lego\n- [x] Bog\n• Cykel\n\n1. https://x.dk/a note\n  * Kaffe — mørk"),
    ["🛒 Ønsker", "Lego", "Bog", "Cykel", "https://x.dk/a note", "Kaffe — mørk"],
  );
});
