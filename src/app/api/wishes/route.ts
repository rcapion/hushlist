import { revalidatePath } from "next/cache";

import { getPerson, listPeople, personByApiKey } from "@/lib/db";
import { getT } from "@/i18n/server";
import { addableLists, canManage } from "@/lib/visibility";
import { createWishFromInput } from "@/lib/wishes";

/** A shop page's <head> runs to 100–300 kB; the whole DOM is not wanted. */
const MAX_BODY = 600_000;

/**
 * For the Apple Shortcut in the share sheet:
 *
 *   POST /api/wishes
 *   Authorization: Bearer <key from Indstillinger>
 *   {"url": "https://…", "til": "Ida"}         ← "til" optional: a child's name
 *   {"url": …, "html": "<meta …>…"}            ← "html" optional: from Safari,
 *       the page's <head> and JSON-LD as the phone saw it (docs/DESIGN.md)
 *
 * Answers with a short sentence, in the household's language, the Shortcut can show as a notification.
 */
function keyHolder(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const key = auth.match(/^Bearer\s+(\S+)$/i)?.[1];
  return key ? personByApiKey(key) : null;
}

/**
 * The downloadable Shortcut asks first which list, when there is a choice:
 *
 *   GET /api/wishes   →   {"lists": ["Mads", "Ida", "Oskar"]}
 *
 * A wrong key answers an empty list; the POST after it then says "Forkert nøgle."
 */
export async function GET(request: Request) {
  const adult = keyHolder(request);
  if (!adult) return Response.json({ message: getT().server.api.wrongKey, lists: [] }, { status: 401 });
  return Response.json({ lists: addableLists(adult, listPeople()).map((p) => p.name) });
}

export async function POST(request: Request) {
  const t = getT().server.api;
  const adult = keyHolder(request);
  if (!adult) return Response.json({ message: t.wrongKey }, { status: 401 });

  let body: { url?: unknown; text?: unknown; til?: unknown; html?: unknown };
  try {
    // A link, a name and a page's head; anything larger is not from the Shortcut.
    const raw = await request.text();
    if (raw.length > MAX_BODY) return Response.json({ message: t.tooLarge }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ message: t.expectedJson }, { status: 400 });
  }
  const input = [body.url, body.text].filter((x) => typeof x === "string" && x.trim()).join(" ").slice(0, 2000);
  if (!input) return Response.json({ message: t.noLink }, { status: 400 });

  let owner = getPerson(adult.id)!;
  if (typeof body.til === "string" && body.til.trim()) {
    const wanted = body.til.trim().toLowerCase();
    const match = listPeople().find((p) => p.name.toLowerCase() === wanted);
    if (!match || !canManage(adult, match)) {
      return Response.json({ message: t.unknownList(body.til) }, { status: 400 });
    }
    owner = match;
  }

  const html = typeof body.html === "string" && body.html.trim() ? body.html : undefined;
  const { id, fetched } = await createWishFromInput(owner.id, input, html);
  revalidatePath(`/liste/${owner.id}`);
  const where = owner.id === adult.id ? t.ownList : t.listOf(owner.name);
  return Response.json({
    message: fetched ? t.added(where) : t.addedUnfetched(where),
    id,
  });
}
