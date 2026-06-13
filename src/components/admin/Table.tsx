/** Bare presentational table primitives shared by the admin views. Styling is
 *  done with inline styles + brand CSS vars so we never touch globals.css. */
import { useState } from "react";
import type { ReactNode } from "react";

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
          borderCollapse: "collapse",
          fontSize: 13,
          minWidth: 640,
        }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({ children, mono = true }: { children: ReactNode; mono?: boolean }) {
  return (
    <th
      className={mono ? "mono" : undefined}
      style={{
        textAlign: "left",
        padding: "12px 14px",
        fontSize: 10.5,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        fontWeight: 500,
        borderBottom: "1px solid var(--border)",
        background: "rgba(255,255,255,0.02)",
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
}: {
  children: ReactNode;
  mono?: boolean;
  dim?: boolean;
  nowrap?: boolean;
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
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
        {typeof count === "number" && (
          <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {count} {count === 1 ? "record" : "records"}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** Format an ISO datetime as a compact mono-friendly string. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Format an ISO date (no time component expected). */
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
