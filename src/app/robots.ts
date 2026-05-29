import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/booking/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
