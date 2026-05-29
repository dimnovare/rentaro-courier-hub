/**
 * Admin rental-operations API client for the /admin/rentals and /admin/calendar
 * verticals. Self-contained: it reads the admin JWT from localStorage (the same
 * key the admin home writes) and sends it as `Authorization: Bearer <token>` on
 * every request. A 401 is surfaced as a typed RentalAuthError so the page can
 * prompt for a fresh sign-in; a missing API base URL surfaces as
 * RentalConfigError.
 *
 * This mirrors src/services/adminFleetService.ts / adminMaintenanceService.ts
 * but is kept separate so the fleet-operations slice owns its own contract
 * types and helpers.
 *
 * Endpoints:
 *   GET  /api/admin/rentals                          (list rentals)
 *   GET  /api/admin/calendar?from=…&to=…             (fleet timeline)
 *   POST /api/admin/rentals/{id}/schedule-return     { date }
 *   POST /api/admin/rentals/{id}/return
 *   POST /api/admin/rentals/{id}/inspect             { passed, notes? }
 *   POST /api/admin/rentals/{id}/extend              { plannedEndDate }
 */
import { API_BASE } from "@/services/api";

/** localStorage key shared with the admin home (src/app/admin/page.tsx). */
export const ADMIN_TOKEN_KEY = "rentaro_admin_jwt";

/* ── Contract types (must match the backend exactly) ───────────────────── */

export interface AdminRental {
  id: string;
  bookingId: string | null;
  customerEmail: string;
  bikeUnitInternalCode: string;
  modelId: string;
  planId: string;
  startDate: string;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  status: string;
  monthlyPrice: number;
  depositAmount: number;
  isOverdue: boolean;
  createdAt: string;
}

/** A single block on a unit's calendar row (a rental or a maintenance window). */
export interface CalendarBlock {
  type: "rental" | "maintenance";
  from: string;
  to: string;
  label: string;
  rentalId: string | null;
}

/** One bike unit's row in the fleet calendar. */
export interface CalendarUnit {
  internalCode: string;
  modelId: string;
  city: string;
  status: string;
  blocks: CalendarBlock[];
}

export interface CalendarResponse {
  units: CalendarUnit[];
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class RentalApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RentalApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class RentalConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "RentalConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class RentalAuthError extends Error {
  constructor() {
    super("Sign in on the admin home to manage rentals.");
    this.name = "RentalAuthError";
  }
}

/* ── Token access ──────────────────────────────────────────────────────── */

/** Read the saved admin JWT, or null if absent / localStorage unavailable. */
export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

/* ── Core fetch helper ─────────────────────────────────────────────────── */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new RentalConfigError();

  const token = getAdminToken();
  if (!token) throw new RentalAuthError();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new RentalApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new RentalApiError("Your session has expired. Sign in again.", 401);
    // Surface a server-supplied error message when present (e.g. 400/404 bodies).
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) detail = `: ${data.error}`;
    } catch {
      /* non-JSON body — ignore. */
    }
    throw new RentalApiError(`Request failed (${res.status})${detail}`, res.status);
  }

  // 204 / empty body tolerance (the action endpoints may return the updated
  // rental or nothing).
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

/** Lists all rentals with operational fields (status, dates, overdue flag). */
export const listRentals = () => request<AdminRental[]>("/api/admin/rentals");

/**
 * Loads the fleet calendar for a date window (inclusive, YYYY-MM-DD). One row
 * per bike unit, each carrying rental / maintenance blocks within the window.
 */
export const getCalendar = (from: string, to: string) =>
  request<CalendarResponse>(
    `/api/admin/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );

/** Schedules a return date for a rental (YYYY-MM-DD). */
export const scheduleReturn = (id: string, date: string) =>
  request<AdminRental>(`/api/admin/rentals/${encodeURIComponent(id)}/schedule-return`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });

/** Marks a rental as physically returned. */
export const markReturned = (id: string) =>
  request<AdminRental>(`/api/admin/rentals/${encodeURIComponent(id)}/return`, {
    method: "POST",
  });

/** Records the post-return inspection outcome. */
export const inspectRental = (id: string, passed: boolean, notes?: string) =>
  request<AdminRental>(`/api/admin/rentals/${encodeURIComponent(id)}/inspect`, {
    method: "POST",
    body: JSON.stringify(notes && notes.trim() ? { passed, notes: notes.trim() } : { passed }),
  });

/** Extends a rental's planned end date (YYYY-MM-DD). */
export const extendRental = (id: string, plannedEndDate: string) =>
  request<AdminRental>(`/api/admin/rentals/${encodeURIComponent(id)}/extend`, {
    method: "POST",
    body: JSON.stringify({ plannedEndDate }),
  });
