import fs from "node:fs";

import { getT } from "@/i18n/server";
import { signedShortcutPath } from "@/lib/db";

/**
 * The signed Shortcut, from the data directory. It holds no secret (the key is
 * asked for on import), so no login, as when it was a file in public/.
 */
export async function GET() {
  try {
    return new Response(fs.readFileSync(signedShortcutPath()), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${getT().shell.shortcutFile}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
