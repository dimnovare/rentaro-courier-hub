import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    // Model slugs removed in the 2026-07 catalogue prune. Google still ranks
    // and sends clicks to these URLs (GSC), so 301 them (and their localized
    // variants) to the live catalogue instead of a 404.
    const removedModelSlugs = "(air-one-pro|air-20pro|air-28pro|air-20s|air-30pro)";
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.rentaro.ee" }],
        destination: "https://rentaro.ee/:path*",
        permanent: true,
      },
      {
        source: `/models/:slug${removedModelSlugs}`,
        destination: "/models",
        permanent: true,
      },
      {
        source: `/:locale(et|lv|fi|ru)/models/:slug${removedModelSlugs}`,
        destination: "/:locale/models",
        permanent: true,
      },
    ];
  },

  // Static assets under /public/assets are content-stable (fingerprinted by the
  // build/CDN or replaced wholesale), so serve them with a long immutable cache.
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

// Compose both plugins: next-intl wraps the base config first (so its i18n
// request handling stays intact), then Sentry's build-time wrapper is applied
// around the result. Sentry's build features (source-map upload) only activate
// when an auth token is present, so this is inert in plain local/CI builds.
export default withSentryConfig(withNextIntl(nextConfig), {
  // Org/project are read from the environment so they can stay out of source.
  // Both are optional — without them (and without SENTRY_AUTH_TOKEN) the plugin
  // performs no upload and simply passes the config through.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Keep the build quiet; only log when explicitly debugging.
  silent: !process.env.CI,

  // Strip Sentry SDK logger statements from the client bundle in production.
  disableLogger: true,
});
