# Translating

Every word the app shows lives in `src/i18n/<language>/`. There is one folder
per language, and every folder has the same files with the same keys. English
(`en`) and Danish (`da`) ship with the app. Danish is the reference: it is the
language the app was written in, and the type system holds every other
language to its exact shape.

## Add a language

Say German (`de`):

1. Copy the English folder: `cp -r src/i18n/en src/i18n/de`.
2. Register it in `src/i18n/index.ts`:
   ```ts
   import { de } from "./de";
   export const LOCALES = { da, en, de } satisfies Record<string, Messages>;
   ```
   and rename the export at the bottom of `de/index.ts` from `en` to `de`.
3. In `de/meta.ts`, set `name` (as the language calls itself, "Deutsch"),
   `htmlLang` (`"de"`) and `intl` (`"de-DE"`, used for dates and lists of
   names).
4. Translate the strings in the other files. Some messages are functions,
   because they contain a value or need grammar:
   - `fmt.genitive(name)` makes a possessive ("Anna's", "Annas"). Write the
     rule for your language, and use it wherever a message says "X's list".
   - `fmt.list(names)` joins names ("Anna, Mads and Ida"). `Intl.ListFormat`
     usually does it right.
   - `time.christmas(year)`, `time.birthday(name, year)` and `time.month(m,
     year)` label the history of received wishes.
   Keep each function's parameters as they are.
5. `npm run typecheck && npm test`. A missing or extra key is a compile error,
   and a test compares every language's keys with Danish.
6. Pick it in the app (Settings → Language), or set `HUSHLIST_LANGUAGE=de`.

The iPhone instructions under Settings name buttons in Apple's own interface
("Share", "Add to Home Screen", the Shortcuts actions). Use the names iOS
shows in your language, not a translation of the English names.

To make the downloadable Shortcut speak your language too, add your texts to
`scripts/build-shortcut.py` (see `--lang`).

## What is not translated

- URL paths and query parameters (`/liste`, `/indstillinger`, `?vaelg`). They
  are in links people have already been sent.
- Log lines and code comments (English).
- What people type: names, wishes, notes, sizes.
- Prices, which come from the shop as the shop wrote them.

## Changing a text

Change it in every language folder, not just one. If a Danish text changes,
the household that runs the app in Danish sees it.
