# Setting up Hushlist: a guide for AI assistants

You are helping someone host this wishlist for their family. They may not
be technical. This file tells you what to ask, what to do, and how to check
that it worked. Read it all before you start, and read the files it links
when you get to them.

## What you are setting up

- One Docker container running a Next.js server on port 3000. The image is
  built from this repository (`Dockerfile`). No image is published, so build
  it.
- One data directory mounted at `/data`. It holds the SQLite database, the
  uploaded pictures and `backup/hushlist.db`. The container runs as uid 1000,
  so that uid must be able to write to the directory.
- Settings come from environment variables
  ([docs/CONFIGURATION.md](docs/CONFIGURATION.md)). All are optional.
  `HUSHLIST_PUBLIC_URL` is the one you should nearly always set.
- Optionally there is a Squid container as the app's only way to the internet,
  and a tunnel container as the only way in. The examples in `deploy/` show
  this.

## 1. Ask before you build

Ask these, in plain words, and wait for the answers:

1. **Where will it run?** A NAS (Synology, Unraid, TrueNAS), a mini PC or
   Raspberry Pi, a VPS? It needs Docker with Compose, and an x86-64 or arm64
   machine. Confirm that Docker works before going further (`docker compose
   version`).
2. **How should the family reach it?** Guests open it from their own phones,
   outside the home network, so it must be reachable from the internet over
   HTTPS. Offer these choices:
   - **They own a domain, or are willing to move one's DNS to Cloudflare** →
     `deploy/cloudflare-tunnel`. The address is their own (`wishes.<domain>`).
   - **No domain** → `deploy/tailscale-funnel`. The address is
     `https://<name>.<tailnet>.ts.net`, a free Tailscale account is needed, and
     nobody else needs Tailscale.
   - **They already run a reverse proxy** (Caddy, Traefik, Nginx Proxy Manager,
     Synology's) → `deploy/lan`, with their proxy in front. Check the proxy
     against the list in [docs/HOSTING.md](docs/HOSTING.md).
   - **Just trying it** → `deploy/lan` on the home network.
   If they have no preference, recommend Tailscale Funnel: it needs the fewest
   accounts.
3. **Which language?** English or Danish (`HUSHLIST_LANGUAGE=en` or `da`).
   It applies to the whole household, guests included, and an adult can change
   it later under Settings → Language. For another language, see
   [docs/TRANSLATING.md](docs/TRANSLATING.md): offer to translate it with
   them. The app is small, and a missing key will not compile.
4. **Who is in the household?** The first-run page asks for the adults (one or
   two) and the children. Children can be added later too.

Do not choose a hosting method for them without asking. It decides which
accounts they need and what their address will be.

## 2. Build and start

Follow the README in the chosen `deploy/` directory. In short:

```sh
cd deploy/<method>
cp .env.example .env        # if the method has one; fill it in with the user
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d --build
```

On a NAS with its own Docker UI (Synology Container Manager, TrueNAS Apps,
Unraid, Portainer), the compose file can usually be pasted in as a "project"
or "stack". The relative paths (`build: ../..`, `./data`, `../squid.conf`)
must then become absolute paths into a clone of this repository. Say so, and
help with it.

Secrets (`TUNNEL_TOKEN`, `TS_AUTHKEY`) go in `.env` and nowhere else: not in
the compose file, and not in a commit.

## 3. Check that it runs

```sh
docker compose ps                         # all "running"; hushlist "healthy" after ~30 s
docker compose logs hushlist --tail 50
docker compose exec hushlist node -e "fetch('http://127.0.0.1:3000/api/health?egress=1').then(r=>r.text()).then(console.log)"
```

The health answer should have `"ok":true`. With the egress proxy it should
also say `"egress":"HTTP 200 …"`. If it does not, the app cannot fetch shop
pages: check `docker compose logs hushlist-egress`.

## 4. First run, before the family gets the address

**The first visitor sets up the household, and then chooses the first adult's
code.** Until that is done, anyone who reaches the address could do it. So:

- Do it the moment the address first answers, or do it while the address is
  reachable only by the user. The Tailscale example starts with Funnel off for
  exactly this reason (its README, step 4).
- Have the **user** open the address, enter the household, and choose their
  code. Do not make up codes for them.
- The second adult gets an **invitation link** under Settings. They
  choose their own code from that link.
- Then the **family link** (at the top of Settings) is what goes to
  grandparents and the rest. It is a secret. Anyone with it can see and
  reserve, so it should be sent privately, not posted.

Check from a phone on mobile data, not on the home Wi-Fi. Open the address,
log in, add a wish by pasting a shop link, then open the family link in a
private tab and reserve something. Then, logged in as the list's owner,
confirm that the reservation does **not** show.

## 5. Backups

Everything is in the data directory. The app writes a consistent copy of the
database to `data/backup/hushlist.db` at start and every six hours. Back up
`data/backup/` and `data/images/` with whatever the user already has (NAS
snapshots, Hyper Backup, restic, a cloud sync). Do not copy the live
`hushlist.db` while the app runs: a SQLite file and its WAL copied at
different moments may not open. To restore, stop the app, put the backup in
place as `data/hushlist.db`, delete any `hushlist.db-wal` and
`hushlist.db-shm`, and start it again.

## 6. Updating

```sh
git pull
docker compose up -d --build
```

The database migrates itself at start. Take a backup first (step 5).

## Optional extras

- **The iPhone Shortcut** in the share sheet: [docs/SHORTCUT.md](docs/SHORTCUT.md).
  Building the signed file needs a Mac. Without it, Settings shows a
  recipe for building the Shortcut by hand.
- **Rate limiting** at the edge, if the address is public. The app throttles
  logins itself. A Cloudflare rate-limit rule on POST requests is a cheap
  second layer.

## Do not

- Do not expose it over plain http on the internet. Logins and the family link
  would travel in clear text.
- Do not publish port 3000 on the router.
- Do not weaken `src/lib/visibility.ts` or its tests to make something work.
  That rule is the point of the app.
- Do not commit `.env`, the `data/` directory or a database.
- Do not run `scripts/seed-demo.ts` against the real database. It refuses one
  that already has people in it, and it should stay that way.

## If something fails

| Symptom | Likely cause |
| --- | --- |
| Container restarts, log says `SQLITE_CANTOPEN` or `EACCES` on `/data` | The data directory is not writable by uid 1000: `sudo chown -R 1000:1000 data` |
| Every button fails with an error, but pages load | The proxy does not pass the `Host` header through (server actions compare it with `Origin`). See [docs/HOSTING.md](docs/HOSTING.md) |
| Links in Settings show `http://hushlist:3000/…` | `HUSHLIST_PUBLIC_URL` is not set and the proxy sends no `X-Forwarded-Host` |
| Login works, then you are logged out at once | Secure cookies over plain http: set `HUSHLIST_PUBLIC_URL` to the address actually used |
| Pasted links never get a title or picture | No egress: check `/api/health?egress=1` (step 3). Some shops (H&M, for example) refuse servers, and the wish then keeps the typed text |
| `docker compose up --build` fails at `npm run build` fetching a font | The build needs the internet (next/font downloads Source Serif 4) |
