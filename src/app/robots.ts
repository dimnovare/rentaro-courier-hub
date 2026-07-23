import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { commercialDisallowPaths, isWindDownMode } from "@/lib/windDown";

const base = getSiteUrl();

const privatePaths = ["/admin", "/my-rental", "/booking/success"];
const localePrefixes = ["et", "lv", "fi", "ru"];

function withLocaleVariants(paths: readonly string[]): string[] {
  return [
    ...paths,
    ...localePrefixes.flatMap((loc) => paths.map((p) => `/${loc}${p}`)),
  ];
}

export default function robots(): MetadataRoute.Robots {
  // In wind-down mode the commercial routes 307 to the noindex /wind-down page;
  // also disallow them here so crawlers stop requesting the stale surfaces.
  // `/` stays crawlable so the legal pages and the notice remain reachable.
  const windDown = isWindDownMode(process.env.NEXT_PUBLIC_BUSINESS_MODE);
  const disallow: string[] = [
    ...withLocaleVariants(privatePaths),
    ...(windDown ? withLocaleVariants(commercialDisallowPaths) : []),
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${base}/sitemap.xml`,
  };
}
