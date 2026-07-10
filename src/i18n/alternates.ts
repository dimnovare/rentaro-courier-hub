// src/i18n/alternates.ts
import { getSiteUrl } from "@/lib/site";
import { locales, defaultLocale, type Locale } from "./config";

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
  const base = getSiteUrl();
  const canonical = `${base}${localePath(locale, href)}`;
  const languages = Object.fromEntries([
    ...locales.map((loc) => [loc, `${base}${localePath(loc, href)}`]),
    ["x-default", `${base}${localePath(defaultLocale, href)}`],
  ]);
  return { canonical, languages };
}
