import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import { browserRequest } from "../src/lib/browser-request";
import { isBlockedAddress, safeFetch } from "../src/lib/safe-fetch";

test("IPv4-mapped IPv6 in any spelling is the IPv4 address (Fable review)", () => {
  for (const ip of ["::ffff:c0a8:10a", "::ffff:7f00:1", "::ffff:192.168.1.10", "fec0::1", "64:ff9b::c0a8:10a"]) {
    assert.ok(isBlockedAddress(ip), ip);
  }
  assert.ok(!isBlockedAddress("8.8.8.8"), "the mapped range must not swallow all of IPv4");
});

test("IPv6 and private IPv4 literals never reach a socket", async () => {
  for (const u of ["http://[::ffff:7f00:1]:8080/", "http://[::1]/", "http://127.0.0.1/", "http://0x7f000001/", "http://2130706433/"]) {
    await assert.rejects(safeFetch(u), u);
  }
});

test("a server that drips bytes is cut off by the wall clock, not just the idle timer", { timeout: 5000 }, async () => {
  const server = http.createServer((_, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    const t = setInterval(() => res.write("x"), 100);
    res.on("close", () => clearInterval(t));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const started = Date.now();
  await assert.rejects(browserRequest(new URL(`http://127.0.0.1:${port}/`), "*/*", 1_000_000, 800));
  assert.ok(Date.now() - started < 2000, `took ${Date.now() - started} ms`);
  server.close();
});

test("cookies from a redirect go back on the next hop, and only to that site", async () => {
  const { CookieJar } = await import("../src/lib/safe-fetch");
  const jar = new CookieJar();
  jar.store("www.shop.dk", ["session=abc; Path=/; HttpOnly", "bm=1; Domain=.shop.dk; Secure"]);
  jar.store("www.shop.dk", ["evil=1; Domain=bank.dk"]); // a stranger's domain is pinned to the host
  assert.deepEqual(jar.header("www.shop.dk")?.split("; ").sort(), ["bm=1", "evil=1", "session=abc"]);
  assert.equal(jar.header("cdn.shop.dk"), "bm=1");
  assert.equal(jar.header("bank.dk"), undefined);
});
