# Tailscale Funnel

The family gets `https://wishes.<your-tailnet>.ts.net`. You do not need a
domain, and nothing is opened in the router. Visitors do **not** need
Tailscale: Funnel makes this one address public. Tailscale terminates HTTPS
in the `hushlist-tailscale` container, on your machine.

You need a Tailscale account (the free plan is enough).

## 1. Prepare the tailnet (once)

In the Tailscale admin console:

1. **DNS**: turn on **MagicDNS** and **HTTPS Certificates**. Note your tailnet
   name, the `something.ts.net` part.
2. **Access controls**: the policy must allow Funnel. Look for a `nodeAttrs`
   entry with `"funnel"`. Newer tailnets have one. If yours does not, add:
   ```json
   "nodeAttrs": [
     { "target": ["autogroup:member"], "attr": ["funnel"] }
   ]
   ```
3. **Settings → Keys → Generate auth key**: not reusable, not ephemeral, and
   pre-approved if your tailnet requires device approval.

## 2. Configure

```sh
cp .env.example .env
# TS_AUTHKEY=<the key>
# TS_HOSTNAME=wishes
# HUSHLIST_PUBLIC_URL=https://wishes.<your-tailnet>.ts.net
```

## 3. Start it, private first

```sh
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d
docker compose ps              # three containers; hushlist "healthy" after ~30 s
docker compose logs hushlist-tailscale --tail 30
```

`tailscale/serve.json` ships with `"AllowFunnel": … false`. The address
therefore answers **only inside your tailnet** for now. The first HTTPS request
can take a few seconds while the certificate is issued.

## 4. Set it up, then open it to the family

1. From a device with Tailscale (your phone or computer), open
   `https://wishes.<your-tailnet>.ts.net`, enter the household and choose your
   code. The first visitor does this, so it should be you
   ([AGENTS.md](../../AGENTS.md), step 4).
   No other Tailscale device? Then skip this step, do step 2 now, and set up
   the household the moment the address answers.
2. Open the address to the internet: in `tailscale/serve.json` change `false`
   to `true`, then `docker compose restart hushlist-tailscale`.
3. Check it from a phone on **mobile data with Tailscale off**.

To close it again, set it back to `false` and restart the container.

## How it fits together

```
phone ─https─▶ Tailscale Funnel ─▶ hushlist-tailscale ─┐
                                                         │ inside (internal network)
shop pages ◀─ hushlist-egress (Squid) ◀────────────────┤
                                                         └─ hushlist :3000, /data
```

Same isolation as the Cloudflare example: the app has no published port, and
it reaches shop pages only through Squid, which refuses every private address.

## Known limits

- Funnel has bandwidth limits that cannot be configured. A wishlist does not
  come near them.
- **Not verified:** whether the visitor's real IP reaches the app through
  Funnel, in `X-Forwarded-For`. If it does not, the per-address login throttle
  counts all visitors together. The per-account backoff is unaffected.
- **Not verified end to end:** this example was written from Tailscale's
  documentation and source (serve.json format, `${TS_CERT_DOMAIN}`, Host
  passthrough), but has not yet been run against a real tailnet. If something
  is off, a fix is welcome.
