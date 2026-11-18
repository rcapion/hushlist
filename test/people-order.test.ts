import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

/** The household is listed alphabetically, adults and children together, Danish letters last. */
test("listPeople is alphabetical with Danish collation", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onskeliste-order-"));
  process.env.HUSHLIST_DB_PATH = path.join(dir, "onskeliste.db");
  const db = await import("../src/lib/db");

  db.addPerson("Richard", true);
  db.addPerson("Anna", true);
  db.addPerson("Oskar", false);
  db.addPerson("Åse", false);
  db.addPerson("Ida", false);

  assert.deepEqual(
    db.listPeople().map((p) => p.name),
    ["Anna", "Ida", "Oskar", "Richard", "Åse"],
  );
});
