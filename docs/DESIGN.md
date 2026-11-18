# Design

The guiding word is **simple**, both for whoever makes a list and for whoever
buys from it. Minimalist and elegant, not feature-rich. When a feature was
weighed against friction for a grandparent on a phone, friction usually lost.

## People and roles

- **Adults** (one or two) log in with their name and a code they choose. The
  first adult's code is chosen on the login page, once. After that, an adult
  without a code gets in only through a one-time **invitation link** that a
  logged-in adult makes.
- **Children** have lists that both adults manage. A child may also get a
  login (by invitation). They can then edit their own list and reserve on
  the others' lists, but they see **only their own** reservations. Someone
  else's is stripped on the server, so a taken wish looks free to them. If they
  try to reserve it, they are told that someone already has. That is the one
  bit that leaks, and only to a child who is about to buy that gift.
- **Guests** (close family) have no accounts. They open one secret **family
  link** and type their first name once, and the browser remembers it.

## The one rule

**Nobody sees the reservations on their own list.** It is enforced in
`src/lib/visibility.ts`, which strips them from the data before anything is
rendered, so nothing reaches the page source either. `test/visibility.test.ts`
tests it.

| Viewer | Own list | Partner's list | Children's lists |
| --- | --- | --- | --- |
| Adult, logged in | no reservations | sees all | sees all |
| Guest via the family link | — | sees all | sees all |
| Child with a login | no reservations | only their own | only their own |

This is an honour system by decision: the family link is a guest view, so an
adult who opens it can see reservations on their own list. Closing that gap
would need guest accounts, which costs more friction than it is worth. Do not
give the children the family link.

## Wishes

- Title, link, price, picture, note, and one flag: **★ Største ønske** (the
  biggest wish).
- No quantity: one wish, one reservation.
- **Pasting a link** fetches the title, picture and price from `og:*` and
  JSON-LD `Product`/`Offer`, with a short timeout. If that fails, the wish is
  still made with what was typed, and the form opens for fixing by hand. The
  picture is copied locally, because hotlinked shop images rot.
- The fetcher behaves like a browser (got-scraping), because many shops block
  plain server requests. Some, H&M for example, still refuse. The iPhone
  Shortcut, run from Safari, sends the page as the phone saw it and gets
  around that.
- **Uploaded pictures** are re-encoded in the browser to a JPEG of at most
  1200 px. That drops EXIF data, including location. The server checks the
  type from the file's first bytes and never trusts the name.
- **Hide** (Skjul for andre) takes a wish off the list everyone else sees,
  without deleting it.

## Order, on screen and on paper

For a buyer, the order is: what they reserved themselves, then free wishes,
then what others reserved. On your own list the order never changes, because
a reorder there would hint at what has been taken.

## "Fik det" and the history

When the owner marks a wish as received, it moves to `/liste/<id>/opfyldt`
after a 6-second countdown with an undo. The history is grouped by occasion:
Christmas (1 Dec–15 Jan), a birthday (±21 days, if one is set), or else the
month. **Who gave it** is shown a month after "Fik det", and never before the
occasion's date. Children cannot press "Fik det", so they cannot mark a wish
early to find out who gave it.

## Print

One A4 page per list, in two columns, for someone without a phone. What can
still be bought comes first, and "Reserveret af andre" comes last, struck
through. The printout follows the same visibility rule as the screen: it is a
printout of the viewer's own view, and it carries the date it was printed.

## Languages

The app was written in Danish and is now bilingual. Danish is the reference
shape for messages, and English is the default for new installs. The language
is a household setting (Settings → Language), with `HUSHLIST_LANGUAGE` as the
starting point. The texts are in `src/i18n`, and
[TRANSLATING.md](TRANSLATING.md) covers adding a language. The Danish names
in this document ("Fik det", "Største ønske") are the original labels. In
English they are "Got it" and "Biggest wish".

## Left out on purpose

- Notifications and mail.
- Guest accounts. One family link, by design.
- Summed prices.
- More than one list per person. Lists run continuously. Received wishes go
  to the history instead.
- A language per person. The household has one language, and guests see it.
