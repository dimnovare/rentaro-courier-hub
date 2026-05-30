/**
 * Consent-gated analytics event helper.
 *
 * `track(event, props?)` is the single entry point the whole app uses to record
 * a funnel event. It is a hard NO-OP unless the visitor has granted analytics
 * consent — it re-reads the same `rentaro_consent=granted` cookie that
 * components/analytics/Analytics.tsx gates the provider scripts on, so nothing
 * is ever sent before consent (GDPR-critical). The check runs on every call, so
 * a "deny" choice (or no choice yet) keeps every event suppressed for the whole
 * session without any extra wiring.
 *
 * When consent IS granted it forwards the event to whichever provider the
 * Analytics component actually loaded:
 *   - PostHog  → window.posthog.capture(event, props)   (NEXT_PUBLIC_POSTHOG_KEY)
 *   - GA4      → window.gtag("event", event, props)      (NEXT_PUBLIC_GA_ID)
 *
 * If no provider env var is configured those globals never exist, so `track`
 * stays a safe no-op even with consent — which is exactly the local/dev and
 * preview state today. The moment a key is added (and the visitor accepts) the
 * same calls start flowing to the real provider with no code changes here.
 *
 * Keep props PII-free: ids, plan, city, step and source only — never email,
 * name or phone.
 */

import { CONSENT_COOKIE } from "@/components/ui/CookieConsent";

type Props = Record<string, unknown>;

interface PostHogLike {
  capture?: (event: string, props?: Props) => void;
}
type GtagLike = (command: "event", event: string, props?: Props) => void;

declare global {
  interface Window {
    posthog?: PostHogLike;
    gtag?: GtagLike;
  }
}

/** True only when the visitor has explicitly granted analytics consent. */
function consentGranted(): boolean {
  if (typeof document === "undefined") return false;
  return new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=granted`).test(document.cookie);
}

/**
 * Record a funnel event. No-op unless analytics consent is granted; safe to call
 * from anywhere (server or client) — it self-guards on `document`/consent and on
 * whether a provider is present. Never throws.
 */
export function track(event: string, props?: Props): void {
  if (!consentGranted()) return;
  if (typeof window === "undefined") return;
  try {
    window.posthog?.capture?.(event, props);
    window.gtag?.("event", event, props);
  } catch {
    // Analytics must never break a user flow.
  }
}
