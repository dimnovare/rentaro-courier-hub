import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

/**
 * PWA web app manifest (auto-served by Next at /manifest.webmanifest and
 * linked from <head>). On-brand near-black / electric-lime, installable as a
 * standalone app. Icons are static PNGs under /public (generated from the lime
 * "R" logo mark) so installed-app icons stay crisp at every launcher size.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "rentaro — delivery e-bikes by the month",
    short_name: "rentaro",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0A0C11",
    theme_color: "#0A0C11",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
