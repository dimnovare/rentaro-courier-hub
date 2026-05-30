"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCalendar,
  RentalApiError,
  RentalConfigError,
  RentalAuthError,
  type CalendarUnit,
  type CalendarBlock,
} from "@/services/adminRentalService";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ── Date helpers (UTC-normalised so bars align on a shared day axis) ───── */

function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

function plusDaysISO(base: Date, days: number): string {
  return toISO(new Date(base.getTime() + days * DAY_MS));
}

/** Parse a YYYY-MM-DD (or ISO datetime) to a UTC-midnight ms value. */
function parseDayMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  // Take just the date portion so datetime values snap to their day.
  const datePart = iso.slice(0, 10);
  const d = new Date(`${datePart}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; units: CalendarUnit[] }
  | { phase: "error"; message: string; config: boolean };

export default function AdminCalendarPage() {
  const { authenticated, signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "idle" });

  // Date window controls — default today → +30 days. Lazy initializers compute
  // the defaults once without reading a ref during render.
  const [from, setFrom] = useState(() => toISO(todayUTC()));
  const [to, setTo] = useState(() => plusDaysISO(todayUTC(), 30));

  const load = useCallback(
    async (rangeFrom: string, rangeTo: string) => {
      setState({ phase: "loading" });
      try {
        const data = await getCalendar(rangeFrom, rangeTo);
        setState({ phase: "ready", units: data.units ?? [] });
      } catch (err) {
        if (err instanceof RentalAuthError || (err instanceof RentalApiError && err.unauthorized)) {
          signOut();
        } else if (err instanceof RentalConfigError) {
          setState({ phase: "error", message: err.message, config: true });
        } else if (err instanceof RentalApiError) {
          setState({ phase: "error", message: err.message, config: false });
        } else {
          setState({
            phase: "error",
            message: "Something went wrong loading the calendar.",
            config: false,
          });
        }
      }
    },
    [signOut],
  );

  // Load on mount (once signed in) and whenever the window changes.
  useEffect(() => {
    if (authenticated) void load(from, to);
  }, [authenticated, from, to, load]);

  // Topbar Refresh reloads the current window.
  useAdminRefresh(useCallback(() => void load(from, to), [load, from, to]));

  return (
    <div>
      {state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load(from, to)} />
      ) : (
        <>
          <RangeControls
            from={from}
            to={to}
            onFrom={setFrom}
            onTo={setTo}
            onReset={() => {
              setFrom(toISO(todayUTC()));
              setTo(plusDaysISO(todayUTC(), 30));
            }}
          />

          {state.phase === "loading" || state.phase === "idle" ? (
            <Notice>Loading calendar…</Notice>
          ) : (
            <Timeline units={state.units} from={from} to={to} />
          )}
        </>
      )}
    </div>
  );
}

/* ── Range controls ────────────────────────────────────────────────────── */

function RangeControls({
  from,
  to,
  onFrom,
  onTo,
  onReset,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 14,
        flexWrap: "wrap",
        marginBottom: 26,
      }}
    >
      <label style={fieldLabel}>
        <span style={fieldKicker}>From</span>
        <input type="date" value={from} max={to} onChange={(e) => onFrom(e.target.value)} style={dateStyle} />
      </label>
      <label style={fieldLabel}>
        <span style={fieldKicker}>To</span>
        <input type="date" value={to} min={from} onChange={(e) => onTo(e.target.value)} style={dateStyle} />
      </label>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: "10px 16px", fontSize: 12.5 }}
        onClick={onReset}
      >
        Today → +30d
      </button>
    </div>
  );
}

/* ── Timeline ──────────────────────────────────────────────────────────── */

function Timeline({ units, from, to }: { units: CalendarUnit[]; from: string; to: string }) {
  // Build a shared day axis spanning the requested [from, to] window. The end
  // is rendered inclusively (the "to" day occupies a full column).
  const axis = useMemo(() => {
    const minRaw = parseDayMs(from) ?? todayUTC().getTime();
    const maxRaw = parseDayMs(to) ?? minRaw + 30 * DAY_MS;
    const min = minRaw;
    // Make the end-of-window exclusive boundary one day past "to".
    const max = Math.max(maxRaw + DAY_MS, min + DAY_MS);
    const totalDays = Math.max(1, Math.round((max - min) / DAY_MS));
    const today = todayUTC().getTime();
    return { min, max, totalDays, today };
  }, [from, to]);

  // Month tick labels across the window for light orientation.
  const months = useMemo(() => {
    const ticks: { left: number; label: string }[] = [];
    const start = new Date(axis.min);
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const span = axis.totalDays * DAY_MS;
    while (cursor.getTime() <= axis.max) {
      const t = cursor.getTime();
      if (t >= axis.min) {
        ticks.push({
          left: ((t - axis.min) / span) * 100,
          label: cursor.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return ticks;
  }, [axis]);

  const todayLeft =
    axis.today >= axis.min && axis.today < axis.max
      ? ((axis.today - axis.min) / (axis.totalDays * DAY_MS)) * 100
      : null;

  // Sort rows by city then code for a stable, scannable layout.
  const rows = useMemo(
    () =>
      [...units].sort(
        (a, b) =>
          (a.city || "").localeCompare(b.city || "") ||
          a.internalCode.localeCompare(b.internalCode),
      ),
    [units],
  );

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHead title="Fleet calendar" count={units.length} />

      {units.length === 0 ? (
        <div
          className="card mono"
          style={{ padding: 28, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}
        >
          No bike units in this window. Adjust the date range or check back once units exist.
        </div>
      ) : (
        <div className="card" style={{ padding: "22px 22px 26px", overflowX: "auto" }}>
          <div style={{ minWidth: 760 }}>
            {/* Month axis */}
            <div
              style={{
                position: "relative",
                height: 18,
                marginLeft: LABEL_W,
                marginBottom: 10,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {months.map((m) => (
                <span
                  key={`${m.label}-${m.left}`}
                  className="mono"
                  style={{
                    position: "absolute",
                    left: `${m.left}%`,
                    top: 0,
                    fontSize: 9.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    transform: "translateX(-2px)",
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Rows: one per bike unit */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((u) => (
                <div key={u.internalCode} style={{ display: "flex", alignItems: "center" }}>
                  {/* Row label */}
                  <div style={{ width: LABEL_W, flexShrink: 0, paddingRight: 12 }}>
                    <div
                      className="mono"
                      style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}
                    >
                      {u.internalCode}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {[u.city, u.modelId].filter(Boolean).join(" · ")}
                    </div>
                  </div>

                  {/* Track */}
                  <div
                    style={{
                      position: "relative",
                      flex: 1,
                      height: 32,
                      borderRadius: "var(--r-sm)",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Today marker */}
                    {todayLeft !== null && (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: `${todayLeft}%`,
                          width: 1,
                          background: "rgba(111, 180, 255, 0.7)",
                          zIndex: 2,
                        }}
                      />
                    )}

                    {u.blocks.map((b, i) => (
                      <BlockBar key={`${u.internalCode}-${i}`} block={b} axis={axis} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Legend showToday={todayLeft !== null} />
          </div>
        </div>
      )}
    </section>
  );
}

const LABEL_W = 176;

/** A single positioned block (rental or maintenance) on a unit's track. */
function BlockBar({
  block,
  axis,
}: {
  block: CalendarBlock;
  axis: { min: number; max: number; totalDays: number };
}) {
  const sMs = parseDayMs(block.from);
  const eMs = parseDayMs(block.to);
  if (sMs === null || eMs === null) return null;

  const span = axis.totalDays * DAY_MS;
  // Clamp the block to the visible window; render the end day inclusively.
  const startMs = Math.max(sMs, axis.min);
  const endMs = Math.min(eMs + DAY_MS, axis.max);
  if (endMs <= startMs) return null;

  const left = ((startMs - axis.min) / span) * 100;
  const width = Math.max(1.2, ((endMs - startMs) / span) * 100);

  const isRental = block.type === "rental";
  const style: React.CSSProperties = isRental
    ? {
        background: "linear-gradient(90deg, rgba(216,255,54,0.9), rgba(196,240,42,0.75))",
        border: "1px solid rgba(216, 255, 54, 0.5)",
        boxShadow: "0 4px 14px -6px var(--lime-glow)",
        color: "var(--lime-ink)",
      }
    : {
        background:
          "repeating-linear-gradient(45deg, rgba(111,180,255,0.32), rgba(111,180,255,0.32) 6px, rgba(111,180,255,0.18) 6px, rgba(111,180,255,0.18) 12px)",
        border: "1px solid rgba(111, 180, 255, 0.5)",
        color: "var(--blue)",
      };

  return (
    <span
      title={`${block.type}: ${block.label} · ${block.from.slice(0, 10)} → ${block.to.slice(0, 10)}`}
      style={{
        position: "absolute",
        top: 4,
        bottom: 4,
        left: `${left}%`,
        width: `${width}%`,
        borderRadius: "var(--r-full)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 8,
        overflow: "hidden",
        zIndex: 1,
        ...style,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {block.label}
      </span>
    </span>
  );
}

function Legend({ showToday }: { showToday: boolean }) {
  return (
    <div
      className="mono"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px dashed var(--border)",
        fontSize: 10,
        color: "var(--text-dim)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 16, height: 8, borderRadius: 999, background: "var(--lime)", display: "inline-block" }} />
        rental
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <span
          style={{
            width: 16,
            height: 8,
            borderRadius: 999,
            display: "inline-block",
            background:
              "repeating-linear-gradient(45deg, rgba(111,180,255,0.55), rgba(111,180,255,0.55) 4px, rgba(111,180,255,0.25) 4px, rgba(111,180,255,0.25) 8px)",
            border: "1px solid rgba(111,180,255,0.5)",
          }}
        />
        maintenance
      </span>
      {showToday && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 1, height: 12, background: "rgba(111,180,255,0.8)", display: "inline-block" }} />
          today
        </span>
      )}
    </div>
  );
}

/* ── Shared pieces (match the other admin pages) ───────────────────────── */

const fieldLabel: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7 };

const fieldKicker: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-dim)",
  fontWeight: 500,
};

const dateStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  colorScheme: "dark",
};

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
      {typeof count === "number" && (
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {count} {count === 1 ? "unit" : "units"}
        </span>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

function ErrorPanel({
  message,
  config,
  onRetry,
}: {
  message: string;
  config: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 28,
        maxWidth: 520,
        borderColor: "rgba(255, 138, 120, 0.32)",
        background: "linear-gradient(180deg, rgba(255,138,120,0.06), rgba(255,255,255,0.02))",
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 10 }}
      >
        {config ? "Not configured" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      {!config && (
        <button type="button" className="btn btn-primary" onClick={onRetry} style={{ padding: "12px 22px", fontSize: 14 }}>
          Try again
        </button>
      )}
    </div>
  );
}
