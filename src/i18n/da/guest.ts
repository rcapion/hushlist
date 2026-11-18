import { fmt } from "./fmt";

/** Login, first-run setup, the family link for guests, invitations and the bookmark landing page. */
export const guest = {
  home: {
    whoLivesHere: "Hvem bor her?",
    loginIntro: "Log ind med dit navn og din kode.",
  },
  login: {
    firstRunPrompt: (name: string) => `Første gang: vælg en kode til ${name}.`,
    newPassword: "Ny kode (mindst 8 tegn)",
    confirmPassword: "Samme kode igen",
    saveAndLogIn: "Gem kode og log ind",
    name: "Dit navn",
    password: "Kode",
    logIn: "Log ind",
    noCode: "Ingen kode endnu? Få et invitationslink af en voksen i husstanden.",
  },
  setup: {
    adults: "De voksne — dem der logger ind",
    adult1Example: "Fx Mads",
    adult2Example: "Fx Anna",
    children: "Børnene — én pr. linje. I styrer deres lister; de kan få deres egen kode senere.",
    start: "Kom i gang",
  },
  family: {
    welcome: {
      title: (names: string[]) => `Hej! Her er ønskerne fra ${fmt.list(names)}.`,
      intro:
        "Når du har fundet en gave, kan du reservere den, så ingen andre køber den samme. Den, der ønsker sig gaven, kan ikke se det — så overraskelsen holder.",
      nameBeforeReserving: "Hvad må vi kalde dig, før du reserverer?",
      name: "Hvad må vi kalde dig?",
      namePlaceholder: "Dit fornavn, fx Mormor eller Esther",
      nameWhy:
        "Dit fornavn er nok. Vi spørger kun, så de andre kan se, hvem der har reserveret hvad. Ingen mail, ingen kode — og det bruges ikke til andet.",
      enter: "Kom ind",
      justLook: "Bare kig først",
    },
    hello: (name: string) => `Hej ${name}`,
    writeYourName: "Skriv dit navn",
    reserved: (title: string) => `✓ Du har reserveret ${title}`,
    reservedWhere: (name: string) =>
      `Den står øverst på ${fmt.genitive(name)} liste, så du kan finde den igen. ${name} kan ikke se det.`,
    lostBefore: "Nogen nåede at reservere ",
    lostAfter: " lige før dig. Find en anden gave på listen.",
    wishesOf: (name: string) => `${fmt.genitive(name)} ønsker`,
    print: "Udskriv",
    howTo: (name: string) => `Reservér det, du vil give, så ingen andre køber det samme. ${name} kan ikke se det.`,
    noWishes: (name: string) => `${name} har ikke skrevet nogen ønsker endnu.`,
    livesHere: "Bor du her? Log ind",
  },
  invitation: {
    welcome: (name: string) => `Velkommen, ${name}. Vælg en kode.`,
    invalid: "Linket er brugt eller ugyldigt. Bed om et nyt.",
  },
  addFromBookmark: {
    title: "Ønsk dig",
    logInFirst: "Log ind i denne browser først, og klik så på bogmærket igen.",
    logIn: "Log ind",
    noLink: "Der kom intet link med. Klik på bogmærket, mens du står på varen.",
    toYourList: "Til din liste",
    toList: (name: string) => `Til ${fmt.genitive(name)} liste`,
  },
};
