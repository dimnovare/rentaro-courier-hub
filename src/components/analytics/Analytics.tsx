import Script from "next/script";

/**
 * Env-gated analytics. Renders nothing unless the matching public env var is
 * set at build time, so local/dev and preview builds stay clean and no
 * third-party script loads without configuration.
 *
 *   NEXT_PUBLIC_POSTHOG_KEY   → PostHog (optional NEXT_PUBLIC_POSTHOG_HOST)
 *   NEXT_PUBLIC_GA_ID         → Google Analytics 4 (gtag)
 *
 * No external npm packages — both providers load via their CDN snippet through
 * next/script with afterInteractive strategy.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function PostHog({ apiKey, host }: { apiKey: string; host: string }) {
  return (
    <Script id="posthog-init" strategy="afterInteractive">
      {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(
        apiKey
      )},{api_host:${JSON.stringify(host)}});`}
    </Script>
  );
}

function GoogleAnalytics({ id }: { id: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(
          id
        )});`}
      </Script>
    </>
  );
}

export function Analytics() {
  if (!POSTHOG_KEY && !GA_ID) return null;
  return (
    <>
      {POSTHOG_KEY && <PostHog apiKey={POSTHOG_KEY} host={POSTHOG_HOST} />}
      {GA_ID && <GoogleAnalytics id={GA_ID} />}
    </>
  );
}
