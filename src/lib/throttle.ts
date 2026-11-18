/**
 * Backoff on wrong passwords, per account, in memory (one process). A wrong
 * guess doubles the wait, up to a minute — so guessing in parallel buys
 * nothing and costs no scrypt.
 *
 * Never a lockout: a stranger guessing once a minute would otherwise keep the
 * owner out for ever (Fable review). So during a wait, one attempt every two
 * seconds is still checked; the right code then gets in, and a guesser gets
 * one try per two seconds, which is no better than before.
 */
const state = new Map<number, { fails: number; nextAllowed: number; lastProbe: number }>();
const PROBE_MS = 2000;

/** Milliseconds to wait before this attempt may be checked; 0 means check it. */
export function waitMs(personId: number, now = Date.now()): number {
  const s = state.get(personId);
  if (!s || now >= s.nextAllowed) return 0;
  if (now - s.lastProbe >= PROBE_MS) {
    s.lastProbe = now;
    return 0;
  }
  return Math.max(PROBE_MS - (now - s.lastProbe), 1);
}

export function recordFailure(personId: number, now = Date.now()): void {
  const prev = state.get(personId);
  const fails = (prev?.fails ?? 0) + 1;
  state.set(personId, {
    fails,
    nextAllowed: now + Math.min(500 * 2 ** fails, 60_000),
    lastProbe: prev?.lastProbe ?? 0,
  });
}

export function recordSuccess(personId: number): void {
  state.delete(personId);
}

/**
 * Per address, on top of the per-account backoff (Fable review, 2026-11-16):
 * a login costs ~40 ms of scrypt, so without this an anonymous stranger could
 * keep the app busy for everyone. Past the limit an address gets the ordinary
 * "wrong" answer without a check — no scrypt spent, nothing told.
 */
const IP_WINDOW_MS = 10 * 60_000;
// A household shares one address: a child mistyping must not lock the parents
// out (Fable, second review). 50 is far below what guessing needs.
const IP_LIMIT = 50;
const byIp = new Map<string, number[]>();

export function ipBlocked(ip: string, now = Date.now()): boolean {
  const recent = (byIp.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  byIp.set(ip, recent);
  if (byIp.size > 10_000) byIp.clear(); // a flood of addresses must not become a memory leak
  return recent.length >= IP_LIMIT;
}

export function recordIpFailure(ip: string, now = Date.now()): void {
  byIp.set(ip, [...(byIp.get(ip) ?? []), now]);
}
