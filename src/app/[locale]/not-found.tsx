import { Link } from "@/i18n/navigation";

/**
 * Not-found boundary for the [locale] segment — catches notFound() from any
 * page below it (e.g. a removed model slug on /models/[slug]) and unmatched
 * child routes, rendering inside the locale layout (nav, footer, dark theme).
 *
 * Server-rendered on purpose: the previous behaviour shipped a BLANK 404 body
 * that only filled in after JS hydration. Copy is plain English by design —
 * catalogue-agnostic, no message-bundle keys (see QA fix notes).
 */
export default function NotFound() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 96, paddingBottom: 96 }}>
        <div className="wrap" style={{ textAlign: "center", maxWidth: 560 }}>
          <div
            className="mono"
            style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--lime)",
              marginBottom: 14,
            }}
          >
            404
          </div>
          <h1 className="h-section" style={{ marginBottom: 14 }}>
            Page not found
          </h1>
          <p className="lead" style={{ margin: "0 auto 30px" }}>
            This page doesn&apos;t exist or is no longer available. The bike you were
            looking for may have left the fleet.
          </p>
          <div
            style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link className="btn btn-primary btn-lg" href="/">
              Back to home
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/models">
              View all models
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
