import type { MetadataRoute } from "next";
import { bikeModels } from "@/data/bikeModels";
import { cities } from "@/data/cities";
import { getSiteUrl } from "@/lib/site";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/alternates";
import { isWindDownMode, legalSitemapPaths } from "@/lib/windDown";

const base = getSiteUrl();

function toSitemapEntry(href: string, now: Date): MetadataRoute.Sitemap[number] {
  const languages = Object.fromEntries([
    ...locales.map((loc: Locale) => [loc, `${base}${localePath(loc, href)}`]),
    ["x-default", `${base}${localePath(defaultLocale, href)}`],
  ]);
  return {
    url: `${base}${localePath(defaultLocale, href)}`,
    lastModified: now,
    alternates: { languages },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  // In wind-down mode every commercial route redirects to the noindex
  // /wind-down notice, so the sitemap is trimmed to the legal pages only
  // (the notice itself is deliberately excluded — it is noindex).
  const windDown = isWindDownMode(process.env.NEXT_PUBLIC_BUSINESS_MODE);

  const staticRoutes = windDown
    ? [...legalSitemapPaths]
    : [
        "/",
        "/models",
        "/pricing",
        "/how-it-works",
        "/accessories",
        "/faq",
        "/rules",
        "/privacy",
        "/terms",
        "/book",
        "/monthly-ebike-rental",
        "/delivery-ebike-rental",
        "/ebike-rental-for-couriers",
      ];
  const modelRoutes = windDown ? [] : bikeModels.map((m) => `/models/${m.slug}`);
  const cityRoutes = windDown ? [] : cities.map((c) => `/cities/${c.id}`);
  const now = new Date();

  return [...staticRoutes, ...modelRoutes, ...cityRoutes].map((path) =>
    toSitemapEntry(path, now)
  );
}
