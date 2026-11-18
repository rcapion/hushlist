import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getT } from "@/i18n/server";
import { publicUrl } from "@/lib/config";
import * as db from "@/lib/db";
import { MAX_UPLOAD_BYTES, deleteImage, saveUploadedImage } from "@/lib/product";
import { SESSION_COOKIE } from "@/lib/session";
import { canManage } from "@/lib/visibility";

/**
 * A picture for a wish: the body is the image itself, already shrunk to a small
 * JPEG in the browser (wish-image-upload.tsx).
 *
 * A route, not a server action (Fable review, 2026-11-16): Next reads an
 * action's whole body before the action can ask who is calling, so an upload
 * action meant a 1.6 MB body limit for every action, open to anyone. Here who
 * and how big are settled from the headers first, and the body is read only
 * for a member who may edit this wish, and only up to the limit.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/billeder/[wishId]">) {
  const t = getT().server.upload;
  // Same site only. The session cookie is SameSite=Lax, so another site's POST
  // arrives without it anyway; this says so out loud.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null; // "null" (a sandboxed page) and garbage: not us
    }
    if (originHost !== host && originHost !== publicUrl()?.host) return Response.json({ error: t.forbidden }, { status: 403 });
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const member = token ? db.personBySession(token) : null;
  if (!member) return Response.json({ error: t.logInAgain }, { status: 401 });

  const wishId = Number((await ctx.params).wishId);
  const ownerId = Number.isInteger(wishId) && wishId > 0 ? db.wishOwner(wishId) : null;
  const owner = ownerId ? db.getPerson(ownerId) : null;
  if (!owner || !canManage(member, owner)) return Response.json({ error: t.notYours }, { status: 403 });

  // A declared size over the limit is refused at once; a missing one (chunked)
  // is fine — the loop below stops at the limit either way.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) return Response.json({ error: t.tooLarge }, { status: 413 });

  // Read no further than the limit, whatever the header said.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: t.pickImage }, { status: 400 });
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      return Response.json({ error: t.tooLarge }, { status: 413 });
    }
    chunks.push(value);
  }

  if (size === 0) return Response.json({ error: t.pickImage }, { status: 400 });
  const name = saveUploadedImage(Buffer.concat(chunks), db.DATA_DIR);
  if (!name) return Response.json({ error: t.notAnImage }, { status: 415 });
  deleteImage(db.setWishImage(wishId, name), db.DATA_DIR);
  revalidatePath(`/liste/${owner.id}`);
  return Response.json({ ok: true });
}
