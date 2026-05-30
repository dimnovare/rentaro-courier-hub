// src/i18n/alternates.ts
import { locales, defaultLocale, type Locale } from "./config";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app").replace(/\/$/, "");

/** Returns the localized path for a given locale and base path.
 *  English (default) paths are unprefixed; others get a /<locale> prefix. */
export function localePath(locale: Locale, href: string): string {
  const p = href || "/";
  if (locale === defaultLocale) return p;
  return `/${locale}${p === "/" ? "" : p}`;
}

/** Builds the `alternates` object for Next.js `generateMetadata`.
 *  Includes all supported locales + x-default pointing to English. */
export function buildAlternates(locale: Locale, href: string) {
  const base = siteUrl();
  const canonical = `${base}${localePath(locale, href)}`;
  const languages = Object.fromEntries([
    ...locales.map((loc) => [loc, `${base}${localePath(loc, href)}`]),
    ["x-default", `${base}${localePath(defaultLocale, href)}`],
  ]);
  return { canonical, languages };
}
