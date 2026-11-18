import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

/**
 * The Shortcut from Safari sends the page as the phone saw it, because some
 * shops (H&M) wall off servers. The wish must come from that copy, without
 * the server fetching the page itself.
 */
test("a page sent by the phone is used, and the server does not fetch it", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onskeliste-phone-"));
  process.env.HUSHLIST_DB_PATH = path.join(dir, "onskeliste.db");
  const { addPerson } = await import("../src/lib/db");
  const { createWishFromInput } = await import("../src/lib/wishes");

  // What the Shortcut's JavaScript collects: <title>, metas, JSON-LD.
  const html = [
    '<meta property="og:title" content="Cardigan i finstrik">',
    '<meta property="og:image" content="/assets/cardigan.jpg">',
    '<script type="application/ld+json">{"@type":"Product","name":"Cardigan i finstrik",' +
      '"offers":{"price":"199.00","priceCurrency":"DKK"}}</script>',
  ].join("\n");

  // A loopback URL: the SSRF guard refuses it, so a server fetch would fail
  // and leave the fallback title "127.0.0.1" instead of the phone's.
  const person = addPerson("Ida", false);
  const { id, fetched } = await createWishFromInput(person.id, "http://127.0.0.1:9/productpage.1.html", html);
  assert.equal(fetched, true);

  const row = new Database(process.env.HUSHLIST_DB_PATH, { readonly: true })
    .prepare("SELECT title, price FROM wishes WHERE id = ?")
    .get(id) as { title: string; price: string };
  assert.equal(row.title, "Cardigan i finstrik");
  assert.equal(row.price, "199 kr.");
});
