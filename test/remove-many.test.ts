import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * "Vælg" deletes several wishes at once. The ids come from the browser, so an
 * id from someone else's list must be ignored, not deleted.
 */
test("removeWishes deletes only the person's own ticked wishes and returns their pictures", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onskeliste-many-"));
  process.env.HUSHLIST_DB_PATH = path.join(dir, "onskeliste.db");
  const db = await import("../src/lib/db");

  const ida = db.addPerson("Ida", false);
  const oskar = db.addPerson("Oskar", false);
  const a = db.addWish(ida.id, { title: "Badekåbe" });
  const b = db.addWish(ida.id, { title: "Lalandia" });
  const keep = db.addWish(ida.id, { title: "Moon Hopper" });
  const other = db.addWish(oskar.id, { title: "Fire blaster" });
  db.setWishImage(a, "images/a.jpg");

  const images = db.removeWishes(ida.id, [a, b, other, 99999]);

  assert.deepEqual(images, ["images/a.jpg"]);
  assert.equal(db.wishOwner(a), null);
  assert.equal(db.wishOwner(b), null);
  assert.equal(db.wishOwner(keep), ida.id);
  assert.equal(db.wishOwner(other), oskar.id);
});
