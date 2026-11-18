/** Small widgets shared across pages: buttons, the reservations summary. */
export const common = {
  copy: {
    label: "Kopiér",
    copied: "Kopieret ✓",
    prompt: "Kopiér linket:",
  },
  share: {
    title: "Ønskelister",
    label: "Del ønskelisterne med familien",
    button: "Del",
  },
  myReservations: {
    heading: "Du har reserveret",
    for: (name: string) => `til ${name}: `,
  },
};
