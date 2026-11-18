import net from "node:net";

import { browserRequest } from "@/lib/browser-request";

/**
 * Fetching a URL someone pasted, from a server on the house LAN. Without a
 * guard, "https://shop.example/x" that resolves to 192.168.1.10 reads the
 * NAS, Home Assistant or the router on our behalf (SSRF).
 *
 * The check runs in the socket's DNS lookup, i.e. on the address actually
 * connected to, and again on every redirect hop — checking a hostname before
 * fetch() and then letting fetch() resolve it again is the classic hole
 * (DNS rebinding).
 */

import { BlockedAddressError, guardedLookup, isBlockedAddress } from "@/lib/ssrf";

export { BlockedAddressError, guardedLookup, isBlockedAddress };

export type FetchResult = {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
};

/**
 * Cookies set along one chain of redirects, sent back on the next hop — what
 * curl's cookie jar does for wishthis, and what every browser does. Many shops
 * answer a first visit with a redirect that sets a cookie and refuse the
 * client that comes back without it. Kept per host, for one fetch only.
 */
export class CookieJar {
  private jar = new Map<string, Map<string, string>>();

  store(host: string, setCookie: string[] | undefined): void {
    for (const line of setCookie ?? []) {
      const [pair, ...attrs] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const domain = attrs
        .map((a) => a.trim().match(/^domain=\.?(.+)$/i)?.[1]?.toLowerCase())
        .find(Boolean);
      // A cookie may name its own host or a parent of it, never a stranger.
      const target = domain && (host === domain || host.endsWith(`.${domain}`)) ? domain : host;
      if (!this.jar.has(target)) this.jar.set(target, new Map());
      this.jar.get(target)!.set(name, value);
    }
  }

  header(host: string): string | undefined {
    const pairs: string[] = [];
    for (const [domain, cookies] of this.jar) {
      if (host !== domain && !host.endsWith(`.${domain}`)) continue;
      for (const [name, value] of cookies) pairs.push(`${name}=${value}`);
    }
    return pairs.length ? pairs.join("; ") : undefined;
  }
}

export async function safeFetch(
  rawUrl: string,
  { maxBytes = 3_000_000, timeoutMs = 8000, accept = "text/html,*/*;q=0.8" } = {},
): Promise<FetchResult> {
  let url = new URL(rawUrl);
  const deadline = Date.now() + timeoutMs;
  const cookies = new CookieJar();

  for (let hop = 0; hop < 6; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new BlockedAddressError(`protocol ${url.protocol}`);
    }
    if (url.port && !["80", "443"].includes(url.port)) {
      throw new BlockedAddressError(`port ${url.port}`);
    }
    // A literal IP never goes through lookup, so check it here. No shop links
    // to an IPv6 literal; refusing them all closes every spelling at once.
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIPv6(host)) throw new BlockedAddressError(`IPv6 literal ${host}`);
    if (net.isIPv4(host) && isBlockedAddress(host)) {
      throw new BlockedAddressError(`blocked address ${host}`);
    }

    const res = await browserRequest(url, accept, maxBytes, deadline - Date.now(), cookies.header(host));
    cookies.store(host, res.setCookie);
    if (res.status >= 300 && res.status < 400 && res.location) {
      url = new URL(res.location, url);
      continue;
    }
    return { url: url.toString(), status: res.status, contentType: res.contentType, body: res.body };
  }
  throw new Error("too many redirects");
}
