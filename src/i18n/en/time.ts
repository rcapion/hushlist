import type { Messages } from "../types";
import { fmt } from "./fmt";

export const time: Messages["time"] = {
  today: "today",
  yesterday: "yesterday",
  daysAgo: (n: number) => `${n} days ago`,
  monthsAgo: (n: number) => (n === 1 ? "a month ago" : `${n} months ago`),
  overAYear: "over a year ago",
  christmas: (year: number) => `Christmas ${year}`,
  birthday: (name: string, year: number) => `${fmt.genitive(name)} birthday ${year}`,
  month: (month: number, year: number) => {
    const name = new Date(Date.UTC(2000, month, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
    return `${name} ${year}`;
  },
};
