/** Small status/priority chip, coloured by a coarse intent. Presentational. */

export type PillTone = "good" | "warn" | "bad" | "info" | "neutral";

const TONE: Record<PillTone, { fg: string; bg: string; bd: string }> = {
  good: { fg: "var(--lime)", bg: "rgba(216, 255, 54, 0.12)", bd: "rgba(216, 255, 54, 0.3)" },
  warn: { fg: "var(--warn)", bg: "rgba(255, 198, 90, 0.12)", bd: "rgba(255, 198, 90, 0.3)" },
  bad: { fg: "var(--danger)", bg: "rgba(255, 138, 120, 0.12)", bd: "rgba(255, 138, 120, 0.32)" },
  info: { fg: "var(--blue)", bg: "rgba(111, 180, 255, 0.12)", bd: "rgba(111, 180, 255, 0.32)" },
  neutral: { fg: "var(--text-2)", bg: "var(--surface)", bd: "var(--border)" },
};

/** Map a raw status/priority string to a tone using simple keyword buckets. */
export function toneFor(value: string): PillTone {
  const v = value.toLowerCase();
  if (/(active|approved|available|completed|resolved|closed|done|in)\b/.test(v)) return "good";
  if (/(pending|awaiting|review|submitted|reserved|low|limited|scheduled|medium|returning|open|waitlist|wait)/.test(v))
    return "warn";
  if (/(rejected|cancelled|canceled|damaged|stolen|overdue|defaulted|failed|urgent|high|maintenance|retired)/.test(v))
    return "bad";
  return "neutral";
}

export function StatusPill({ value, tone }: { value: string; tone?: PillTone }) {
  const t = TONE[tone ?? toneFor(value)];
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "4px 9px",
        borderRadius: "var(--r-full)",
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
