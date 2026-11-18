/**
 * A made-up family with wishes and reservations, to try the app or take the
 * screenshots in docs/screenshots. NEVER point it at a real database: it
 * refuses one that already has people in it.
 *
 *   HUSHLIST_DB_PATH=/tmp/demo/hushlist.db npx tsx scripts/seed-demo.ts [--lang=da]
 *   HUSHLIST_DB_PATH=/tmp/demo/hushlist.db npm run dev
 *
 * English by default; --lang=da makes the Danish family the app was built for.
 *
 * Prints the family link and the logins. The pictures are emoji drawn on a
 * tile (Noto Color Emoji, SIL Open Font License), in scripts/demo/.
 */
import fs from "node:fs";
import path from "node:path";

import * as db from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { saveUploadedImage } from "../src/lib/product";
import { ownerGuestId } from "../src/lib/visibility";

if (!process.env.HUSHLIST_DB_PATH) {
  console.error("Set HUSHLIST_DB_PATH to a scratch database first.");
  process.exit(2);
}
if (db.listPeople().length > 0) {
  console.error(`${process.env.HUSHLIST_DB_PATH} already has people in it: not a scratch database.`);
  process.exit(1);
}

const demoDir = path.join(path.dirname(new URL(import.meta.url).pathname), "demo");
const picture = (name: string) => saveUploadedImage(fs.readFileSync(path.join(demoDir, `${name}.jpg`)), db.DATA_DIR);

const lang = process.argv.includes("--lang=da") ? "da" : "en";
db.setHouseholdLanguage(lang);

/** The same family in both languages. Names here must match scripts/screenshots.mjs. */
const DEMO = {
  da: {
    adults: ["Mads", "Anna"], children: ["Ida", "Oskar"], guests: ["Farmor", "Morfar", "Moster Lise"],
    sizes: ["Tøj 146/152 · sko 35", "Tøj 122 · sko 30 · handsker 5"],
    child1: [["Rulleskøjter, justerbare", "skates", "499 kr.", "Gerne lilla"], ["Akvarelsæt med 24 farver", "paint", "229 kr."], ["Bogserie om Ronja", "book", "149 kr."], ["Instant-kamera", "camera", "649 kr.", "Med film"], ["Telt til haven", "tent", "399 kr."]],
    child2: [["Byggeklodser, stor kasse", "lego", "349 kr."], ["Løbecykel", "bike", "799 kr."], ["Bamse", "teddy", "199 kr.", "Den bløde, ikke den med lyd"]],
    adult2: [["Hørtørklæde", "scarf", "349 kr."], ["Monstera i krukke", "plant", "279 kr."]],
    adult1: [["Støjreducerende hovedtelefoner", "headphones", "1.499 kr."], ["Kaffekværn", "coffee", "899 kr."]],
  },
  en: {
    adults: ["Sam", "Emma"], children: ["Lily", "Leo"], guests: ["Grandma", "Grandpa", "Aunt Lucy"],
    sizes: ["Clothes 11–12 years · shoes UK 2.5", "Clothes 6–7 years · shoes UK 11.5 · gloves 5"],
    child1: [["Adjustable roller skates", "skates", "£45", "Purple, if possible"], ["Watercolour set, 24 colours", "paint", "£19"], ["The Moomins book series", "book", "£14"], ["Instant camera", "camera", "£59", "With film"], ["Garden tent", "tent", "£35"]],
    child2: [["Building bricks, big box", "lego", "£32"], ["Balance bike", "bike", "£69"], ["Teddy bear", "teddy", "£18", "The soft one, not the one that talks"]],
    adult2: [["Linen scarf", "scarf", "£32"], ["Monstera in a pot", "plant", "£25"]],
    adult1: [["Noise-cancelling headphones", "headphones", "£139"], ["Coffee grinder", "coffee", "£79"]],
  },
}[lang];

const PASSWORD = "demo-code-1234";
const [adult1, adult2] = DEMO.adults.map((n) => db.addPerson(n, true));
const [child1, child2] = DEMO.children.map((n) => db.addPerson(n, false));
db.claimFirstPassword(adult1.id, hashPassword(PASSWORD));
db.setPasswordHash(adult2.id, hashPassword(PASSWORD));
db.setBirthday(child1.id, "03-10");
db.setSizes(child1.id, DEMO.sizes[0]);
db.setSizes(child2.id, DEMO.sizes[1]);

/** [title, picture, price, note?]; the first wish on each list is the biggest one. */
const wishes = (personId: number, rows: string[][]) =>
  rows.map(([title, pic, price, note], i) =>
    db.addWish(personId, { title, url: `https://example.com/${pic}`, price, imagePath: picture(pic), note, favourite: i === 0 && personId !== adult2.id }),
  );
const child1Wishes = wishes(child1.id, DEMO.child1);
const child2Wishes = wishes(child2.id, DEMO.child2);
const adult2Wishes = wishes(adult2.id, DEMO.adult2);
const adult1Wishes = wishes(adult1.id, DEMO.adult1);

// The guests' reservations. The screenshots are taken as the first guest,
// whose browser cookie is GUEST (scripts/screenshots.mjs).
const GUEST = "g_demo-farmor-0000000000";
db.reserve(child1Wishes[1], DEMO.guests[0], GUEST);
db.reserve(child1Wishes[3], DEMO.guests[1], "g_demo-morfar-0000000000");
db.reserve(child2Wishes[1], DEMO.guests[2], "g_demo-lise-000000000000");
db.reserve(adult1Wishes[1], adult2.name, ownerGuestId(adult2.id));
db.reserve(adult2Wishes[0], adult1.name, ownerGuestId(adult1.id));

console.log(`Demo family in ${process.env.HUSHLIST_DB_PATH}`);
console.log(`  Family link: /f/${db.familyToken()}`);
console.log(`  Logins: ${adult1.name} or ${adult2.name}, code ${PASSWORD}`);
