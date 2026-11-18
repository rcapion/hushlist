# The iPhone Shortcut

On an iPhone, the quickest way to wish for something is from the share sheet:
**Share → Hushlist** on a product in Safari or in a shop's app. A web app cannot
be a share target on iOS, so this is an Apple Shortcut that posts the link to
`/api/wishes` with a personal key.

There are three ways to get it. Settings offers the first one that applies.

## 0. The shared Shortcut (nothing to build)

One Shortcut serves every install: on import it asks for two things, your
key and your Hushlist's address, and Settings shows both with Copy buttons.
It is published as an iCloud link, one per language, in
`src/lib/shortcut.ts` (`PUBLIC_SHORTCUT_LINKS`). If that list has a link for
your language, Settings → **Wish from your iPhone** → **Get the shortcut**
opens it in the Shortcuts app, also from the Home Screen app.

Your household can set its own iCloud link instead (the fold-out "Share the
shortcut with an iCloud link" in the same section), for example one with the
address already filled in. That wins over the shared one.

To make the shared links (the maintainer does this once per change):

```sh
python3 scripts/build-shortcut.py --lang en Hushlist.shortcut      # no address: it asks
python3 scripts/build-shortcut.py --lang da Ønskeliste.shortcut
mkdir -p signed
shortcuts sign --mode anyone --input Hushlist.shortcut --output signed/Hushlist.shortcut
shortcuts sign --mode anyone --input Ønskeliste.shortcut --output signed/Ønskeliste.shortcut
```

Open the signed files on the Mac to import them, leaving both questions empty,
then in Shortcuts: right-click → Share → Copy iCloud Link. Paste the links into
`src/lib/shortcut.ts`. **The Shortcut takes its name from the file it was
imported from**, and the link carries that name to everyone: sign into a folder
of its own, so the file keeps its final name. Renaming later means a new link.

**Why a link and not a file:** a download from the Home Screen app leaves the
user on a screen with no way back (WebKit bug 236943), and a new window stays
blank. An iCloud link opens in the Shortcuts app instead.

**Once per iPhone:** Settings → Apps → Shortcuts → Advanced → **Allow Running
Scripts** (Danish: *Tillad afvikling af instrukser*). The Shortcut reads the
page in Safari with JavaScript, which iOS refuses until this is on. On a Mac
the same setting is under Shortcuts → Settings → Advanced, but there the
bookmark below is simpler.

## A. Build it by hand (no Mac needed)

Settings → **Wish from your iPhone** shows a step-by-step recipe with your
address filled in. Each adult makes a key there (it is shown only once) and
builds the Shortcut in the Shortcuts app. It takes about five minutes.

## B. A ready-made file (needs a Mac, once)

iOS only imports signed Shortcuts, and signing needs macOS. Build the file
for your address, sign it, and put it in the data directory:

```sh
python3 scripts/build-shortcut.py --lang en https://wishes.example.com Hushlist.shortcut
# on a Mac:
shortcuts sign --mode anyone --input Hushlist.shortcut --output hushlist.shortcut
# then, on the server (the app runs as uid 1000 and must be able to read it):
cp hushlist.shortcut <data directory>/hushlist.shortcut
sudo chown 1000:1000 <data directory>/hushlist.shortcut
```

`--lang da` makes a Danish one. No restart is needed. Settings now shows
**Get the shortcut**, with numbered steps. The file holds no secret: it asks for the key
when it is added, so one file serves every adult. Rebuild it if the address
changes.

What the file does: from Safari it reads the page's `<head>` (title, meta
tags, JSON-LD), which gets around shops that refuse the server. From an app
it sends only the link. It asks whose list the wish is for when there is more
than one choice, and it shows the answer as a notification.

**Not yet verified:** the generated file was built from Apple's undocumented
plist format and has not been imported on an iPhone yet. If it fails, use
method A. A report or a fix is welcome.

## On a computer

Settings → **Wish from your computer** has a bookmark ("＋ Wish") to
drag to the bookmarks bar. On a shop page, clicking it opens the app with the
product filled in, and nothing is added until you choose a list.

## The API

```
GET  /api/wishes            Authorization: Bearer <key>
  → {"lists": ["Mads", "Ida", "Oskar"]}

POST /api/wishes            Authorization: Bearer <key>
  {"url": "https://…", "til": "Ida", "html": "<optional page head>"}
  → {"message": "Added to Ida's list."}     (in the household's language)
```

`til` is optional. Without it the wish goes on the key owner's own list.
