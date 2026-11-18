import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { linkVerdict, parseAvailability } from "../src/lib/link-verdict";

const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

test("only what a shop says plainly counts", () => {
  assert.equal(linkVerdict(404, null), "gone");
  assert.equal(linkVerdict(410, null), "gone");
  // H&M refuses our server every night; that says nothing about the wish.
  assert.equal(linkVerdict(403, null), "unknown");
  assert.equal(linkVerdict(429, null), "unknown");
  assert.equal(linkVerdict(503, null), "unknown");
  assert.equal(linkVerdict(200, null), "ok");
  assert.equal(linkVerdict(200, "out"), "soldout");
  assert.equal(linkVerdict(200, "in"), "ok");
});

test("sold out only when every offer is out", () => {
  const out = { "@type": "Product", offers: { "@type": "Offer", availability: "https://schema.org/OutOfStock" } };
  assert.equal(parseAvailability(ld(out)), "out");
  const sizes = {
    "@type": "Product",
    offers: [
      { availability: "https://schema.org/OutOfStock" },
      { availability: "https://schema.org/InStock" },
    ],
  };
  assert.equal(parseAvailability(ld(sizes)), "in");
  const group = { "@graph": [{ "@type": "ProductGroup", hasVariant: [{ offers: { availability: "http://schema.org/SoldOut" } }] }] };
  assert.equal(parseAvailability(ld(group)), "out");
  assert.equal(parseAvailability("<title>x</title>"), null);
  assert.equal(parseAvailability('<meta property="product:availability" content="out of stock">'), "out");
  assert.equal(parseAvailability('<meta property="og:availability" content="instock">'), "in");
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onskeliste-links-"));
process.env.HUSHLIST_DB_PATH = path.join(dir, "onskeliste.db");

test("a problem shows on its second night in a row; unknown and ok behave", async () => {
  const db = await import("../src/lib/db");
  const person = db.addPerson("Barn A", false);
  const id = db.addWish(person.id, { title: "Bil", url: "https://shop.example/bil" });
  const problem = () => db.listForViewer({ kind: "guest", name: "x" }, person.id)[0].linkProblem;

  db.recordLinkVerdict(id, "gone");
  assert.equal(problem(), null);
  db.recordLinkVerdict(id, "unknown");
  assert.equal(problem(), null);
  db.recordLinkVerdict(id, "gone");
  assert.equal(problem(), "gone");
  // A different problem starts its own count, and the old one stays meanwhile.
  db.recordLinkVerdict(id, "soldout");
  assert.equal(problem(), null);
  db.recordLinkVerdict(id, "soldout");
  assert.equal(problem(), "soldout");
  db.recordLinkVerdict(id, "ok");
  assert.equal(problem(), null);

  db.recordLinkVerdict(id, "gone");
  db.recordLinkVerdict(id, "gone");
  db.updateWish(id, { title: "Bil", url: "https://shop.example/bil-ny", price: null, note: null });
  assert.equal(problem(), null);
});

test("the check is due once a day, from 03:00 in Copenhagen", async () => {
  const { linkCheckDue } = await import("../src/lib/link-check");
  // 02:30 Copenhagen (01:30 UTC in winter): too early, even never run.
  assert.ok(!linkCheckDue(null, new Date("2026-11-18T01:30:00Z")));
  assert.ok(linkCheckDue(null, new Date("2026-11-18T02:15:00Z")));
  // Ran at 03:05 today: not again today, but tomorrow night.
  assert.ok(!linkCheckDue("2026-11-18T02:05:00Z", new Date("2026-11-18T20:00:00Z")));
  assert.ok(linkCheckDue("2026-11-18T02:05:00Z", new Date("2026-11-19T02:01:00Z")));
});
