import type { Messages } from "../types";
import { fmt } from "./fmt";

export const settings: Messages["settings"] = {
  title: "Settings",
  back: "← Back",
  save: "Save",

  familyLink: {
    title: "The family link",
    intro: "Send it to the family. With it, anyone can see every list and reserve gifts — on yours too. Don't give it to the children.",
    rotateQuestion: "Make a new family link? The old one stops working for everyone who has it.",
    rotate: "Make a new link",
  },

  invite: {
    title: "Invite",
    intro:
      "Anyone without a code yet gets in with an invitation link. A child with their own code can write their own list and reserve on the others' lists — but never sees what has been reserved for them.",
    make: (name: string) => `Make an invitation link for ${name}`,
    shareText: (name: string) => `Here is your invitation to our wishlists, ${name}. The link works once.`,
    shareTitle: "Invitation",
    shareLabel: (name: string) => `Share the invitation with ${name}`,
    sendTo: (name: string) => `Send it to ${name}. It works once, for 7 days.`,
  },

  birthdays: {
    title: "Birthdays",
    intro: "Only used to group fulfilled wishes under the right birthday. No year, just day and month.",
    day: "Day",
    month: "Month",
    dayFor: (name: string) => `Day for ${name}`,
    monthFor: (name: string) => `Month for ${name}`,
    dayOption: (n: number) => `${n}`,
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    saved: "Saved ✓",
  },

  children: {
    title: "The children",
    resetQuestion: (name: string) => `Reset ${fmt.genitive(name)} code? They will then need a new invitation link.`,
    reset: "Reset code",
    removeQuestion: (name: string) => `Remove ${name} and all ${fmt.genitive(name)} wishes?`,
    remove: "Remove",
    addPlaceholder: "Add a child",
    add: "Add",
  },

  import: {
    title: "Import wishes",
    intro:
      "Got a list somewhere else — Notes, another wishlist, an email? Paste it in here. One wish per line; links are fetched with picture and price.",
    myList: "My list",
    listOf: (name: string) => `${fmt.genitive(name)} list`,
    placeholder: "One wish per line — a link, or text.\nhttps://…  title — a note\nHammer drill — corded",
    pending: "Fetching… this can take a moment",
    submit: "Import",
  },

  iphone: {
    title: "Wish from your iPhone",
    intro: "A shortcut in the Share menu: share an item from Safari or a shop's app, and it lands on a list.",
    shortcutName: "Add to Hushlist",
    signed: {
      step1: { before: "Tap ", key: "Make a key", middle: " below, and tap ", copy: "Copy", after: ". The key is only shown once." },
      step2: {
        before: "Tap ",
        get: "Get the shortcut",
        after: ", and open the file. If it doesn't open by itself, it is in Safari's downloads (the arrow in the address bar).",
        afterLink: ". It opens in Shortcuts.",
      },
      step3: {
        before: "Tap ",
        add: "Add Shortcut",
        after: ", and paste the key when it asks.",
        afterPublic: ". It asks for the key and for the address below: paste them in.",
      },
      // Apple's English label (support.apple.com/guide/shortcuts/apdfeb05586f).
      scripts: {
        before: "Once: ",
        path: "Settings → Apps → Shortcuts → Advanced",
        middle: ", turn on ",
        toggle: "Allow Running Scripts",
        after: ". Otherwise the shortcut cannot read the page in Safari.",
      },
      step4: {
        before: "On an item: ",
        share: "Share",
        middle: ". It asks whose list, if you have more than one. The first time, it may be under ",
        edit: "Edit Actions",
        after: " at the bottom of the Share menu.",
      },
    },
    unsigned: "Make a key here, and build the shortcut as described below. The key is only shown once.",
    deleteKey: "Delete the key",
    download: "Get the shortcut",
    downloadInSafari: "The shortcut is downloaded in Safari, not here in the app. Copy the address, paste it into Safari, and tap Get the shortcut there.",
    copySettingsAddress: "Copy the address",
    publicLink: { address: "The address the shortcut asks for:" },
    link: {
      summary: "Share the shortcut with an iCloud link",
      intro:
        "If you have the shortcut on your iPhone, share it: Shortcuts → touch and hold the shortcut → Share → Copy iCloud Link, and paste the link here. Then the others get it with one tap, from the Home Screen too. Your key is not included.",
      save: "Save",
      clearHint: "Empty the field and tap Save to remove the link.",
    },
    buildYourself: "Or build it yourself",
    howToBuild: "How to build the shortcut",
    build: {
      step1: {
        before: "Open Shortcuts → + → the shortcut's details (ⓘ): turn on ",
        shareSheet: "Show in Share Sheet",
        after: ", input: URLs and Safari web pages.",
      },
      step2: { before: "Add the action ", action: "Get Contents of URL", after: " with the address ", end: "." },
      step3: { method: "Method ", header: ". Headers: ", plus: " + a space + your key." },
      step4: {
        body: "Request Body ",
        field: ": field ",
        input: "Shortcut Input",
        child: ". For a child's list: add a field ",
        childAfter: " with the child's name.",
      },
      step5: { before: "Add ", dictionary: "Get Dictionary Value", middle: " for ", and: ", and ", notify: "Show Notification", after: " with it." },
    },
    safari: {
      summary: "Shops that turn us away (H&M): a shortcut for Safari",
      intro:
        "Some shops let your phone in, but not our server. Make a copy of the shortcut that only takes Safari web pages, and let the phone read the page:",
      step1: { before: "Input: only ", pages: "Safari web pages", after: "." },
      step2: { before: "Before ", getUrl: "Get Contents of URL", middle: ": add ", runJs: "Run JavaScript on Web Page", after: " with the code below." },
      step3: { before: "In the request body: add a field ", result: "JavaScript Result", after: "." },
    },
  },

  bookmark: {
    title: "Wish from your computer",
    intro: "A bookmark that puts the item from a web shop on a list.",
    step1: { before: "Show the bookmarks bar if it is hidden: ", mac: " on a Mac, ", after: " on Windows." },
    step2: "Drag the button below up onto the bar.",
    step3: {
      before: "On an item, click ",
      button: "Wish",
      after: ", and choose whose list it goes on. You need to be logged in here, in the same browser.",
    },
    link: "＋ Wish",
  },

  language: {
    title: "Language",
    intro: "For the whole family, guests included.",
  },

  otherDevices: "Guide for another device",

  code: {
    title: "Your code",
    logout: "Log out",
    current: "Current code",
    next: "New code (at least 8 characters)",
    change: "Change code",
  },

  apiKey: {
    pasteNow: "Paste it into the shortcut now. It won't be shown again.",
    newQuestion: "Make a new key? The old one stops working in the shortcut.",
    makeNew: "Make a new key",
    make: "Make a key",
  },

  acceptInvite: {
    password: "New code (at least 8 characters)",
    confirm: "The same code again",
    submit: "Save code and log in",
  },
};
