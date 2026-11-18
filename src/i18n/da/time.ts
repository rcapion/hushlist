import { fmt } from "./fmt";

/** How long ago, and the occasions received wishes are grouped by (src/lib/received.ts). */
export const time = {
  today: "i dag",
  yesterday: "i går",
  daysAgo: (n: number) => `for ${n} dage siden`,
  monthsAgo: (n: number) => (n === 1 ? "for en måned siden" : `for ${n} måneder siden`),
  overAYear: "for over et år siden",
  christmas: (year: number) => `Jul ${year}`,
  birthday: (name: string, year: number) => `${fmt.genitive(name)} fødselsdag ${year}`,
  /** month is 0–11: "Januar 2027". */
  month: (month: number, year: number) => {
    const name = new Date(Date.UTC(2000, month, 1)).toLocaleDateString("da-DK", { month: "long", timeZone: "UTC" });
    return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
  },
};
