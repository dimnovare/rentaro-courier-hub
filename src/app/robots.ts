import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app").replace(/\/$/, "");

const privatePaths = ["/admin", "/my-rental", "/booking/success"];
const localePrefixes = ["et", "lv", "fi", "ru"];

const disallow: string[] = [
  ...privatePaths,
  ...localePrefixes.flatMap((loc) => privatePaths.map((p) => `/${loc}${p}`)),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${base}/sitemap.xml`,
  };
}
