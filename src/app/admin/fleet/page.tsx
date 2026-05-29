"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getUnits,
  getRentals,
  updateUnitStatus,
  FleetApiError,
  FleetConfigError,
  FleetAuthError,
  type FleetUnit,
  type FleetRental,
} from "@/services/adminFleetService";
import { AdminTable, Th, Td, fmtDay } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";

/** Valid BikeUnitStatus values — must match the backend enum (Rentaro.Domain). */
const UNIT_STATUSES = [
  "available",
  "reserved",
  "rented",
  "returningSoon",
  "maintenance",
  "damaged",
  "retired",
] as const;

/** Pretty label for a status value (camelCase → spaced words). */
function statusLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

interface FleetData {
  units: FleetUnit[];
  rentals: FleetRental[];
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: FleetData }
  | { phase: "no-auth" }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminFleetPage() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Tracks which unit codes currently have an in-flight status update.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setUpdateError(null);
    try {
      const [units, rentals] = await Promise.all([getUnits(), getRentals()]);
      setState({ phase: "ready", data: { units, rentals } });
    } catch (err) {
      if (err instanceof FleetAuthError) {
        setState({ phase: "no-auth" });
      } else if (err instanceof FleetConfigError) {
        setState({ phase: "error", message: err.message, unauthorized: false, config: true });
      } else if (err instanceof FleetApiError) {
        setState({
          phase: "error",
          message: err.message,
          unauthorized: err.unauthorized,
          config: false,
        });
      } else {
        setState({
          phase: "error",
          message: "Something went wrong loading the fleet.",
          unauthorized: false,
          config: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(internalCode: string, nextStatus: string) {
    if (state.phase !== "ready") return;
    const current = state.data.units.find((u) => u.internalCode === internalCode);
    if (!current || current.status === nextStatus) return;

    setUpdateError(null);
    setPending((p) => ({ ...p, [internalCode]: true }));
    try {
      const updated = await updateUnitStatus(internalCode, nextStatus);
      setState((s) =>
        s.phase === "ready"
          ? {
              ...s,
              data: {
                ...s.data,
                units: s.data.units.map((u) =>
                  u.internalCode === internalCode ? updated : u,
                ),
              },
            }
          : s,
      );
    } catch (err) {
      if (err instanceof FleetAuthError || (err instanceof FleetApiError && err.unauthorized)) {
        setState({ phase: "no-auth" });
      } else {
        const msg =
          err instanceof FleetApiError
            ? err.message
            : `Could not update ${internalCode}.`;
        setUpdateError(msg);
      }
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[internalCode];
        return next;
      });
    }
  }

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <PageHeader
        showRefresh={state.phase === "ready" || state.phase === "error"}
        onRefresh={() => void load()}
      />

      {state.phase === "loading" ? (
        <Notice>Loading fleet…</Notice>
      ) : state.phase === "no-auth" ? (
        <AuthGate />
      ) : state.phase === "error" ? (
        <ErrorPanel
          message={state.message}
          unauthorized={state.unauthorized}
          config={state.config}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {updateError && (
            <div
              className="mono"
              style={{
                color: "var(--danger)",
                fontSize: 12.5,
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: "var(--r-md)",
                border: "1px solid rgba(255, 138, 120, 0.32)",
                background: "rgba(255, 138, 120, 0.06)",
              }}
            >
              {updateError}
            </div>
          )}

          <UnitsByCity
            units={state.data.units}
            pending={pending}
            onChangeStatus={changeStatus}
          />

          <RentalTimeline units={state.data.units} rentals={state.data.rentals} />
        </>
      )}
    </main>
  );
}

/* ── Units, grouped by city ────────────────────────────────────────────── */

function UnitsByCity({
  units,
  pending,
  onChangeStatus,
}: {
  units: FleetUnit[];
  pending: Record<string, boolean>;
  onChangeStatus: (code: string, status: string) => void;
}) {
  // Group units by city, preserving first-seen city order.
  const groups = useMemo(() => {
    const map = new Map<string, FleetUnit[]>();
    for (const u of units) {
      const list = map.get(u.cityId);
      if (list) list.push(u);
      else map.set(u.cityId, [u]);
    }
    return [...map.entries()];
  }, [units]);

  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHead title="Units" count={units.length} />

      {groups.length === 0 ? (
        <div
          className="card mono"
          style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}
        >
          No bike units.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {groups.map(([city, cityUnits]) => (
            <div key={city}>
              <h3
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                {city} · {cityUnits.length}
              </h3>
              <AdminTable>
                <thead>
                  <tr>
                    <Th>Internal code</Th>
                    <Th>Model</Th>
                    <Th>Serial</Th>
                    <Th>Status</Th>
                    <Th>Change status</Th>
                    <Th>Last service</Th>
                    <Th>Next due</Th>
                    <Th>Notes</Th>
                  </tr>
                </thead>
                <tbody>
                  {cityUnits.map((u) => (
                    <tr key={u.internalCode}>
                      <Td mono nowrap>
                        {u.internalCode}
                      </Td>
                      <Td mono dim>
                        {u.modelId}
                      </Td>
                      <Td mono dim>
                        {u.serialNumber ?? "—"}
                      </Td>
                      <Td nowrap>
                        <StatusPill value={u.status} />
                      </Td>
                      <Td nowrap>
                        <StatusSelect
                          value={u.status}
                          busy={Boolean(pending[u.internalCode])}
                          onChange={(next) => onChangeStatus(u.internalCode, next)}
                        />
                      </Td>
                      <Td mono nowrap>
                        {fmtDay(u.lastServiceDate)}
                      </Td>
                      <Td mono nowrap>
                        {fmtDay(u.nextServiceDueDate)}
                      </Td>
                      <Td dim>{u.notes?.trim() ? u.notes : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusSelect({
  value,
  busy,
  onChange,
}: {
  value: string;
  busy: boolean;
  onChange: (next: string) => void;
}) {
  // Include the current value even if it isn't in the known list, so the select
  // never silently drops an unexpected backend status.
  const options = UNIT_STATUSES.includes(value as (typeof UNIT_STATUSES)[number])
    ? UNIT_STATUSES
    : ([value, ...UNIT_STATUSES] as readonly string[]);

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Change unit status"
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        padding: "8px 12px",
        borderRadius: "var(--r-sm)",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.04em",
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
        minWidth: 138,
      }}
    >
      {options.map((s) => (
        <option key={s} value={s} style={{ background: "var(--panel)", color: "var(--text)" }}>
          {statusLabel(s)}
        </option>
      ))}
    </select>
  );
}

/* ── Rental timeline (lightweight month grid) ──────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function RentalTimeline({
  units,
  rentals,
}: {
  units: FleetUnit[];
  rentals: FleetRental[];
}) {
  // Build a contiguous window covering all rentals (clamped to a sensible
  // minimum), so bars line up against a shared, evenly-divided day axis.
  const axis = useMemo(() => {
    const starts: number[] = [];
    const ends: number[] = [];
    for (const r of rentals) {
      const s = parseDay(r.startDate);
      const e = parseDay(r.plannedEndDate) ?? s;
      if (s) starts.push(s.getTime());
      if (e) ends.push(e.getTime());
    }
    const today = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    );
    let min = starts.length ? Math.min(...starts) : today;
    let max = ends.length ? Math.max(...ends) : today + 30 * DAY_MS;
    // Pad a couple of days on each side and enforce a >= ~30-day window.
    min -= 2 * DAY_MS;
    max += 2 * DAY_MS;
    if (max - min < 30 * DAY_MS) max = min + 30 * DAY_MS;
    const totalDays = Math.max(1, Math.round((max - min) / DAY_MS));
    return { min, max, totalDays, today };
  }, [rentals]);

  // Only show units that actually have rentals; key rows by unit code.
  const rows = useMemo(() => {
    const byCode = new Map<string, FleetRental[]>();
    for (const r of rentals) {
      const code = r.bikeUnitInternalCode ?? "unassigned";
      const list = byCode.get(code);
      if (list) list.push(r);
      else byCode.set(code, [r]);
    }
    return [...byCode.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rentals]);

  // Month tick labels across the window for light orientation.
  const months = useMemo(() => {
    const ticks: { left: number; label: string }[] = [];
    const start = new Date(axis.min);
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cursor.getTime() <= axis.max) {
      const t = cursor.getTime();
      if (t >= axis.min) {
        const left = ((t - axis.min) / (axis.totalDays * DAY_MS)) * 100;
        ticks.push({
          left,
          label: cursor.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return ticks;
  }, [axis]);

  const todayLeft =
    axis.today >= axis.min && axis.today <= axis.max
      ? ((axis.today - axis.min) / (axis.totalDays * DAY_MS)) * 100
      : null;

  function unitCity(code: string): string | null {
    return units.find((u) => u.internalCode === code)?.cityId ?? null;
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHead title="Rental timeline" count={rentals.length} />

      {rentals.length === 0 ? (
        <div
          className="card mono"
          style={{ padding: 28, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}
        >
          No rentals to show yet. Active rentals appear here as a timeline once they exist.
        </div>
      ) : (
        <div className="card" style={{ padding: "22px 22px 26px", overflowX: "auto" }}>
          <div style={{ minWidth: 720 }}>
            {/* Month axis */}
            <div
              style={{
                position: "relative",
                height: 18,
                marginLeft: 168,
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

            {/* Rows: one per unit that has rentals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map(([code, unitRentals]) => {
                const city = unitCity(code);
                return (
                  <div key={code} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    {/* Row label */}
                    <div style={{ width: 168, flexShrink: 0, paddingRight: 12 }}>
                      <div
                        className="mono"
                        style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}
                      >
                        {code}
                      </div>
                      {city && (
                        <div
                          className="mono"
                          style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}
                        >
                          {city}
                        </div>
                      )}
                    </div>

                    {/* Track */}
                    <div
                      style={{
                        position: "relative",
                        flex: 1,
                        height: 30,
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
                            background: "rgba(111, 180, 255, 0.6)",
                          }}
                        />
                      )}

                      {unitRentals.map((r) => {
                        const s = parseDay(r.startDate);
                        const e = parseDay(r.plannedEndDate) ?? s;
                        if (!s || !e) return null;
                        const startMs = Math.max(s.getTime(), axis.min);
                        const endMs = Math.min(e.getTime() + DAY_MS, axis.max); // inclusive end day
                        const span = axis.totalDays * DAY_MS;
                        const left = ((startMs - axis.min) / span) * 100;
                        const width = Math.max(1.2, ((endMs - startMs) / span) * 100);
                        return (
                          <span
                            key={r.id}
                            title={`${r.customerEmail} · ${r.planId} · ${r.startDate} → ${
                              r.plannedEndDate ?? "open"
                            } · ${statusLabel(r.status)}`}
                            style={{
                              position: "absolute",
                              top: 4,
                              bottom: 4,
                              left: `${left}%`,
                              width: `${width}%`,
                              borderRadius: "var(--r-full)",
                              background:
                                "linear-gradient(90deg, rgba(216,255,54,0.9), rgba(196,240,42,0.75))",
                              border: "1px solid rgba(216, 255, 54, 0.5)",
                              boxShadow: "0 4px 14px -6px var(--lime-glow)",
                              display: "flex",
                              alignItems: "center",
                              paddingLeft: 8,
                              overflow: "hidden",
                            }}
                          >
                            <span
                              className="mono"
                              style={{
                                fontSize: 9.5,
                                color: "var(--lime-ink)",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                              }}
                            >
                              {r.planId}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
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
                <span
                  style={{
                    width: 16,
                    height: 8,
                    borderRadius: 999,
                    background: "var(--lime)",
                    display: "inline-block",
                  }}
                />
                rental (start → planned end)
              </span>
              {todayLeft !== null && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{ width: 1, height: 12, background: "rgba(111,180,255,0.8)", display: "inline-block" }}
                  />
                  today
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Shared pieces ─────────────────────────────────────────────────────── */

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
      {typeof count === "number" && (
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {count} {count === 1 ? "record" : "records"}
        </span>
      )}
    </div>
  );
}

function PageHeader({ showRefresh, onRefresh }: { showRefresh: boolean; onRefresh: () => void }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        paddingBottom: 24,
        marginBottom: 32,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <h1 style={{ fontSize: 26, letterSpacing: "-0.03em" }}>
          rentaro <span style={{ color: "var(--text-dim)" }}>·</span>{" "}
          <span style={{ color: "var(--lime)" }}>fleet</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Units, status &amp; rental timeline
        </p>
        <Link
          href="/admin"
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11.5,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginTop: 12,
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>→</span> Admin home
        </Link>
      </div>
      {showRefresh && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "11px 18px", fontSize: 13.5 }}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      )}
    </header>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

function AuthGate() {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in required</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        You need an admin session to manage the fleet. Sign in on the admin home, then return here.
      </p>
      <Link
        href="/admin"
        className="btn btn-primary"
        style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}
      >
        Sign in on the admin home
      </Link>
    </div>
  );
}

function ErrorPanel({
  message,
  unauthorized,
  config,
  onRetry,
}: {
  message: string;
  unauthorized: boolean;
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
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--danger)",
          marginBottom: 10,
        }}
      >
        {config ? "Not configured" : unauthorized ? "Unauthorized" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {unauthorized ? (
          <Link
            href="/admin"
            className="btn btn-primary"
            style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}
          >
            Sign in again
          </Link>
        ) : config ? null : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRetry}
            style={{ padding: "12px 22px", fontSize: 14 }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
