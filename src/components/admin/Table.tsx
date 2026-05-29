/** Bare presentational table primitives shared by the admin views. Styling is
 *  done with inline styles + brand CSS vars so we never touch globals.css. */
import type { ReactNode } from "react";

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
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
