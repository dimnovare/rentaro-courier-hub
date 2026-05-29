// Sentry server (Node.js runtime) initialisation.
//
// Env-gated: `Sentry.init` is only called when a DSN is configured, so with no
// DSN this module is a complete no-op. NEXT_PUBLIC_SENTRY_DSN is the single
// source of truth for the DSN across client, server and edge.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Conservative trace sampling — adjust per environment as needed.
    tracesSampleRate: 0.1,
    debug: false,
  });
}
