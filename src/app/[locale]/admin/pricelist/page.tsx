"use client";

/**
 * Admin → Pricelist (FUTURE / scaffold only).
 *
 * A clearly-marked placeholder for an upcoming road-assist / tech-assist /
 * maintenance pricelist with parts. There is NO backend behind this yet — the
 * sections below are static "Coming soon" previews so the navigation slot and
 * the intended shape are visible to operators. Wire it to an API in a later
 * pass; until then it stays read-only and obviously unfinished.
 */

interface PreviewLine {
  label: string;
  note: string;
}

interface PreviewSection {
  title: string;
  blurb: string;
  lines: PreviewLine[];
}

const SECTIONS: PreviewSection[] = [
  {
    title: "Road assist",
    blurb: "On-the-spot help when a courier is stuck mid-shift.",
    lines: [
      { label: "Roadside callout", note: "price TBD" },
      { label: "On-site battery swap", note: "price TBD" },
      { label: "Recovery / transport", note: "price TBD" },
    ],
  },
  {
    title: "Tech assist",
    blurb: "Diagnostics and remote support for app, lock and battery issues.",
    lines: [
      { label: "Diagnostic check", note: "price TBD" },
      { label: "Lock / electronics reset", note: "price TBD" },
      { label: "Firmware update", note: "price TBD" },
    ],
  },
  {
    title: "Maintenance & parts",
    blurb: "Workshop labour plus a parts catalogue with per-item pricing.",
    lines: [
      { label: "Standard service", note: "price TBD" },
      { label: "Brake pads (set)", note: "part price TBD" },
      { label: "Tyre + tube", note: "part price TBD" },
      { label: "Drivetrain parts", note: "part price TBD" },
    ],
  },
];

export default function AdminPricelistPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 26, letterSpacing: "-0.02em", margin: 0 }}>Pricelist</h1>
          <ComingSoonBadge />
        </div>
        <p className="mono" style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
          A future home for road-assist, tech-assist and maintenance pricing with a parts catalogue. This is a
          preview of the intended layout — there is no backend behind it yet, so nothing here is editable.
        </p>
      </header>

      <div style={{ display: "grid", gap: 20 }}>
        {SECTIONS.map((section) => (
          <PreviewCard key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ section }: { section: PreviewSection }) {
  return (
    <section className="card" style={{ padding: "22px 22px 12px", opacity: 0.92 }}>
      <h2 style={{ fontSize: 18, letterSpacing: "-0.01em", margin: "0 0 4px" }}>{section.title}</h2>
      <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.6 }}>
        {section.blurb}
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {section.lines.map((line, i) => (
          <li
            key={line.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "12px 0",
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--text-2)" }}>{line.label}</span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "var(--text-dim)",
                padding: "4px 10px",
                borderRadius: "var(--r-full)",
                border: "1px dashed var(--border-strong)",
                whiteSpace: "nowrap",
              }}
            >
              {line.note}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComingSoonBadge() {
  return (
    <span
      className="mono"
      style={{
        fontSize: 10.5,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--lime)",
        padding: "4px 10px",
        borderRadius: "var(--r-full)",
        border: "1px solid var(--lime)",
        background: "rgba(190, 255, 80, 0.06)",
      }}
    >
      Coming soon
    </span>
  );
}
