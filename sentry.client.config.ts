// Sentry browser (client) initialisation.
//
// Env-gated: `Sentry.init` is only called when NEXT_PUBLIC_SENTRY_DSN is set, so
// with no DSN configured this module is a complete no-op (no network, no
// instrumentation). This file runs in the browser; the DSN is intentionally a
// public (NEXT_PUBLIC_) value.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Conservative trace sampling — adjust per environment as needed.
    tracesSampleRate: 0.1,
    // Surface SDK logs only when explicitly debugging.
    debug: false,
  });
}
