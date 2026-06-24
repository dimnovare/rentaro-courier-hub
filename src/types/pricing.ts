/** Pricing plan types. Term-based, uniform across every bike. */

export type PlanId = "p30" | "p180" | "p365";

/**
 * Admin-managed text that varies by language: a map of locale → list of strings
 * (e.g. { en: ["Service support included", …], et: […], lv, fi, ru }). Consumers
 * render the current locale's list, falling back to `en` when a locale has no
 * entries. Used for per-plan perks and the hero marquee items.
 */
export type LocalizedStrings = Record<string, string[]>;

export interface PricingPlan {
  id: PlanId;
  /** Display term, e.g. "30 days". */
  term: string;
  months: number;
  /** Daily rate in EUR. */
  daily: number;
  /** Price per 30-day period (daily × 30) in EUR. */
  monthly: number;
  tag: string;
  featured: boolean;
  /** Per-language perk lists (admin-managed). Render perks[locale] ?? perks.en. */
  perks: LocalizedStrings;
}
