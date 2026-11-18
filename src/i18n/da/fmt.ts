/** Grammar that does not fit in a string. */
export const fmt = {
  /** "Annas", but "Klaus'" and "Max'". */
  genitive: (name: string) => (/[sxz]$/i.test(name) ? `${name}'` : `${name}s`),
  /** "Anna, Mads og Ida". */
  list: (names: string[]) => new Intl.ListFormat("da-DK", { type: "conjunction" }).format(names),
  /** "18. november 2026". */
  longDate: (date: Date, timeZone: string) =>
    date.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone }),
};
