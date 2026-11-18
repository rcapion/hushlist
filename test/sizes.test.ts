import assert from "node:assert/strict";
import test from "node:test";

import { da } from "../src/i18n/da";
import { en } from "../src/i18n/en";
import { sizesAge, sizesStale } from "../src/lib/sizes";

const now = new Date("2026-11-17T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

test("the age of the sizes in English", () => {
  assert.equal(sizesAge(ago(0), en.time, now), "today");
  assert.equal(sizesAge(ago(12), en.time, now), "12 days ago");
  assert.equal(sizesAge(ago(40), en.time, now), "a month ago");
  assert.equal(sizesAge(ago(400), en.time, now), "over a year ago");
});

test("the age of the sizes reads as Danish", () => {
  assert.equal(sizesAge(ago(0), da.time, now), "i dag");
  assert.equal(sizesAge(ago(1), da.time, now), "i går");
  assert.equal(sizesAge(ago(12), da.time, now), "for 12 dage siden");
  assert.equal(sizesAge(ago(40), da.time, now), "for en måned siden");
  assert.equal(sizesAge(ago(125), da.time, now), "for 4 måneder siden");
  assert.equal(sizesAge(ago(400), da.time, now), "for over et år siden");
});

test("a child's sizes go stale after half a year; an adult's never", () => {
  assert.ok(!sizesStale(ago(100), false, now));
  assert.ok(sizesStale(ago(200), false, now));
  assert.ok(!sizesStale(ago(800), true, now));
});
