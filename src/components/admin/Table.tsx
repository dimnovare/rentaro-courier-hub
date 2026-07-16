/** Bare presentational table primitives shared by the admin views. Styling is
 *  inline styles + brand CSS vars; the scroll wrapper additionally carries the
 *  `.admin-table-scroll` class for the few behaviours that need real CSS
 *  (max-height cap, row hover, tabular numerals — see globals.css). */
import { useState } from "react";
import type { ReactNode } from "react";

// Canonical implementations moved to src/lib/dates.ts; re-exported here so the
// many existing `import { fmtDate } from "@/components/admin/Table"` keep
// working. New code should import from "@/lib/dates".
export { fmtDate, fmtDay } from "@/lib/dates";

export function AdminTable({ children }: { children: ReactNode }) {
  const [edge, setEdge] = useState<"both" | "right" | "left" | "none">("none");

  const onScroll = (el: HTMLDivElement | null) => {
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) {
      setEdge("none");
      return;
    }
    const atStart = el.scrollLeft <= 1;
    const atEnd = el.scrollLeft >= max - 1;
    setEdge(atStart ? "right" : atEnd ? "left" : "both");
  };

  // Map the scroll position to a CSS mask that fades the appropriate edge(s).
  const fadeStop = "16px";
  const opaque = "rgba(0,0,0,1)";
  const clear = "rgba(0,0,0,0)";
  const mask =
    edge === "both"
      ? `linear-gradient(to right, ${clear}, ${opaque} ${fadeStop}, ${opaque} calc(100% - ${fadeStop}), ${clear})`
      : edge === "right"
        ? `linear-gradient(to right, ${opaque} calc(100% - ${fadeStop}), ${clear})`
        : edge === "left"
          ? `linear-gradient(to right, ${clear}, ${opaque} ${fadeStop})`
          : undefined;

  return (
    <div
      role="region"
      aria-label="Table — scroll horizontally to see more"
      tabIndex={0}
      className="admin-table-scroll"
      ref={(el) => onScroll(el)}
      onScroll={(e) => onScroll(e.currentTarget)}
      style={{
        overflowX: "auto",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border)",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    >
      <table
        style={{
          width: "100%",
          // "separate" (not "collapse") so the sticky header keeps its own
          // bottom border while rows scroll beneath it — with border-collapse,
          // browsers scroll the collapsed border away with the rows. Only
          // bottom borders are used, so spacing 0 renders identically.
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: 13,
          minWidth: 640,
        }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  mono = true,
  align = "left",
}: {
  children: ReactNode;
  mono?: boolean;
  /** Column alignment — use "right" for numeric columns. */
  align?: "left" | "right";
}) {
  return (
    <th
      className={mono ? "mono" : undefined}
      style={{
        textAlign: align,
        padding: "12px 14px",
        fontSize: 10.5,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        fontWeight: 500,
        borderBottom: "1px solid var(--border)",
        // Sticky within the .admin-table-scroll wrapper (which caps its own
        // height), so headers stay visible while long tables scroll. The
        // background must be OPAQUE — the old translucent 2% white would let
        // rows shine through — so it layers the same 2% wash over the page bg.
        position: "sticky",
        top: 0,
        zIndex: 1,
        background:
          "linear-gradient(rgba(255,255,255,0.02), rgba(255,255,255,0.02)) var(--bg)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  mono = false,
  dim = false,
  nowrap = false,
  align = "left",
}: {
  children: ReactNode;
  mono?: boolean;
  dim?: boolean;
  nowrap?: boolean;
  /** Cell alignment — use "right" for numeric cells (pair with Th align). */
  align?: "left" | "right";
}) {
  return (
    <td
      className={mono ? "mono" : undefined}
      style={{
        padding: "11px 14px",
        borderBottom: "1px solid var(--border)",
        color: dim ? "var(--text-muted)" : "var(--text-2)",
        verticalAlign: "top",
        fontSize: mono ? 12 : 13,
        whiteSpace: nowrap ? "nowrap" : undefined,
        textAlign: align === "right" ? "right" : undefined,
      }}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="mono"
        style={{
          padding: "26px 14px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 12,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </td>
    </tr>
  );
}

/** Section wrapper: a kicker-style label + count, then the panel content. */
export function AdminSection({
  title,
  count,
  noun = "record",
  children,
}: {
  title: string;
  count?: number;
  /** Singular noun for the count readout, e.g. "invoice" → "3 invoices". */
  noun?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
        {typeof count === "number" && (
          <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {count} {count === 1 ? noun : `${noun}s`}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
