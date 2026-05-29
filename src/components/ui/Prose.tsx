import type { LegalDoc } from "@/data/legal";

/**
 * Presentational renderer for a legal/policy document (rules, privacy, terms).
 * Constrains to a readable measure (~720px) and styles with the rentaro
 * design tokens via inline styles — no additions to globals.css.
 */
export function Prose({ doc }: { doc: LegalDoc }) {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto" }}>
      <header style={{ marginBottom: 36 }}>
        <h1
          className="h-section"
          style={{ marginBottom: 12 }}
        >
          {doc.title}
        </h1>
        <p
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            margin: "0 0 20px",
          }}
        >
          Last updated · {doc.updated}
        </p>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 16,
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {doc.intro}
        </p>
      </header>

      {doc.sections.map((section) => (
        <section key={section.heading} style={{ marginTop: 36 }}>
          <h2
            style={{
              fontSize: 22,
              letterSpacing: "-0.02em",
              marginBottom: 12,
              color: "var(--text)",
            }}
          >
            {section.heading}
          </h2>
          {section.body.map((para, i) => (
            <p
              key={i}
              style={{
                color: "var(--text-muted)",
                fontSize: 15,
                lineHeight: 1.7,
                margin: i === 0 ? "0" : "12px 0 0",
              }}
            >
              {para}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
