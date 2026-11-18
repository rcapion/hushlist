import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import test from "node:test";

import { browserRequest } from "../src/lib/browser-request";

/**
 * got-scraping opens connections of its own (an ALPN probe, then the request,
 * possibly over HTTP/2). The guard is only real if NONE of them reaches a
 * house address. So: a real TLS server and a real HTTP server on localhost,
 * and the only assertion that matters — they saw no connection at all.
 */

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ssrf-"));
execFileSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost",
  "-keyout", path.join(dir, "key.pem"), "-out", path.join(dir, "cert.pem"),
], { stdio: "ignore" });
const key = fs.readFileSync(path.join(dir, "key.pem"));
const cert = fs.readFileSync(path.join(dir, "cert.pem"));

async function listening(server: http.Server | https.Server): Promise<number> {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return (server.address() as { port: number }).port;
}

test("no got-scraping connection reaches localhost over https (ALPN probe included)", { timeout: 20000 }, async () => {
  let connections = 0;
  const server = https.createServer({ key, cert, ALPNProtocols: ["h2", "http/1.1"] }, (_, res) => res.end("<title>LEAKED</title>"));
  server.on("connection", () => connections++);
  const port = await listening(server);

  // Known-good: the counter does count a connection that is made.
  await new Promise<void>((resolve) => {
    const s = tls.connect({ host: "127.0.0.1", port, rejectUnauthorized: false }, () => { s.destroy(); resolve(); });
    s.on("error", () => resolve());
  });
  assert.equal(connections, 1, "the control connection was not counted: the test is broken");

  await assert.rejects(browserRequest(new URL(`https://localhost:${port}/`), "text/html", 100_000, 5000));
  assert.equal(connections, 1, "got-scraping connected to localhost: the SSRF guard is bypassed");
  server.close();
});

test("no got-scraping connection reaches localhost over plain http", { timeout: 20000 }, async () => {
  let connections = 0;
  const server = http.createServer((_, res) => res.end("<title>LEAKED</title>"));
  server.on("connection", () => connections++);
  const port = await listening(server);
  await assert.rejects(browserRequest(new URL(`http://localhost:${port}/`), "text/html", 100_000, 5000));
  assert.equal(connections, 0, "got-scraping connected to localhost: the SSRF guard is bypassed");
  server.close();
});

test("with HUSHLIST_EGRESS_PROXY set, every request goes through the proxy", { timeout: 20000 }, async () => {
  const targets: string[] = [];
  // A proxy that writes down where it was asked to go and refuses.
  const proxy = http.createServer((req, res) => {
    targets.push(`${req.method} ${req.url}`);
    res.writeHead(403).end();
  });
  proxy.on("connect", (req, socket) => {
    targets.push(`CONNECT ${req.url}`);
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
  });
  const port = await listening(proxy);
  process.env.HUSHLIST_EGRESS_PROXY = `http://127.0.0.1:${port}`;
  try {
    await browserRequest(new URL("https://butik.example/vare"), "text/html", 100_000, 5000).catch(() => null);
    await browserRequest(new URL("http://butik.example/vare"), "text/html", 100_000, 5000).catch(() => null);
  } finally {
    delete process.env.HUSHLIST_EGRESS_PROXY;
    proxy.close();
  }
  assert.ok(targets.some((t) => t.startsWith("CONNECT butik.example:443")), `https via CONNECT: ${targets}`);
  assert.ok(targets.some((t) => t.includes("butik.example")), `http via proxy: ${targets}`);
});
