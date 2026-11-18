// The screenshots in docs/screenshots, taken from the demo family
// (scripts/seed-demo.ts) on a running server. Needs Playwright with Chromium:
//
//   npm i --no-save playwright && npx playwright install chromium
//   node scripts/screenshots.mjs http://localhost:3000 /f/<family token> docs/screenshots [en|da]
//
// PLAYWRIGHT=<path to the playwright package> uses one installed elsewhere.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");

const [, , base, familyPath, outDir = "docs/screenshots", lang = "en"] = process.argv;
// The demo family's names (scripts/seed-demo.ts): who logs in, whose list is
// shown, and the guest the family link is opened as.
const NAMES = { en: { adult: "Sam", child: "Lily", guest: "Grandma" }, da: { adult: "Mads", child: "Ida", guest: "Farmor" } }[lang];
if (!base || !familyPath) {
  console.error("usage: node scripts/screenshots.mjs <base url> /f/<family token> [out dir]");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const host = new URL(base).hostname;
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const browser = await chromium.launch();

async function shot(ctx, url, name, { full = false } = {}) {
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: full });
  console.log(`${name}.png`);
  return page;
}

// A guest's first visit: one question.
const first = await browser.newContext(phone);
await shot(first, familyPath, "welcome");

// The first guest, who has been here before and reserved the paints.
const farmor = await browser.newContext(phone);
await farmor.addCookies([
  { name: "ol_guest", value: "g_demo-farmor-0000000000", domain: host, path: "/" },
  { name: "ol_name", value: encodeURIComponent(NAMES.guest), domain: host, path: "/" },
]);
const guestPage = await farmor.newPage();
await guestPage.goto(base + familyPath, { waitUntil: "networkidle" });
// A child's list, from the name row: the one where reservations show.
await guestPage.getByRole("link", { name: NAMES.child, exact: true }).first().click();
await guestPage.waitForLoadState("networkidle");
await guestPage.screenshot({ path: path.join(outDir, "guest-list.png"), fullPage: true });
console.log("guest-list.png");

// An adult, logged in: their own list shows nothing of what is reserved.
const adult = await browser.newContext(phone);
const login = await adult.newPage();
await login.goto(base + "/?login", { waitUntil: "networkidle" });
await login.fill('input[name="username"]', NAMES.adult);
await login.fill('input[name="password"]', "demo-code-1234");
await login.locator('input[name="password"]').press("Enter");
await login.waitForURL(/\/liste\//);
const ownUrl = new URL(login.url()).pathname;
await shot(adult, ownUrl, "own-list", { full: true });
await shot(adult, "/indstillinger", "settings");

// The print view of a child's list, as a parent sees it: A4 on a desk.
const desk = await browser.newContext({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 1.5 });
await desk.addCookies((await adult.cookies()).map((c) => ({ ...c })));
const lists = await (await adult.newPage()).goto(base + ownUrl).then((r) => r.text());
const childId = [...lists.matchAll(new RegExp(`href="/liste/(\\d+)"[^>]*>(?:<[^>]+>)*${NAMES.child}`, "g"))][0]?.[1];
if (childId) {
  const print = await desk.newPage();
  await print.emulateMedia({ media: "print" });
  await print.goto(`${base}/liste/${childId}/print`, { waitUntil: "networkidle" });
  await print.addStyleTag({ content: "body { padding: 48px 56px !important; background: #fff; }" });
  await print.screenshot({ path: path.join(outDir, "print.png"), clip: { x: 0, y: 0, width: 1000, height: 560 } });
  console.log("print.png");
}

await browser.close();
