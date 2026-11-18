import type { Messages } from "../types";

export const common: Messages["common"] = {
  copy: {
    label: "Copy",
    copied: "Copied ✓",
    prompt: "Copy the link:",
  },
  share: {
    title: "Wishlists",
    label: "Share the wishlists with the family",
    button: "Share",
  },
  myReservations: {
    heading: "You have reserved",
    for: (name: string) => `for ${name}: `,
  },
};
