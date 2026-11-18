import fs from "node:fs";

import { getT } from "@/i18n/server";
import { signedShortcutPath } from "@/lib/db";
import { contentDisposition } from "@/lib/text";

/**
 * The signed Shortcut, from the data directory. It holds no secret (the key is
 * asked for on import), so no login, as when it was a file in public/.
 */
export async function GET() {
  try {
    return new Response(fs.readFileSync(signedShortcutPath()), {
      headers: {
        "Content-Type": "application/octet-stream",
        // iOS names the imported Shortcut after the file. filename* carries the
        // real name (Ø and all, RFC 6266); filename is the ASCII fallback.
        "Content-Disposition": contentDisposition(getT().shell.shortcutFile),
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
