/**
 * Per-locale legal/policy copy for the /rules, /privacy and /terms pages.
 *
 * `getLegalDocs(locale)` returns the three documents for the requested
 * locale, falling back to English for any unknown locale. Translator agents
 * fill in et/lv/fi/ru by overwriting the matching locale module; until then
 * those modules re-export the English content.
 */

import type { LegalDoc } from "./types";

import * as en from "./en";
import * as et from "./et";
import * as lv from "./lv";
import * as fi from "./fi";
import * as ru from "./ru";

export type { LegalDoc, LegalSection } from "./types";

/** Backward-compatible re-exports (English). */
export { rentalRules, privacyPolicy, termsOfService, cookiePolicy } from "./en";

interface LegalDocs {
  rentalRules: LegalDoc;
  privacyPolicy: LegalDoc;
  termsOfService: LegalDoc;
}

const LEGAL_BY_LOCALE: Record<string, LegalDocs> = {
  en,
  et,
  lv,
  fi,
  ru,
};

/**
 * Returns the rental rules, privacy policy and terms for the given locale,
 * falling back to English for any unknown locale.
 */
export function getLegalDocs(locale: string): LegalDocs {
  const docs = LEGAL_BY_LOCALE[locale] ?? LEGAL_BY_LOCALE.en;
  return {
    rentalRules: docs.rentalRules,
    privacyPolicy: docs.privacyPolicy,
    termsOfService: docs.termsOfService,
  };
}
