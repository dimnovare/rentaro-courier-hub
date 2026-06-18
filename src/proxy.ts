// src/proxy.ts
// Next.js 16 renames middleware.ts → proxy.ts (function middleware → proxy).
// next-intl's createMiddleware provides locale detection, cookie sync, and
// path-prefix rewriting based on the routing config.
//
// We wrap it with a thin geo-detection layer: on a request that has no explicit
// NEXT_LOCALE cookie, we map the Vercel-provided origin country to a locale and
// seed the cookie *on the request* before delegating. next-intl then treats it
// like an existing locale preference. createMiddleware still owns every redirect,
// so the "as-needed" /en→unprefixed behaviour (and all SEO/canonical work) is
// untouched and there are no redirect loops.
//
// Resolution order ends up: explicit cookie > geo country > Accept-Language > en.
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";

const intlMiddleware = createMiddleware(routing);

// Origin country (ISO 3166-1 alpha-2) → preferred locale. English is the default
// and intentionally has no mapping, so EN-speaking origins fall through to
// Accept-Language / the default locale rather than being forced.
const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  EE: "et",
  LV: "lv",
  FI: "fi",
  RU: "ru",
};

export default function proxy(req: NextRequest) {
  const hasCookie = isLocale(req.cookies.get(LOCALE_COOKIE)?.value);
  if (!hasCookie) {
    const country = req.headers.get("x-vercel-ip-country")?.toUpperCase();
    const geoLocale = country ? COUNTRY_TO_LOCALE[country] : undefined;
    if (geoLocale) {
      // Seed the cookie on the request so next-intl's detection picks it up. We
      // do NOT redirect ourselves — createMiddleware decides whether to prefix.
      req.cookies.set(LOCALE_COOKIE, geoLocale);
    }
  }
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, and metadata files.
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\..*).*)",
  ],
};
