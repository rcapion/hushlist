import { fmt } from "./fmt";

/** Errors and answers from server actions, the Shortcut API and the upload route. */
export const server = {
  actions: {
    needAdult: "Der skal være mindst én voksen.",
    wrongLogin: "Forkert navn eller kode.",
    pickPerson: "Vælg en person.",
    codeAlreadyChosen: "Der er allerede valgt en kode. Prøv igen.",
    ipBlocked: "For mange forkerte forsøg fra denne forbindelse. Prøv igen om ti minutter.",
    codeTooShort: (min: number) => `Koden skal være mindst ${min} tegn.`,
    codesDiffer: "De to koder er ikke ens.",
    alreadyHasCode: "Den person har allerede en kode.",
    inviteInvalid: "Linket er brugt eller ugyldigt.",
    emptyWish: "Skriv et ønske eller indsæt et link.",
    shopRefused: "Butikken ville ikke vise os detaljerne. Skriv dem selv i ønsket.",
    added: "Tilføjet.",
    noLines: "Ingen linjer at indsætte.",
    tooManyLines: (max: number, count: number) => `Højst ${max} ad gangen — der var ${count}.`,
    imported: (count: number, name: string) => `${count} ønsker tilføjet til ${name}.`,
    importUnfetched: (count: number) => `${count} butikker ville ikke vise detaljer — ret dem med Ret.`,
    needTitle: "Ønsket skal have en titel.",
    badUrl: "Linket skal være en webadresse.",
    tooManyAttempts: "For mange forsøg. Vent lidt.",
    currentWrong: "Den nuværende kode er forkert.",
    minLength: (min: number) => `Mindst ${min} tegn.`,
    passwordChanged: "Koden er skiftet. Andre enheder er logget ud.",
  },
  /** /api/wishes: shown on the phone as the Shortcut's notification. */
  api: {
    wrongKey: "Forkert nøgle.",
    tooLarge: "For stor.",
    expectedJson: "Forventede JSON.",
    noLink: "Intet link.",
    unknownList: (name: string) => `Kender ikke en liste for "${name}".`,
    ownList: "din liste",
    listOf: (name: string) => `${fmt.genitive(name)} liste`,
    added: (where: string) => `Tilføjet til ${where}.`,
    addedUnfetched: (where: string) => `Tilføjet til ${where} — ret titlen i appen.`,
  },
  upload: {
    forbidden: "Nej.",
    logInAgain: "Log ind igen.",
    notYours: "Ikke dit ønske.",
    tooLarge: "Billedet er for stort.",
    pickImage: "Vælg et billede.",
    notAnImage: "Det kunne ikke læses som et billede.",
  },
};
