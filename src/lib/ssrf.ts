import dns from "node:dns";
import net from "node:net";

/**
 * What the app may connect to when it fetches a pasted link: the public
 * internet, never the house. Used by every connection the fetchers open —
 * safe-fetch's own requests and got-scraping's (browser-request.ts).
 */

export class BlockedAddressError extends Error {}

/**
 * Everything that is not the public internet. net.BlockList, not string
 * matching: it understands every IPv6 spelling, including IPv4-mapped
 * addresses in hex (::ffff:c0a8:10a is 192.168.1.10) — the hand-rolled first
 * version matched only the dotted form and let that one through (Fable review,
 * 2026-11-15). It also matches IPv4-mapped addresses against the IPv4 rules,
 * so there is no ::ffff:0:0/96 rule here: that one blocks all of IPv4.
 */
const BLOCKED = new net.BlockList();
for (const [base, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT, and the tailnet
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  BLOCKED.addSubnet(base, bits, "ipv4");
}
for (const [base, bits] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96], // NAT64
  ["64:ff9b:1::", 48],
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["fc00::", 7], // unique local, and Tailscale's fd7a:
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated, still routable in a LAN)
  ["ff00::", 8], // multicast
] as const) {
  BLOCKED.addSubnet(base, bits, "ipv6");
}

export function isBlockedAddress(ip: string): boolean {
  const bare = ip.replace(/^\[|\]$/g, "");
  if (net.isIPv4(bare)) return BLOCKED.check(bare, "ipv4");
  if (net.isIPv6(bare)) return BLOCKED.check(bare, "ipv6");
  return true;
}

export const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isBlockedAddress(a.address));
    if (bad || list.length === 0) {
      return callback(new BlockedAddressError(`blocked address for ${hostname}`), "", 0);
    }
    if ((options as dns.LookupOptions).all) return callback(null, list as never, 0);
    callback(null, list[0].address, list[0].family);
  });
};

