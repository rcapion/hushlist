# The iPhone Shortcut

On an iPhone, the quickest way to wish for something is from the share sheet:
**Share → Hushlist** on a product in Safari or in a shop's app. A web app cannot
be a share target on iOS, so this is an Apple Shortcut that posts the link to
`/api/wishes` with a personal key.

There are two ways to get it.

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
