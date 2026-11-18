import type { Messages } from "../types";
import { fmt } from "./fmt";

export const guest: Messages["guest"] = {
  home: {
    whoLivesHere: "Who lives here?",
    loginIntro: "Log in with your name and your code.",
  },
  login: {
    firstRunPrompt: (name: string) => `First time: choose a code for ${name}.`,
    newPassword: "New code (at least 8 characters)",
    confirmPassword: "Same code again",
    saveAndLogIn: "Save code and log in",
    name: "Your name",
    password: "Code",
    logIn: "Log in",
    noCode: "No code yet? Ask a grown-up in the household for an invitation link.",
  },
  setup: {
    adults: "The grown-ups — the ones who log in",
    adult1Example: "e.g. Sam",
    adult2Example: "e.g. Alex",
    children: "The children — one per line. You look after their lists; they can get their own code later.",
    start: "Get started",
  },
  family: {
    welcome: {
      title: (names: string[]) => `Hello! Here are the wishes from ${fmt.list(names)}.`,
      intro:
        "When you find a present, you can reserve it so nobody else buys the same one. The person who wished for it can't see that — so it stays a surprise.",
      nameBeforeReserving: "What shall we call you before you reserve?",
      name: "What shall we call you?",
      namePlaceholder: "Your first name, e.g. Grandma or Esther",
      nameWhy:
        "Your first name is enough. We only ask so the others can see who has reserved what. No email, no password — and it's used for nothing else.",
      enter: "Come in",
      justLook: "Just have a look first",
    },
    hello: (name: string) => `Hello ${name}`,
    writeYourName: "Add your name",
    reserved: (title: string) => `✓ You have reserved ${title}`,
    reservedWhere: (name: string) =>
      `It's at the top of ${fmt.genitive(name)} list, so you can find it again. ${name} can't see that.`,
    lostBefore: "Someone else reserved ",
    lostAfter: " just before you. Pick another present from the list.",
    wishesOf: (name: string) => `${fmt.genitive(name)} wishes`,
    print: "Print",
    howTo: (name: string) => `Reserve what you'd like to give, so nobody else buys the same thing. ${name} can't see that.`,
    noWishes: (name: string) => `${name} hasn't added any wishes yet.`,
    livesHere: "Live here? Log in",
  },
  invitation: {
    welcome: (name: string) => `Welcome, ${name}. Choose a code.`,
    invalid: "This link has been used or isn't valid. Ask for a new one.",
  },
  addFromBookmark: {
    title: "Wish",
    logInFirst: "Log in here in this browser first, then click the bookmark again.",
    logIn: "Log in",
    noLink: "No link came through. Click the bookmark while you're on the item's page.",
    toYourList: "Add to your list",
    toList: (name: string) => `Add to ${fmt.genitive(name)} list`,
  },
};
