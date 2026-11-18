import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server for a runtime image with no package manager. It does NOT
  // copy public/ or .next/static; the Dockerfile does (same trap as handleliste).
  output: "standalone",

  // Nobody outside needs to be told what serves the page.
  poweredByHeader: false,

  // Native addon: bundling it breaks the .node binary.
  // got-scraping and header-generator read data files next to their code, and
  // http2-wrapper is patched at runtime (browser-request.ts): none of them bundled.
  serverExternalPackages: ["better-sqlite3", "got-scraping", "header-generator", "http2-wrapper"],

  // The standalone trace follows require(), not the files header-generator
  // opens with fs: without these the server dies on "ADM-ZIP: Invalid filename"
  // the first time a link is fetched (seen in a local standalone run, 2026-11-16).
  outputFileTracingIncludes: {
    "/**": ["./node_modules/header-generator/data_files/**", "./node_modules/generative-bayesian-network/**"],
  },

  // Every form is a server action, and Next refuses one whose Origin host is
  // not the Host / X-Forwarded-Host it sees (CSRF). So the proxy in front must
  // pass the visitor's Host through, or set X-Forwarded-Host: Cloudflare
  // Tunnel, Tailscale Serve/Funnel and Caddy all do (docs/HOSTING.md).
  experimental: {
    serverActions: {
      // Every action's body is read before the action can check who is asking,
      // so this is what any stranger may make the server hold per request.
      // Pictures go to /api/billeder instead; the largest real action body is
      // an import of 30 lines.
      bodySizeLimit: "256kb",
    },
  },

  async headers() {
    return [
      {
        // The guest view is reached by a secret token in the URL. These keep
        // that URL from leaking to shops via Referer and the page from being
        // framed.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Browsers keep to https once they have seen it there; set here
          // rather than zone-wide at a proxy, which would bind every other
          // name on the domain too. Ignored over plain http.
          { key: "Strict-Transport-Security", value: "max-age=15552000" },
          // Without nonces Next needs 'unsafe-inline' for its own scripts, so
          // this does not stop an injected inline script from running — but
          // connect-src/form-action 'self' stop it sending anything elsewhere,
          // and nothing loads from any other origin. Pictures are our own copies.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
