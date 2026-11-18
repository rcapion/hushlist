import type { MetadataRoute } from "next";

import { getT } from "@/i18n/server";

// In the household's language, read from the database per request.
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const t = getT();
  return {
    name: t.shell.appName,
    short_name: t.shell.homeScreenName,
    description: t.shell.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#f7f4ef",
    // Opaque, full-bleed brand colour: a light square glared on a dark home
    // screen (Richard, 2026-11-16). The maskable one keeps the gift in the safe zone.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
