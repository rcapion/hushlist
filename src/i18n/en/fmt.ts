import type { Messages } from "../types";

export const fmt: Messages["fmt"] = {
  /** "Anna's", and "James'" for a name ending in s. */
  genitive: (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`),
  /** "Anna, Mads and Ida". */
  list: (names: string[]) => new Intl.ListFormat("en-GB", { type: "conjunction" }).format(names),
  /** "18 November 2026". */
  longDate: (date: Date, timeZone: string) =>
    date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone }),
};
