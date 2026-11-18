import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * Skjul: a hidden wish is off every list but the one its managers see, and
 * cannot be reserved — not even by a guest who knows its id.
 */
test("a hidden wish reaches only a caller that asked for it, and cannot be reserved", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onskeliste-hidden-"));
  process.env.HUSHLIST_DB_PATH = path.join(dir, "onskeliste.db");
  const db = await import("../src/lib/db");

  const ida = db.addPerson("Ida", false);
  const shown = db.addWish(ida.id, { title: "Badekåbe" });
  const hidden = db.addWish(ida.id, { title: "Nintendo Switch" });
  db.toggleHidden(hidden);

  const guest = { kind: "guest", name: "Esther" } as const;
  assert.deepEqual(db.listForViewer(guest, ida.id).map((w) => w.id), [shown]);
  const managed = db.listForViewer({ kind: "owner", personId: 99 }, ida.id, null, { withHidden: true });
  assert.deepEqual(managed.map((w) => [w.id, w.hidden]).sort(), [[hidden, true], [shown, false]].sort());

  assert.equal(db.reserve(hidden, "Esther", "g_aaaaaaaaaaaaaaaaaaaaaa"), false);

  db.toggleHidden(hidden);
  assert.equal(db.listForViewer(guest, ida.id).length, 2);
  assert.equal(db.reserve(hidden, "Esther", "g_aaaaaaaaaaaaaaaaaaaaaa"), true);
});
