# Cloudflare Tunnel

The family gets `https://wishes.your-domain.com`. Nothing is opened in the
router: `cloudflared` dials out to Cloudflare, and Cloudflare sends visitors
back down that connection. This is how the app runs at home.

You need a domain whose DNS is on Cloudflare (the free plan is enough).

## 1. Make the tunnel

These are the dashboard steps as of late 2026. Cloudflare moves things around,
so if a menu has changed, follow their guide "Create a tunnel (dashboard)".

1. Cloudflare dashboard → **Networking** → **Tunnels** → **Create a tunnel**.
   Name it `hushlist`.
2. Choose **Docker** as the environment. Do not run the command it shows.
   Copy only the long token after `--token`.
3. Put the token in `.env`:
   ```sh
   cp .env.example .env
   # TUNNEL_TOKEN=<the token>
   # HUSHLIST_PUBLIC_URL=https://wishes.your-domain.com
   ```

## 2. Start it

```sh
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d
docker compose ps        # three containers; hushlist "healthy" after ~30 s
```

The tunnel shows as **Healthy** in the dashboard within a minute.

## 3. Publish the address, and set it up at once

1. In the tunnel → **Routes** → **Add route** → **Published application**:
   hostname `wishes.your-domain.com`, service `http://hushlist:3000`.
2. **Straight away**, open `https://wishes.your-domain.com`, enter the
   household and choose your code. Until you do, anyone who finds the address
   could do it (see AGENTS.md, step 4).

## 4. Optional, recommended

- **Rate limiting**: a WAF rate-limiting rule for hostname
  `wishes.your-domain.com` and method `POST`, 20 requests per 10 seconds per IP,
  action Block. This is what runs at home, and it fits the free plan.
- **Do not** put Cloudflare Access in front of it. The family must get in
  without accounts.

## How it fits together

```
phone ─https─▶ Cloudflare ◀─tunnel─ hushlist-tunnel ─┐
                                                       │ inside (internal network)
shop pages ◀─ hushlist-egress (Squid) ◀──────────────┤
                                                       └─ hushlist :3000, /data
```

The app is only on the `inside` network, which has no route out. It has no
published port. It reaches shop pages only through Squid, which refuses every
private address (`../squid.conf`).
