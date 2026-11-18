"use client";

import { createContext, useContext } from "react";

import { FALLBACK_LOCALE, messagesFor, type Locale, type Messages } from "@/i18n";

/*
 * Only the locale crosses from server to client: the messages hold functions,
 * which cannot be serialised. Both languages are small, so the client bundle
 * carries them and picks one.
 */
const LocaleContext = createContext<Locale>(FALLBACK_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The messages for client components. */
export function useT(): Messages {
  return messagesFor(useContext(LocaleContext));
}
