/**
 * Canonical date helpers for the admin console (and anything else that needs
 * plain ISO day strings). Import from here rather than re-implementing
 * per page:
 *
 * - `todayIso()`          — today as local `yyyy-MM-dd` (seed for date inputs).
 * - `isoDay(x)`           — `yyyy-MM-dd` from an ISO timestamp string or Date.
 * - `fmtDate(iso)`        — compact `yyyy-MM-dd HH:mm` readout ("—" when empty).
 * - `fmtDay(iso)`         — compact `yyyy-MM-dd` readout ("—" when empty).
 *
 * `fmtDate` / `fmtDay` are also re-exported from `@/components/admin/Table`
 * for backward compatibility — new code should import them from here.
 */

/** Today's date as an ISO `yyyy-MM-dd` string (LOCAL time, not UTC), for
 *  seeding date inputs. */
export function todayIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/**
 * The `yyyy-MM-dd` day part of an ISO timestamp string or a Date, or "" when
 * absent — the value date inputs and the DateField expect.
 *
 * Strings are sliced (no timezone shifting — the backend already sends the
 * intended calendar day); Dates are formatted in LOCAL time.
 */
export function isoDay(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${m}-${d}`;
}

/** Format an ISO datetime as a compact mono-friendly string (`yyyy-MM-dd HH:mm`). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Format an ISO date (no time component expected) as `yyyy-MM-dd`. */
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
