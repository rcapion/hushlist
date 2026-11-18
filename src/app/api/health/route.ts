import fs from "node:fs";
import path from "node:path";

import { lastLinkCheckRun, listPeople } from "@/lib/db";
import { describe } from "@/lib/product";
import { safeFetch } from "@/lib/safe-fetch";

export const dynamic = "force-dynamic";

// A fixed address, so this cannot be turned into a fetch of anything else.
const EGRESS_PROBE = "https://example.com/";
const EGRESS_EVERY_MS = 10 * 60_000;
let lastEgress: { at: number; result: string } | null = null;

/**
 * Touches the database, so a healthy answer means the data mount works, and
 * names the release it runs, so a deploy can compare it with the commit it
 * shipped instead of trusting a green light. RELEASE is a file beside
 * server.js holding the commit; the Dockerfile writes it if the build is given
 * one (build arg RELEASE), and it is absent in development.
 *
 * ?egress=1 also fetches one fixed page through the same guarded fetcher the
 * wishes use: "can this container reach the internet at all" without a login.
 */
export async function GET(request: Request) {
  let release: string | null = null;
  try {
    release = fs.readFileSync(path.join(process.cwd(), "RELEASE"), "utf8").trim();
  } catch {
    release = null;
  }

  let egress: string | undefined;
  // Not from the internet: through the Cloudflare tunnel every request carries
  // CF-Connecting-IP, and a stranger has no business making us fetch anything.
  // The container's own healthcheck asks (it is the only other caller since the
  // app sits on an internal network), so the answer — through the egress proxy —
  // shows in `docker inspect`. Probed at most every ten minutes. Behind any
  // other proxy a stranger can ask too; the cache is what bounds it then.
  const fromTunnel = request.headers.has("cf-connecting-ip");
  if (!fromTunnel && new URL(request.url).searchParams.get("egress") === "1") {
    // A success is trusted for ten minutes, a failure for one: a proxy that
    // has just come up must not look broken for ten more (Fable).
    const ttl = lastEgress?.result.startsWith("HTTP 200") ? EGRESS_EVERY_MS : 60_000;
    if (!lastEgress || Date.now() - lastEgress.at > ttl) {
      let result: string;
      try {
        const res = await safeFetch(EGRESS_PROBE, { timeoutMs: 5000 });
        result = `HTTP ${res.status}, ${res.body.length} B`;
      } catch (err) {
        result = describe(err);
      }
      lastEgress = { at: Date.now(), result };
    }
    egress = lastEgress.result;
  }

  try {
    listPeople();
    // The last nightly link check, for a monitor to watch: null until the first.
    return Response.json({ ok: true, release, egress, linkCheck: lastLinkCheckRun() });
  } catch {
    return Response.json({ ok: false, release, egress }, { status: 503 });
  }
}
