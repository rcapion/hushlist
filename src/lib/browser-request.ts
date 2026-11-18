import tls from "node:tls";

import { gotScraping } from "got-scraping";
import http2Wrapper from "http2-wrapper";

import { egressProxy } from "@/lib/config";
import { guardedLookup } from "@/lib/ssrf";

/**
 * One HTTP exchange that looks like a desktop browser: browser-generated
 * headers, a browser's TLS cipher list, and HTTP/2 where the shop offers it.
 * This is got-scraping, as cmintey/wishlist uses it — chosen by Richard on
 * 2026-11-16 to get past shops that refuse a server (shop.tesla.com, lego.com,
 * proshop.dk). It is deliberate: those shops block bots, and this is built to
 * not look like one. One fetch per wish a person adds, nothing more.
 *
 * THE SSRF GUARD HAS TO BE PUT BACK IN BY HAND. got-scraping opens its own TLS
 * connection first to learn whether the server speaks HTTP/2 (ALPN), and that
 * probe does its own DNS — so a link to a name resolving to the LAN would get
 * a TLS handshake from us before any check ran. Both places that connect get
 * guardedLookup: `dnsLookup` for the request, and our own `resolveProtocol`
 * for the probe. test/browser-request.test.ts proves it on a real TLS server
 * on localhost: it must see no connection at all.
 *
 * Redirects are not followed here; safeFetch walks them, re-checking each hop.
 */

export type RawResponse = {
  status: number;
  location?: string;
  setCookie?: string[];
  contentType: string;
  body: Buffer;
};

/** The ALPN probe, with our lookup. Same shape as http2-wrapper's resolveProtocol. */
async function guardedResolveProtocol(options: {
  host: string;
  port: number | string;
  servername?: string;
  ALPNProtocols: string[];
}): Promise<{ alpnProtocol: string }> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: options.host,
      port: Number(options.port),
      servername: options.servername ?? options.host,
      ALPNProtocols: options.ALPNProtocols,
      lookup: guardedLookup,
      timeout: 5000,
    });
    socket.once("secureConnect", () => {
      const alpnProtocol = socket.alpnProtocol || "http/1.1";
      socket.destroy();
      resolve({ alpnProtocol });
    });
    socket.once("timeout", () => socket.destroy(new Error("ALPN probe timeout")));
    socket.once("error", reject);
  });
}

// got-scraping calls `http2Wrapper.auto.resolveProtocol(...)` for its probe,
// looked up at call time, and offers no option to replace it (an unknown
// option is an error in got). So it is replaced here, once, for the process.
// test/browser-request.test.ts is what says this still holds after an upgrade.
(http2Wrapper.auto as unknown as { resolveProtocol: typeof guardedResolveProtocol }).resolveProtocol =
  guardedResolveProtocol;

export async function browserRequest(
  url: URL,
  accept: string,
  maxBytes: number,
  timeoutMs: number,
  cookie?: string,
): Promise<RawResponse> {
  if (timeoutMs <= 0) throw new Error("timeout");

  // In production the app sits on an internal network and reaches the internet
  // only through the egress proxy (deploy/*/compose.yaml), which refuses every
  // private address itself — so there the proxy is the guard, and our lookup
  // must stay out of the way (it would refuse the proxy's own 172.x address).
  // Without a proxy (tests, a laptop) guardedLookup and the patched ALPN probe
  // below do the job, as before.
  const proxyUrl = egressProxy();
  const stream = gotScraping.stream({
    url: url.toString(),
    method: "GET",
    followRedirect: false,
    throwHttpErrors: false,
    decompress: true,
    ...(proxyUrl ? { proxyUrl } : { dnsLookup: guardedLookup }),
    timeout: { request: timeoutMs },
    headerGeneratorOptions: {
      browsers: ["chrome", "firefox", "safari"],
      devices: ["desktop"],
      locales: ["da-DK", "da", "en"],
      operatingSystems: ["macos", "windows"],
    },
    headers: {
      accept,
      ...(cookie ? { cookie } : {}),
    },
  } as never) as unknown as NodeJS.ReadableStream & {
    on(event: "response", cb: (res: { statusCode: number; headers: Record<string, string | string[] | undefined> }) => void): unknown;
    destroy(err?: Error): void;
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hard);
      fn();
    };
    // got's own timeout covers the request; this is the wall clock regardless.
    const hard = setTimeout(() => {
      stream.destroy(new Error("timeout"));
      finish(() => reject(new Error("timeout")));
    }, timeoutMs + 500);

    let status = 0;
    let headers: Record<string, string | string[] | undefined> = {};
    const chunks: Buffer[] = [];
    let size = 0;

    stream.on("response", (res) => {
      status = res.statusCode;
      headers = res.headers;
    });
    stream.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        stream.destroy();
        finish(() => resolve(result()));
        return;
      }
      chunks.push(chunk);
    });
    stream.on("end", () => finish(() => resolve(result())));
    stream.on("error", (err: Error) => finish(() => reject(err)));

    function result(): RawResponse {
      const setCookie = headers["set-cookie"];
      const location = headers.location;
      return {
        status,
        location: typeof location === "string" ? location : undefined,
        setCookie: Array.isArray(setCookie) ? setCookie : typeof setCookie === "string" ? [setCookie] : undefined,
        contentType: String(headers["content-type"] ?? ""),
        body: Buffer.concat(chunks),
      };
    }
  });
}
