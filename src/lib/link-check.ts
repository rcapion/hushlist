import { TIME_ZONE } from "@/lib/config";
import { flaggedLinkCount, linksToCheck, recordLinkVerdict, saveLinkCheckRun } from "@/lib/db";
import { decodeBody, describe, displayHost } from "@/lib/product";
import { safeFetch } from "@/lib/safe-fetch";
import { linkVerdict, parseAvailability, type LinkVerdict } from "@/lib/link-verdict";

/** Calm, one shop at a time: a few dozen links a night, nobody's server notices. */
const PAUSE_MS = 3000;

async function checkOne(url: string): Promise<LinkVerdict> {
  try {
    const res = await safeFetch(url, { timeoutMs: 15_000 });
    const html = res.status < 300 && /html/i.test(res.contentType) ? decodeBody(res.body, res.contentType) : "";
    return linkVerdict(res.status, html ? parseAvailability(html) : null);
  } catch (err) {
    console.warn(`link-check ${displayHost(url)}: ${describe(err)}`);
    return "unknown";
  }
}

let running = false;

/** Every link once; the run is stamped at the end, for /api/health and the deadman. */
export async function runLinkCheck(pause = PAUSE_MS): Promise<void> {
  if (running) return;
  running = true;
  try {
    let unknown = 0;
    const links = linksToCheck();
    for (const { id, url } of links) {
      const verdict = await checkOne(url);
      if (verdict === "unknown") unknown++;
      recordLinkVerdict(id, verdict);
      if (pause) await new Promise((r) => setTimeout(r, pause));
    }
    const run = { at: new Date().toISOString(), checked: links.length, flagged: flaggedLinkCount(), unknown };
    saveLinkCheckRun(run);
    console.log(`link-check: ${run.checked} links, ${run.flagged} flagged, ${run.unknown} unknown`);
  } finally {
    running = false;
  }
}

/** The night, in the app's time zone: from 03:00, once a day. */
export function linkCheckDue(lastAt: string | null, now = new Date()): boolean {
  const day = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });
  const hour = Number(now.toLocaleString("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }));
  if (hour < 3) return false;
  return !lastAt || day(new Date(lastAt)) !== day(now);
}
