/** Supported UI locales. `en` is the source-of-truth baseline (Phase 1). */
export const locales = ["en", "et", "lv", "fi", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Name of the cookie that holds the active locale (no i18n routing). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Display label for each locale, in its own language. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  et: "Eesti",
  lv: "Latviešu",
  fi: "Suomi",
  ru: "Русский",
};

/** Type guard: is the given value one of the supported locales? */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
