import "server-only";

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { publicUrl } from "@/lib/config";
import { isGuestId } from "@/lib/visibility";
import { createSession, deleteSession, isFamilyToken, personBySession, type Person } from "@/lib/db";

export const SESSION_COOKIE = "ol_session";
export const GUEST_ID_COOKIE = "ol_guest";
export const GUEST_NAME_COOKIE = "ol_name";
export const FAMILY_COOKIE = "ol_family";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Secure only over HTTPS. HUSHLIST_PUBLIC_URL decides it when set. Otherwise:
 * a tunnel or a Tailscale proxy terminates TLS in front of the
 * app and say so in X-Forwarded-Proto; the LAN port is plain HTTP, and a
 * Secure cookie there would simply never come back.
 */
async function secure(): Promise<boolean> {
  const configured = publicUrl();
  if (configured) return configured.protocol === "https:";
  const h = await headers();
  // Through the Cloudflare tunnel the visitor is always on https: cf-visitor
  // and CF-Connecting-IP say so even if X-Forwarded-Proto were ever missing.
  return (
    h.get("x-forwarded-proto") === "https" ||
    h.has("cf-connecting-ip") ||
    /"scheme":"https"/.test(h.get("cf-visitor") ?? "")
  );
}

/** The visitor's address: Cloudflare's word for it, else the first proxy hop. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

async function setCookie(name: string, value: string): Promise<void> {
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: await secure(),
    path: "/",
    maxAge: YEAR,
  });
}

/** Whoever is logged in: an adult, or a child with their own code. */
export async function currentMember(): Promise<Person | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? personBySession(token) : null;
}

export async function requireMember(): Promise<Person> {
  const person = await currentMember();
  if (!person) redirect("/");
  return person;
}

/** The household's settings: the family link, invitations, the children, keys. */
export async function requireAdult(): Promise<Person> {
  const person = await requireMember();
  if (!person.isAdult) redirect(`/liste/${person.id}`);
  return person;
}

export async function logIn(personId: number): Promise<void> {
  await setCookie(SESSION_COOKIE, createSession(personId));
}

export async function logOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(SESSION_COOKIE);
}

export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

// ── guests ──────────────────────────────────────────────────────────────────

export type Guest = { id: string | null; name: string | null };

function newGuestId(): string {
  return `g_${crypto.randomBytes(16).toString("base64url")}`;
}

export async function currentGuest(): Promise<Guest> {
  const jar = await cookies();
  const id = jar.get(GUEST_ID_COOKIE)?.value ?? null;
  const name = jar.get(GUEST_NAME_COOKIE)?.value;
  if (!id || !isGuestId(id)) return { id: null, name: null };
  let decoded: string | null = null;
  try {
    decoded = name ? decodeURIComponent(name).trim().slice(0, 40) || null : null;
  } catch {
    decoded = null;
  }
  return { id, name: decoded };
}

/** Returns the guest id now in force, so the same request can act on it. */
export async function setGuestName(name: string): Promise<string> {
  const jar = await cookies();
  let id = jar.get(GUEST_ID_COOKIE)?.value;
  if (!id || !isGuestId(id)) {
    id = newGuestId();
    await setCookie(GUEST_ID_COOKIE, id);
  }
  await setCookie(GUEST_NAME_COOKIE, encodeURIComponent(name));
  return id;
}

/**
 * The family link, remembered by a browser that has used it (Richard,
 * 2026-11-16): typing the bare domain later goes to the wishes, not to the
 * household's login. The same secret as the link, held where page script cannot
 * read it. Set from the guest actions — a page cannot set cookies — so a guest
 * is remembered from their first name or reservation. A rotated link stops
 * matching, and the browser simply sees the login page again.
 */
export async function rememberFamily(token: string): Promise<void> {
  await setCookie(FAMILY_COOKIE, token);
}

export async function rememberedFamilyToken(): Promise<string | null> {
  const token = (await cookies()).get(FAMILY_COOKIE)?.value;
  return token && isFamilyToken(token) ? token : null;
}

/**
 * Every guest route and action checks the token itself; there is no proxy gate.
 * A wrong token is a plain 404, not a hint that the path exists.
 */
export function requireFamilyToken(token: string): void {
  if (!isFamilyToken(token)) notFound();
}

/**
 * The address links are built from: HUSHLIST_PUBLIC_URL if set, else the one
 * the visitor used — the tunnel's name, the tailnet's, or the LAN's.
 */
export async function publicOrigin(): Promise<string> {
  const configured = publicUrl();
  if (configured) return configured.origin;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}
