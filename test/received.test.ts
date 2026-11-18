import assert from "node:assert/strict";
import test from "node:test";

import { da } from "../src/i18n/da";
import { en } from "../src/i18n/en";
import { groupHistory, occasionFor, parseBirthday, revealAt } from "../src/lib/received";

const t = da.time;

const at = (s: string) => new Date(s + "T12:00:00Z");

test("Christmas runs 1 December to 15 January", () => {
  assert.equal(occasionFor(at("2026-12-24"), null, "Ida", t).label, "Jul 2026");
  assert.equal(occasionFor(at("2027-01-10"), null, "Ida", t).label, "Jul 2026");
  assert.equal(occasionFor(at("2027-01-20"), null, "Ida", t).label, "Januar 2027");
  assert.equal(occasionFor(at("2026-11-30"), null, "Ida", t).label, "November 2026");
});

test("a birthday within three weeks, the nearer occasion when both apply", () => {
  assert.equal(occasionFor(at("2027-03-15"), "03-10", "Ida", t).label, "Idas fødselsdag 2027");
  assert.equal(occasionFor(at("2027-05-15"), "03-10", "Ida", t).label, "Maj 2027");
  // A 20 December birthday: a gift on the 19th is the birthday, on the 24th Christmas.
  assert.equal(occasionFor(at("2026-12-19"), "12-20", "Oskar", t).label, "Oskars fødselsdag 2026");
  assert.equal(occasionFor(at("2026-12-24"), "12-20", "Oskar", t).label, "Jul 2026");
  // Across New Year.
  assert.equal(occasionFor(at("2027-12-30"), "01-05", "Klaus", t).label, "Klaus' fødselsdag 2028");
  assert.equal(parseBirthday("13-01"), null);
});

test("the giver: a month after, and never before the occasion itself", () => {
  const xmas = occasionFor(at("2026-12-01"), null, "Ida", t);
  // Marked 1 December: a month later is 31 December, after Christmas Eve.
  assert.ok(revealAt(at("2026-12-01"), xmas) > at("2026-12-30"));
  // Marked on the day: still a month.
  const r = revealAt(at("2026-12-24"), xmas);
  assert.ok(r >= at("2027-01-23"));
});

test("the history hides the giver until it may be shown, and groups newest first", () => {
  const rows = [
    { id: 1, title: "Lego", url: null, imagePath: null, receivedAt: "2026-12-24 18:00:00", giverName: "Mormor" },
    { id: 2, title: "Bog", url: null, imagePath: null, receivedAt: "2026-03-11 10:00:00", giverName: "Farmor" },
    { id: 3, title: "Hue", url: null, imagePath: null, receivedAt: "2026-12-26 10:00:00", giverName: null },
  ];
  const early = groupHistory(rows, "03-10", "Ida", at("2026-12-28"), t);
  assert.deepEqual(early.map((g) => g.label), ["Jul 2026", "Idas fødselsdag 2026"]);
  assert.equal(early[0].items.find((i) => i.id === 1)?.giver, null, "Christmas giver hidden on the 28th");
  assert.equal(early[1].items[0].giver, "Farmor", "March giver long since shown");
  assert.doesNotMatch(JSON.stringify(early), /Mormor/, "the hidden name is nowhere in the result");
  const later = groupHistory(rows, "03-10", "Ida", at("2027-02-01"), t);
  assert.equal(later[0].items.find((i) => i.id === 1)?.giver, "Mormor");
});

test("a spouse or parent sees the giver at once", () => {
  const rows = [{ id: 1, title: "Lego", url: null, imagePath: null, receivedAt: "2026-12-24 18:00:00", giverName: "Mormor" }];
  assert.equal(groupHistory(rows, null, "Ida", at("2026-12-25"), t, true)[0].items[0].giver, "Mormor");
  assert.equal(groupHistory(rows, null, "Ida", at("2026-12-25"), t)[0].items[0].giver, null);
});

test("the occasions in English", () => {
  assert.equal(occasionFor(at("2026-12-24"), null, "Ida", en.time).label, "Christmas 2026");
  assert.equal(occasionFor(at("2027-03-15"), "03-10", "Ida", en.time).label, "Ida's birthday 2027");
  assert.equal(occasionFor(at("2027-12-30"), "01-05", "James", en.time).label, "James' birthday 2028");
  assert.equal(occasionFor(at("2027-05-15"), null, "Ida", en.time).label, "May 2027");
});
