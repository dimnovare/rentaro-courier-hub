"use client";

/**
 * Shared per-language list editor for admin content that varies by locale
 * (plan perks, hero marquee items, …).
 *
 * Binds a `LocalizedStrings` map (locale → string[]) to one comma-separated
 * textarea per supported locale (EN / ET / LV / FI / RU). The operator types a
 * comma-separated list per language; on every change the value is parsed back
 * into a trimmed, blank-dropped string[] so the parent always holds clean data.
 *
 * Styling uses inline styles + brand CSS vars only (globals.css is owned
 * elsewhere), matching ColorListEditor so it drops cleanly into any drawer.
 */
import type { LocalizedStrings } from "@/types/pricing";

/** Locales the admin edits, in display order. Must match the public site set. */
export const ADMIN_LOCALES = ["en", "et", "lv", "fi", "ru"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

const LOCALE_LABELS: Record<AdminLocale, string> = {
  en: "EN",
  et: "ET",
  lv: "LV",
  fi: "FI",
  ru: "RU",
};

/** Parse a comma-separated text field into a trimmed, non-empty string array. */
export function parseLocalizedList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build a complete LocalizedStrings map (one entry per ADMIN_LOCALES key) from a
 * possibly-partial source, so every locale is always present on submit.
 */
export function toLocalizedStrings(source: LocalizedStrings | undefined): LocalizedStrings {
  const out: LocalizedStrings = {};
  for (const locale of ADMIN_LOCALES) {
    out[locale] = Array.isArray(source?.[locale]) ? [...(source![locale] as string[])] : [];
  }
  return out;
}

export function LocalizedListEditor({
  value,
  onChange,
  placeholder,
}: {
  value: LocalizedStrings;
  onChange: (next: LocalizedStrings) => void;
  /** Optional placeholder shown in each locale's input. */
  placeholder?: string;
}) {
  function updateLocale(locale: AdminLocale, text: string) {
    onChange({ ...value, [locale]: parseLocalizedList(text) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {ADMIN_LOCALES.map((locale) => (
        <div key={locale} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
            }}
          >
            {LOCALE_LABELS[locale]}
          </label>
          <textarea
            value={(value[locale] ?? []).join(", ")}
            onChange={(e) => updateLocale(locale, e.target.value)}
            rows={2}
            placeholder={placeholder}
            aria-label={`${LOCALE_LABELS[locale]} list (comma-separated)`}
            style={TEXTAREA_STYLE}
          />
        </div>
      ))}
    </div>
  );
}

const TEXTAREA_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  letterSpacing: "0.02em",
  lineHeight: 1.5,
  resize: "vertical",
};
