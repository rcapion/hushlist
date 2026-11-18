import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onskeliste-backup-"));
process.env.HUSHLIST_DB_PATH = path.join(dir, "onskeliste.db");

test("the backup is a whole database with the data in it, and a second run replaces it", async () => {
  const db = await import("../src/lib/db");
  db.addPerson("Barn A", false);
  const first = db.backupDatabase();
  assert.equal(first, path.join(dir, "backup", "onskeliste.db"));
  db.addPerson("Barn B", false);
  db.backupDatabase();
  const copy = new Database(first, { readonly: true });
  const names = (copy.prepare("SELECT name FROM people").all() as { name: string }[]).map((r) => r.name);
  copy.close();
  assert.deepEqual(names.sort(), ["Barn A", "Barn B"]);
  assert.ok(!fs.existsSync(`${first}.tmp`));
});

test("sizes: set, a re-save keeps the date, empty clears both", async () => {
  const db = await import("../src/lib/db");
  const child = db.addPerson("Barn C", false);
  db.setSizes(child.id, " Tøj 134, sko 33 ");
  const first = db.getPerson(child.id)!;
  assert.equal(first.sizes, "Tøj 134, sko 33");
  assert.ok(first.sizesAt);
  await new Promise((r) => setTimeout(r, 5));
  db.setSizes(child.id, "Tøj 134, sko 33");
  assert.equal(db.getPerson(child.id)!.sizesAt, first.sizesAt);
  db.setSizes(child.id, "Tøj 140, sko 33");
  assert.notEqual(db.getPerson(child.id)!.sizesAt, first.sizesAt);
  db.setSizes(child.id, "  ");
  assert.equal(db.getPerson(child.id)!.sizes, null);
  assert.equal(db.getPerson(child.id)!.sizesAt, null);
});
