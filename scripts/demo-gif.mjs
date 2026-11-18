// The animation at the top of the README (docs/screenshots/demo.gif): a guest
// reserves a gift, and its owner sees nothing. Frames from the English demo
// family (scripts/seed-demo.ts) on a running server, put together by
// scripts/demo-gif.py.
//
//   HUSHLIST_DB_PATH=/tmp/gif/hushlist.db npx tsx scripts/seed-demo.ts   # a FRESH database
//   HUSHLIST_DB_PATH=/tmp/gif/hushlist.db npm run dev
//   node scripts/demo-gif.mjs http://localhost:3000 /f/<family token> /tmp/gif/frames
//   python3 scripts/demo-gif.py /tmp/gif/frames docs/screenshots/demo.gif
//
// PLAYWRIGHT=<path to the playwright package> uses one installed elsewhere.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");

const [, , base, familyPath, outDir] = process.argv;
if (!base || !familyPath || !outDir) {
  console.error("usage: node scripts/demo-gif.mjs <base url> /f/<family token> <frames dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const frames = [];
const browser = await chromium.launch();
const phone = { viewport: { width: 390, height: 760 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

/** A caption over the bottom of the page, the same on every frame of a scene. */
async function caption(page, text) {
  await page.evaluate((text) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;left:12px;right:12px;bottom:14px;z-index:99999;padding:12px 16px;border-radius:14px;" +
        "background:rgba(31,27,22,.92);color:#fff;font:600 17px/1.35 -apple-system,system-ui,sans-serif;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = text ? "block" : "none";
  }, text);
}

async function frame(page, ms) {
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  // Pictures fade in after loading; a scene's first frame waits for that.
  if (ms >= 1000) await page.waitForTimeout(700);
  const file = `${String(frames.length).padStart(3, "0")}.png`;
  await page.screenshot({ path: path.join(outDir, file) });
  frames.push({ file, ms });
}

// 1. Grandma opens the family link for the first time and says who she is.
const guest = await browser.newContext(phone);
const g = await guest.newPage();
await g.goto(base + familyPath, { waitUntil: "networkidle" });
await caption(g, "Grandma opens the family link. No account, just a first name.");
await frame(g, 2200);
const nameField = g.locator('input[name="name"]');
for (const part of ["G", "Gr", "Gran", "Grand", "Grandm", "Grandma"]) {
  await nameField.fill(part);
  await frame(g, 160);
}
await frame(g, 600);
await nameField.press("Enter");
await g.waitForLoadState("networkidle");

// 2. On Sam's list she reserves the headphones.
await g.getByRole("link", { name: "Sam", exact: true }).first().click();
await g.waitForLoadState("networkidle");
await caption(g, "She reserves the headphones on Sam's list…");
await frame(g, 2200);
const card = g.locator("li, article, div").filter({ hasText: "Noise-cancelling headphones" }).filter({ has: g.getByRole("button", { name: "Reserve" }) }).last();
await card.getByRole("button", { name: "Reserve" }).click();
await g.waitForLoadState("networkidle");
await g.waitForTimeout(400);
await caption(g, "…so nobody else buys them too.");
await frame(g, 2600);

// 3. Sam opens his own list: not a trace of it.
const owner = await browser.newContext(phone);
const s = await owner.newPage();
await s.goto(base + "/?login", { waitUntil: "networkidle" });
await s.fill('input[name="username"]', "Sam");
await s.fill('input[name="password"]', "demo-code-1234");
await s.locator('input[name="password"]').press("Enter");
await s.waitForURL(/\/liste\//);
await s.waitForLoadState("networkidle");
await caption(s, "Sam opens his own list. Nothing shows. The surprise holds.");
await frame(s, 3400);
await caption(s, "Hushlist: self-hosted, no tracking, no ads.");
await frame(s, 2600);

writeFileSync(path.join(outDir, "frames.json"), JSON.stringify(frames, null, 1));
console.log(`${frames.length} frames in ${outDir}`);
await browser.close();
