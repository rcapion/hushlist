import { fmt } from "./fmt";

export const print = {
  title: (name: string) => `${fmt.genitive(name)} ønskeliste`,
  back: "← Tilbage",
  print: "Udskriv",
  printed: (date: string) => `Udskrevet ${date}`,
  sizes: (sizes: string) => `Størrelser: ${sizes}`,
  empty: "Ingen ønsker.",
  takenByOthers: "Reserveret af andre",
  reservedByYou: "Du har reserveret den",
  reservedBy: (name: string) => `Reserveret af ${name}`,
};
