import type { Messages } from "../types";
import { fmt } from "./fmt";

export const server: Messages["server"] = {
  actions: {
    needAdult: "There must be at least one grown-up.",
    wrongLogin: "Wrong name or code.",
    pickPerson: "Choose a person.",
    codeAlreadyChosen: "A code has already been chosen. Try again.",
    ipBlocked: "Too many wrong attempts from this connection. Try again in ten minutes.",
    codeTooShort: (min: number) => `The code must be at least ${min} characters.`,
    codesDiffer: "The two codes don't match.",
    alreadyHasCode: "That person already has a code.",
    inviteInvalid: "This link has been used or is not valid.",
    emptyWish: "Write a wish or paste a link.",
    shopRefused: "The shop wouldn't show us the details. Add them to the wish yourself.",
    added: "Added.",
    noLines: "No lines to add.",
    tooManyLines: (max: number, count: number) => `At most ${max} at a time — there were ${count}.`,
    imported: (count: number, name: string) =>
      count === 1 ? `1 wish added to ${name}.` : `${count} wishes added to ${name}.`,
    importUnfetched: (count: number) =>
      count === 1
        ? "1 shop wouldn't show details — fix it with Edit."
        : `${count} shops wouldn't show details — fix them with Edit.`,
    needTitle: "The wish needs a title.",
    badUrl: "The link must be a web address.",
    tooManyAttempts: "Too many attempts. Wait a moment.",
    currentWrong: "The current code is wrong.",
    minLength: (min: number) => `At least ${min} characters.`,
    passwordChanged: "Your code has been changed. Other devices have been logged out.",
  },
  api: {
    wrongKey: "Wrong key.",
    tooLarge: "Too large.",
    expectedJson: "Expected JSON.",
    noLink: "No link.",
    unknownList: (name: string) => `No list found for "${name}".`,
    ownList: "your list",
    listOf: (name: string) => `${fmt.genitive(name)} list`,
    added: (where: string) => `Added to ${where}.`,
    addedUnfetched: (where: string) => `Added to ${where} — fix the title in the app.`,
  },
  upload: {
    forbidden: "No.",
    logInAgain: "Please log in again.",
    notYours: "Not your wish.",
    tooLarge: "The picture is too large.",
    pickImage: "Choose a picture.",
    notAnImage: "That couldn't be read as a picture.",
  },
};
