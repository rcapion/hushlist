import { fmt } from "./fmt";

/** Indstillinger: the page, its forms, the iPhone Shortcut and bookmark guides, and the invitation form. */
export const settings = {
  title: "Indstillinger",
  back: "← Tilbage",
  save: "Gem",

  familyLink: {
    title: "Familielinket",
    intro: "Send det til familien. Med det kan man se alle lister og reservere gaver — også på din. Giv det ikke til børnene.",
    rotateQuestion: "Lav et nyt familielink? Det gamle holder op med at virke for alle, der har det.",
    rotate: "Lav et nyt link",
  },

  invite: {
    title: "Invitér",
    intro:
      "Har man ingen kode endnu, kommer man ind med et invitationslink. Et barn med egen kode kan skrive sin egen liste og reservere hos de andre — men ser aldrig, hvad der er reserveret til det selv.",
    make: (name: string) => `Lav invitationslink til ${name}`,
    shareText: (name: string) => `Her er din invitation til vores ønskelister, ${name}. Linket virker én gang.`,
    shareTitle: "Invitation",
    shareLabel: (name: string) => `Del invitationen med ${name}`,
    sendTo: (name: string) => `Send det til ${name}. Det virker én gang, i 7 dage.`,
  },

  birthdays: {
    title: "Fødselsdage",
    intro: "Bruges kun til at samle de opfyldte ønsker under den rigtige fødselsdag. Intet år, bare dag og måned.",
    day: "Dag",
    month: "Måned",
    dayFor: (name: string) => `Dag for ${name}`,
    monthFor: (name: string) => `Måned for ${name}`,
    /** Spelled out, not from Intl: the server's and the browser's ICU may differ, and the <option>s must hydrate. */
    dayOption: (n: number) => `${n}.`,
    months: ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."],
    saved: "Gemt ✓",
  },

  children: {
    title: "Børnene",
    resetQuestion: (name: string) => `Nulstil ${fmt.genitive(name)} kode? Så skal der et nyt invitationslink til.`,
    reset: "Nulstil kode",
    removeQuestion: (name: string) => `Fjern ${name} og alle ${fmt.genitive(name)} ønsker?`,
    remove: "Fjern",
    addPlaceholder: "Tilføj et barn",
    add: "Tilføj",
  },

  import: {
    title: "Importér ønsker",
    intro:
      "Har du en liste et andet sted — Noter, en anden ønskeliste, en mail — så sæt den ind her. Ét ønske pr. linje; links bliver hentet med billede og pris.",
    myList: "Min liste",
    listOf: (name: string) => `${fmt.genitive(name)} liste`,
    placeholder: "Ét ønske pr. linje — et link, eller tekst.\nhttps://…  titel — en note\nBorehammer — med ledning",
    pending: "Henter… det kan tage lidt tid",
    submit: "Importér",
  },

  iphone: {
    title: "Ønsk dig fra iPhone",
    intro: "En genvej i Del-menuen: del en vare fra Safari eller en butiks-app, så lander den på en liste.",
    /** The name the signed Shortcut is saved under, and what shows in the share sheet. */
    shortcutName: "Ønskeliste",
    signed: {
      step1: { before: "Tryk ", key: "Lav en nøgle", middle: " herunder, og tryk ", copy: "Kopiér", after: ". Nøglen vises kun én gang." },
      step2: {
        before: "Tryk ",
        get: "Hent genvejen",
        after: ", og åbn filen. Åbner den ikke af sig selv, så ligger den i Safaris overførsler (pilen i adresselinjen).",
      },
      step3: { before: "Tryk ", add: "Tilføj genvej", after: ", og sæt nøglen ind, når den spørger." },
      step4: {
        before: "Står du på en vare: ",
        share: "Del",
        middle: ". Den spørger, hvis liste, når du har flere. Første gang ligger den måske under ",
        edit: "Rediger handlinger",
        after: " nederst i Del-menuen.",
      },
    },
    unsigned: "Lav en nøgle her, og byg genvejen som beskrevet nedenfor. Nøglen vises kun én gang.",
    deleteKey: "Slet nøglen",
    download: "Hent genvejen",
    buildYourself: "Eller byg den selv",
    howToBuild: "Sådan bygger du genvejen",
    build: {
      step1: {
        before: "Åbn Genveje → + → Indstillinger for genvejen: slå ",
        shareSheet: "Vis i delingsark",
        after: " til, input: URL'er og Safari-websider.",
      },
      step2: { before: "Tilføj handlingen ", action: "Hent indhold af URL", after: " med adressen ", end: "." },
      step3: { method: "Metode ", header: ". Overskrift: ", plus: " + mellemrum + din nøgle." },
      step4: {
        body: "Anmodningstekst ",
        field: ": felt ",
        input: "Genvejsinput",
        child: ". Til et barns liste: tilføj felt ",
        childAfter: " med barnets navn.",
      },
      step5: { before: "Tilføj ", dictionary: "Hent ordbogsværdi", middle: " for ", and: ", og ", notify: "Vis notifikation", after: " med den." },
    },
    safari: {
      summary: "Butikker der afviser os (H&M): en genvej til Safari",
      intro:
        "Nogle butikker lukker din telefon ind, men ikke vores server. Lav en kopi af genvejen, der kun tager Safari-websider, og lad telefonen læse siden:",
      step1: { before: "Input: kun ", pages: "Safari-websider", after: "." },
      step2: { before: "Før ", getUrl: "Hent indhold af URL", middle: ": tilføj ", runJs: "Kør JavaScript på webside", after: " med koden herunder." },
      step3: { before: "I anmodningsteksten: tilføj felt ", result: "Resultat af JavaScript", after: "." },
    },
  },

  bookmark: {
    title: "Ønsk dig fra computeren",
    intro: "Et bogmærke, der lægger varen fra en webshop på en liste.",
    step1: { before: "Vis bogmærkelinjen, hvis den er skjult: ", mac: " på en Mac, ", after: " i Windows." },
    step2: "Træk knappen herunder op på linjen.",
    step3: {
      before: "Står du på en vare, så klik på ",
      button: "Ønsk dig",
      after: ", og vælg hvis liste den skal på. Du skal være logget ind her i samme browser.",
    },
    link: "＋ Ønsk dig",
  },

  language: {
    title: "Sprog",
    intro: "Gælder for hele familien, også gæsterne.",
  },

  otherDevices: "Vejledning til en anden enhed",

  code: {
    title: "Din kode",
    logout: "Log ud",
    current: "Nuværende kode",
    next: "Ny kode (mindst 8 tegn)",
    change: "Skift kode",
  },

  apiKey: {
    pasteNow: "Sæt den ind i genvejen nu. Den bliver ikke vist igen.",
    newQuestion: "Lav en ny nøgle? Den gamle holder op med at virke i genvejen.",
    makeNew: "Lav en ny nøgle",
    make: "Lav en nøgle",
  },

  /** The form on an invitation link (/invitation/…). */
  acceptInvite: {
    password: "Ny kode (mindst 8 tegn)",
    confirm: "Samme kode igen",
    submit: "Gem kode og log ind",
  },
};
