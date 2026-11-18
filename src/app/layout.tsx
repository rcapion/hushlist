import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

import { InstallHint } from "@/components/install-hint";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getT } from "@/i18n/server";

// Downloaded at build time and served from our own origin: no browser asks
// Google for anything, and the CSP (font-src 'self') holds.
const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-source-serif",
});

// Every page reads the household's language from the database, so nothing is
// prerendered at build time — and a build never opens a database.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return {
    title: t.shell.appName,
    // The guest view is behind a secret link; keep it out of search engines.
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: t.shell.homeScreenName, statusBarStyle: "default" },
    icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#f7f4ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const t = getT();
  return (
    <html lang={t.meta.htmlLang} className={sourceSerif.variable}>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={getLocale()}>
          {children}
          <InstallHint />
        </I18nProvider>
      </body>
    </html>
  );
}
