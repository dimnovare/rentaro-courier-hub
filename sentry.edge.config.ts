// Sentry edge (Edge runtime / middleware) initialisation.
//
// Env-gated: `Sentry.init` is only called when a DSN is configured, so with no
// DSN this module is a complete no-op. Loaded by `instrumentation.ts` whenever
// the runtime is "edge".
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
