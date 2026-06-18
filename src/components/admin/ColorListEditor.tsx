"use client";

/**
 * Shared colour-list editor for the admin model + accessory editors.
 *
 * Edits an item's `colors: ColorOption[]` (name + hex) as a simple repeater:
 * each row is a free-text colour name, a native colour picker, and a remove
 * button, with an "+ Add colour" button underneath. Styling uses inline styles
 * + brand CSS vars only (globals.css is owned elsewhere), so it drops cleanly
 * into either editor without depending on their local field markup.
 */
import type { ColorOption } from "@/types/bike";

/** Matches a #rrggbb hex the native <input type="color"> will accept. */
const HEX6 = /^#[0-9a-fA-F]{6}$/;

export function ColorListEditor({
  value,
  onChange,
}: {
  value: ColorOption[];
  onChange: (next: ColorOption[]) => void;
}) {
  function updateRow(index: number, patch: Partial<ColorOption>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...value, { name: "", hex: "#888888" }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {value.length === 0 && (
        <p
          className="mono"
          style={{
            margin: 0,
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--text-dim)",
          }}
        >
          No colours yet. Add one to show it as a swatch.
        </p>
      )}

      {value.map((color, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={color.name}
            onChange={(e) => updateRow(index, { name: e.target.value })}
            placeholder="e.g. Black"
            aria-label={`Colour ${index + 1} name`}
            style={ROW_INPUT_STYLE}
          />
          <input
            type="color"
            // <input type=color> requires a valid #rrggbb; fall back to a
            // neutral grey when the value is blank or not yet valid.
            value={HEX6.test(color.hex.trim()) ? color.hex.trim() : "#888888"}
            onChange={(e) => updateRow(index, { hex: e.target.value })}
            aria-label={`Colour ${index + 1} swatch`}
            style={SWATCH_STYLE}
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            aria-label={`Remove colour ${index + 1}`}
            title="Remove colour"
            className="mono"
            style={REMOVE_STYLE}
          >
            ✕
          </button>
        </div>
      ))}

      <div>
        <button type="button" onClick={addRow} className="mono" style={ADD_STYLE}>
          + Add colour
        </button>
      </div>
    </div>
  );
}

const ROW_INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  letterSpacing: "0.02em",
};

const SWATCH_STYLE: React.CSSProperties = {
  width: 40,
  height: 38,
  padding: 2,
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  cursor: "pointer",
  flexShrink: 0,
};

const REMOVE_STYLE: React.CSSProperties = {
  width: 30,
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid rgba(255, 138, 120, 0.32)",
  color: "var(--danger)",
  fontSize: 11,
  lineHeight: 1,
  cursor: "pointer",
};

const ADD_STYLE: React.CSSProperties = {
  padding: "6px 11px",
  fontSize: 11.5,
  letterSpacing: "0.03em",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  cursor: "pointer",
};
