# Configuration

All settings are environment variables, and every one is optional. In the
`deploy/` examples they go in `.env` beside `compose.yaml`. Anything about the
household itself (people, children, birthdays, the family link, invitations)
is set in the app under **Settings**, not here.

| Variable | Default | What it does |
| --- | --- | --- |
| `HUSHLIST_PUBLIC_URL` | *(unset)* | The address the family uses, e.g. `https://wishes.example.com`. Links (family link, invitations, the bookmark) are built from it, and cookies are `Secure` when it starts with `https`. Unset, both come from the `Host` and `X-Forwarded-*` headers the proxy sends. **Set it.** |
| `HUSHLIST_LANGUAGE` | `en` | The household's language: `en` or `da`, or any language added under `src/i18n` ([TRANSLATING.md](TRANSLATING.md)). An adult can change it in the app (Settings → Language), and that choice wins over this one. Guests see the household's language. |
| `HUSHLIST_DB_PATH` | `./data/hushlist.db`, and `/data/hushlist.db` in the image | The SQLite file. Its directory also holds `images/`, `backup/` and the optional signed Shortcut. |
| `HUSHLIST_TIMEZONE` | `Europe/Copenhagen` | Used for the date on printouts, for grouping received wishes by occasion, and for the hour the link check runs. An IANA name. |
| `HUSHLIST_LINK_CHECK` | on | `off` stops the nightly check of every wish's link. The check runs once a day from 03:00, one link every 3 s. It flags a wish as gone (404/410) or sold out after two nights in a row, and only owners see the flag. |
| `HUSHLIST_EGRESS_PROXY` | *(unset)* | An HTTP proxy for every fetch the app makes (shop pages, pictures, the link check), e.g. `http://hushlist-egress:3128`. Unset, the app connects directly. Its own SSRF guard applies either way. |
| `PORT`, `HOSTNAME` | `3000`, `0.0.0.0` in the image | Where the server listens inside the container. |
| `TZ` | | The container's own clock. Set it to the same value as `HUSHLIST_TIMEZONE` for readable log times. |

The deploy examples have their own variables, used by compose only:
`HUSHLIST_DATA` (where `/data` comes from), `HUSHLIST_PORT` (lan),
`TUNNEL_TOKEN` (Cloudflare), and `TS_AUTHKEY` and `TS_HOSTNAME` (Tailscale).

## In the data directory

| Path | What |
| --- | --- |
| `hushlist.db` (+ `-wal`, `-shm`) | The database. Do not copy it while the app runs. |
| `backup/hushlist.db` | A consistent copy, written at start and every 6 hours. Back this up. |
| `images/` | Wish pictures, under random names. Back this up too. |
| `hushlist.shortcut` | Optional: the signed Apple Shortcut ([SHORTCUT.md](SHORTCUT.md)). When it is present, Settings offers it for download. |

## What is deliberately not configurable

- **One language per household, not per person.** Guests see the
  household's language.
- **Christmas** is the one holiday the history knows (1 Dec to 15 Jan), next
  to birthdays.
- **The visibility rule.** Nobody sees reservations on their own list.
- **Session length** (a year) and **login throttling**. These are security
  choices, made in `src/lib/session.ts` and `src/lib/throttle.ts`.

## Upgrading from the Danish-only version

The variables used to be called `ONSKELISTE_*`. Those names are still read
when the `HUSHLIST_*` one is absent, so nothing has to change. An install that
was Danish-only before should set `HUSHLIST_LANGUAGE=da`, or pick Dansk under
Indstillinger → Sprog, because the default is now English.
