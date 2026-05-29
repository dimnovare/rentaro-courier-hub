// Next.js instrumentation hook. `register` runs once per server/edge runtime at
// startup and loads the matching Sentry init module; `onRequestError` forwards
// uncaught server/edge request errors to Sentry.
//
// Both paths are inert without a DSN: the imported config modules only call
// `Sentry.init` when NEXT_PUBLIC_SENTRY_DSN is set, and `captureRequestError`
// is a no-op when Sentry was never initialised.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
