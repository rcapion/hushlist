import fs from "node:fs";
import path from "node:path";

import { DATA_DIR } from "@/lib/db";
import { imageContentType, imageDir, isImageName } from "@/lib/product";

/**
 * Pictures are unguessable names (96 random bits) and served without a login:
 * the guest view needs them, and an <img> cannot carry the family token
 * without leaking it into every request log on the way.
 */
export async function GET(_: Request, ctx: RouteContext<"/billeder/[name]">) {
  const { name } = await ctx.params;
  if (!isImageName(name)) return new Response("Not found", { status: 404 });
  try {
    const body = fs.readFileSync(path.join(imageDir(DATA_DIR), name));
    return new Response(body, {
      headers: {
        "Content-Type": imageContentType(name),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
