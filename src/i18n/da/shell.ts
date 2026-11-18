/** The frame around every page: title, Home Screen, install hint, manifest. */
export const shell = {
  appName: "Ønskeliste",
  /** Under the icon on the Home Screen: short, or iOS cuts it. */
  homeScreenName: "Ønsker",
  /** The web manifest's description. */
  description: "Familiens ønskelister",
  /** The signed Shortcut's download name (src/app/hushlist.shortcut): ASCII, as it goes in a header. */
  shortcutFile: "Tilføj til Ønskeliste.shortcut",
  installHint: {
    title: "Læg Ønskelisten på hjemmeskærmen",
    close: "Luk",
    /** iOS's own labels, as on the phone. */
    share: "Del",
    addToHomeScreen: "Føj til hjemmeskærm",
    footer:
      "Ser du ikke Del, så ligger den i menuen ved adresselinjen. Bagefter åbner Ønskelisten som en app, med sit eget ikon.",
  },
};
