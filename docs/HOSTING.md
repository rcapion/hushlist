# Hosting

Hushlist is one container and one data directory. Any way of running a
container and putting HTTPS in front of it will do. This page lists what that
setup has to provide. The three examples in `deploy/` are worked answers to it.

## What any setup must provide

1. **The image.** Released ones are `ghcr.io/rcapion/hushlist:<version>`
   (amd64, arm64). Or build it from this repository, `docker build -t hushlist .`;
   the build downloads npm packages and one font, so it needs the internet.
2. **A writable `/data`** for uid 1000. Use a bind mount (`./data:/data`) or a
   named volume. A bind mount is easier to back up and to inspect.
3. **HTTPS in front, for the family.** Guests open the family link on their
   own phones, usually outside your network, so the address must be public.
   Plain http is fine on the LAN for trying it out, but not for real use.
4. **The `Host` header passed through.** Every button is a Next.js server
   action, and Next refuses an action whose `Origin` does not match the
   `Host` (or `X-Forwarded-Host`) it receives. Most proxies pass `Host`
   through by default. Cloudflare Tunnel, Tailscale Serve/Funnel and Caddy's
   `reverse_proxy` all do. Nginx needs `proxy_set_header Host $host;`.
5. **`HUSHLIST_PUBLIC_URL` set to the address the family uses.** This is
   optional, but it makes the links in Settings and the Secure flag on
   cookies independent of what the proxy sends
   ([CONFIGURATION.md](CONFIGURATION.md)).
6. **Only one public way in.** Do not also publish port 3000 on the router.

## Choosing

| | Cloudflare Tunnel | Tailscale Funnel | Your own reverse proxy |
| --- | --- | --- | --- |
| Address | `wishes.your-domain.com` | `name.tailnet.ts.net` | whatever you have |
| You need | a domain whose DNS Cloudflare runs | a Tailscale account | a proxy, a certificate, port 443 open |
| Router changes | none | none | port forward 443 |
| Who sees the traffic | Cloudflare terminates TLS | encrypted end to end to your machine | only you |
| Extras | WAF, rate limiting, Access | — | depends |
| Bandwidth | generous | Funnel has limits (fine for a wishlist) | yours |

Both tunnel examples also put the app on an **internal Docker network** with
a **Squid egress proxy** as its only way out. This means a compromised app
cannot reach your LAN, NAS or router, and cannot be reached except through the
tunnel. You do not have to copy this, but it is cheap and it is how the app is
run at home.

## Our setup, for reference

At home the app runs as a custom app on TrueNAS SCALE, in the shape of
[`deploy/cloudflare-tunnel`](../deploy/cloudflare-tunnel). It has its own
Cloudflare tunnel, separate from other services, so it can be switched off
alone. Cloudflare has a rate-limit rule (POST, 20 per 10 s per IP) and no
Access policy, because the family must get in without accounts. The data lives
on its own ZFS dataset, which is snapshotted, and `backup/` is synced offsite
nightly. A monthly job checks the dependencies (`npm audit`) and the public
surface. Two things differ from the example: the image is not built on the
NAS, and the code is installed onto a read-only dataset by a separate step.
Neither is needed for a family install.

## A reverse proxy you already run

Start from [`deploy/lan`](../deploy/lan), remove `ports:` if the proxy is
on the same Docker network, and point the proxy at `http://hushlist:3000`.

Caddy:

```
wishes.example.com {
	reverse_proxy hushlist:3000
}
```

Nginx:

```nginx
location / {
    proxy_pass http://hushlist:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 2m;   # picture uploads are ≤ 1.5 MB
}
```

The login throttle counts per client IP. It reads `CF-Connecting-IP` and
otherwise the first `X-Forwarded-For` hop, so a proxy that sets neither makes
every visitor look like one address. Logins would then be throttled for
everyone together: annoying, not unsafe.

## Without Docker

```sh
npm ci
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
HUSHLIST_DB_PATH=/var/lib/hushlist/hushlist.db node .next/standalone/server.js
```

Use Node 22. `better-sqlite3` ships prebuilt binaries for common platforms.
Elsewhere it compiles, and then needs python3, make and a C++ compiler.
