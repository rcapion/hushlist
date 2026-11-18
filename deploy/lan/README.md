# On the LAN, or behind your own reverse proxy

One container, port 3000, no tunnel. Use it to try the app at home, or to put
it behind a reverse proxy you already run.

```sh
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d --build
```

Open `http://<this machine>:3000` and set up the household.

For the family, it needs HTTPS and a public address. Put your proxy in front
(see [docs/HOSTING.md](../../docs/HOSTING.md) for what it must do), set
`HUSHLIST_PUBLIC_URL` in `.env`, and stop publishing the port to the whole
LAN: either `127.0.0.1:3000:3000`, or no `ports:` at all if the proxy is on
the same Docker network.
