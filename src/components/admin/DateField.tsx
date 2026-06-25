"use client";

import React, { useEffect, useState } from "react";

/**
 * Locale-independent date entry: Day (number) + Month (NAME dropdown) + Year.
 * The native <input type="date"> renders its text per the browser locale
 * (mm/dd/yyyy on US browsers, dd/mm elsewhere), which repeatedly tricked operators
 * into picking the wrong month. Picking a month by NAME ("June") is unambiguous.
 *
 * `value` is an ISO `yyyy-mm-dd` string (or "" when unset). `onChange` receives a
 * valid ISO string, or "" while the date is incomplete/invalid.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Parts {
  day: string;
  month: string; // "1".."12"
  year: string;
}

function parseIso(iso: string | null | undefined): Parts {
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return { day: String(Number(d)), month: String(Number(m)), year: y };
  }
  return { day: "", month: "", year: "" };
}

/** ISO for a complete, in-range date, else "" (incomplete/invalid). */
function toIso(p: Parts): string {
  const d = Number(p.day);
  const m = Number(p.month);
  const y = Number(p.year);
  if (!p.day || !p.month || p.year.length !== 4) return "";
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function DateField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
}) {
  const [parts, setParts] = useState<Parts>(() => parseIso(value));

  // Re-seed from the parent only when it changes to something our parts don't
  // already represent (a re-open / external reset), so live typing isn't clobbered.
  useEffect(() => {
    if ((value || "") !== toIso(parts)) {
      setParts(parseIso(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (next: Parts) => {
    setParts(next);
    onChange(toIso(next));
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        placeholder="Day"
        aria-label="Day"
        disabled={disabled}
        value={parts.day}
        onChange={(e) => update({ ...parts, day: e.target.value })}
        style={{ ...fieldStyle, width: 62 }}
      />
      <select
        aria-label="Month"
        disabled={disabled}
        value={parts.month}
        onChange={(e) => update({ ...parts, month: e.target.value })}
        style={{ ...fieldStyle, flex: 1, minWidth: 116 }}
      >
        <option value="">Month</option>
        {MONTHS.map((nm, i) => (
          <option key={nm} value={String(i + 1)}>
            {nm}
          </option>
        ))}
      </select>
      <input
        type="number"
        inputMode="numeric"
        min={2000}
        max={2100}
        placeholder="Year"
        aria-label="Year"
        disabled={disabled}
        value={parts.year}
        onChange={(e) => update({ ...parts, year: e.target.value })}
        style={{ ...fieldStyle, width: 78 }}
      />
    </div>
  );
}

/** Pretty, unambiguous readout for an ISO date, e.g. "12 Jun 2026". "" when unset. */
export function formatDateLong(iso: string | null | undefined): string {
  const p = parseIso(iso);
  if (!p.day || !p.month || !p.year) return "";
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1].slice(0, 3)} ${p.year}`;
}

const fieldStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  colorScheme: "dark",
};
