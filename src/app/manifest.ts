import type { MetadataRoute } from "next";

/**
 * PWA web app manifest (auto-served by Next at /manifest.webmanifest and
 * linked from <head>). On-brand near-black / electric-lime, installable as a
 * standalone app. Icons point at the generated routes from icon.tsx and
 * apple-icon.tsx so there are no extra static assets to maintain.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "rentaro — delivery e-bikes by the month",
    short_name: "rentaro",
    description:
      "Rent a delivery-built e-bike by the month in Tallinn, Riga and Helsinki — monthly plans with service support, lock, charger and extra-battery options.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0C11",
    theme_color: "#0A0C11",
    categories: ["business", "travel", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
