# Security

A family wishlist is a small target, but a public one. It also fetches URLs
that users paste, which is the classic way into a home network (SSRF). This
page covers what the app does about that, and what the host has to do.

## What the app does

- **Logins.** Codes are hashed with scrypt. A wrong code gets the same answer
  in the same time whatever was wrong. Each account backs off on failures
  (doubling, up to a minute, never a lockout), and an IP address is stopped
  after 50 failures in 10 minutes. The login page names nobody.
- **First run.** The household is set up once, and only the first adult's
  code can be chosen freely. Every later account needs an invitation link,
  which works once and expires. **Do the first run before the address is
  public** (AGENTS.md, step 4).
- **Sessions** are httpOnly and SameSite=Lax cookies, valid for a year, and
  Secure over HTTPS.
- **The family link** is a random token (192 bits). A wrong token gets a
  plain 404. A new link (Settings) ends the old one everywhere.
- **SSRF.** Only logged-in members can make the server fetch anything. The
  fetcher refuses private, loopback, link-local, CGNAT and IPv6-mapped
  addresses, checked after DNS resolution and on every redirect
  (`src/lib/ssrf.ts`, `src/lib/safe-fetch.ts`, with tests). The deploy
  examples add a second guard outside the process: a Squid proxy that refuses
  the same ranges, and an internal Docker network with no other route out.
- **Uploads.** Only members who manage the wish can upload, up to 1.5 MB. The
  type is checked from the first bytes (no SVG, HTML or PDF), and files are
  stored under a random name.
- **Headers.** CSP with `connect-src` and `form-action 'self'`, HSTS,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (so the family
  token does not leak to shops), and no `X-Powered-By`.

## What the host should do

- Use HTTPS only, through a tunnel or a proxy. Never publish port 3000 on the
  router.
- Keep it updated (`git pull && docker compose up -d --build`). Next.js
  security releases matter for anything public.
- Back up `data/backup/` and `data/images/`.
- Optionally rate-limit POST requests at the edge (Cloudflare: a rate-limit
  rule on the hostname).
- Keep the family link inside the family. Anyone with it can see every list
  and reserve gifts.

## Reporting

Please open an issue for anything that is not sensitive. For anything that
is, contact the repository owner privately first.
