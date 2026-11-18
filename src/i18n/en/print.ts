import type { Messages } from "../types";
import { fmt } from "./fmt";

export const print: Messages["print"] = {
  title: (name: string) => `${fmt.genitive(name)} wishlist`,
  back: "← Back",
  print: "Print",
  printed: (date: string) => `Printed ${date}`,
  sizes: (sizes: string) => `Sizes: ${sizes}`,
  empty: "No wishes.",
  takenByOthers: "Reserved by others",
  reservedByYou: "You've reserved it",
  reservedBy: (name: string) => `Reserved by ${name}`,
};
