// Wind-down mode: when the business stops taking new rentals, every commercial
// (acquisition) surface is redirected to a single localized notice page while
// the customer portal, booking status/success, admin console, API/BFF routes
// and legal pages stay live. The redirect set below is the single source of
// truth shared by `next.config.ts` (declarative `redirects()`), the sitemap
// and robots — so wiring stays consistent and is unit-testable in isolation.

/** The env flag that turns wind-down mode on. Kept as a named constant so the
 *  page, config and tests all agree on the exact value. */
export const WIND_DOWN_MODE = "wind_down";

/** True when the business is winding down (reads `NEXT_PUBLIC_BUSINESS_MODE`). */
export function isWindDownMode(mode: string | undefined): boolean {
  return mode === WIND_DOWN_MODE;
}

/** The localized wind-down notice route (English, unprefixed). */
export const WIND_DOWN_PATH = "/wind-down";

/**
 * Commercial route sources that must redirect to the wind-down notice.
 *
 * These are the acquisition surfaces from the frontend audit. KEEP-ACTIVE
 * routes are deliberately absent and must NEVER appear here:
 *   /my-rental, /feedback, /booking/status, /booking/success,
 *   /admin/*, /api/*, /privacy, /terms, /rules — and /wind-down itself.
 *
 * `:slug` / `:city` match a single dynamic segment (model detail, city landing).
 * `/book` is included so the booking wizard is disabled by the redirect itself,
 * independent of any backend/mock-data fallback behaviour.
 */
export const commercialRedirectPaths = [
  "/",
  "/models",
  "/models/:slug",
  "/pricing",
  "/accessories",
  "/how-it-works",
  "/cities/:city",
  "/book",
  "/faq",
  "/monthly-ebike-rental",
  "/delivery-ebike-rental",
  "/ebike-rental-for-couriers",
] as const;

/** Robots `disallow` prefixes for the commercial surfaces (no dynamic params).
 *  `/` is intentionally omitted so legal pages and the notice stay crawlable. */
export const commercialDisallowPaths = [
  "/models",
  "/pricing",
  "/accessories",
  "/how-it-works",
  "/cities",
  "/book",
  "/faq",
  "/monthly-ebike-rental",
  "/delivery-ebike-rental",
  "/ebike-rental-for-couriers",
] as const;

/** Legal routes that remain in the sitemap during wind-down. */
export const legalSitemapPaths = ["/privacy", "/terms", "/rules"] as const;

/** The non-default locales that carry a `/<locale>` path prefix. */
const LOCALE_PREFIX = "/:locale(et|lv|fi|ru)";

export interface ConfigRedirect {
  source: string;
  destination: string;
  permanent: false;
}

/**
 * Builds the temporary (307) commercial → wind-down redirects for every locale.
 * Returns an empty list when not in wind-down mode, so the code ships inert and
 * the normal site is unaffected until `NEXT_PUBLIC_BUSINESS_MODE=wind_down`.
 *
 * Each commercial path gets two rules: the unprefixed (English) source and the
 * `/:locale(et|lv|fi|ru)/…` variant. The root `/` maps to the bare locale
 * segment (`/et`, `/lv`, …). `permanent: false` keeps the URLs restorable after
 * the wind-down, and `/wind-down` is never a source (no redirect loop).
 */
export function buildWindDownRedirects(mode: string | undefined): ConfigRedirect[] {
  if (!isWindDownMode(mode)) return [];

  const redirects: ConfigRedirect[] = [];
  for (const path of commercialRedirectPaths) {
    redirects.push({ source: path, destination: WIND_DOWN_PATH, permanent: false });
    const localizedSource = path === "/" ? LOCALE_PREFIX : `${LOCALE_PREFIX}${path}`;
    redirects.push({
      source: localizedSource,
      destination: `/:locale${WIND_DOWN_PATH}`,
      permanent: false,
    });
  }
  return redirects;
}
