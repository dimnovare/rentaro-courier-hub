/**
 * Admin booking-management API client. Self-contained: it reads the admin JWT
 * directly from localStorage (key `rentaro_admin_jwt`, the same key the admin
 * home writes) and sends it as `Authorization: Bearer <jwt>` to the live .NET
 * API at `${API_BASE}`. A missing token or HTTP 401 surfaces as a typed
 * BookingApiError so the page can prompt for a fresh sign-in.
 *
 * Endpoints:
 *   GET   /api/admin/bookings              (list — reused from the dashboard)
 *   PATCH /api/admin/bookings/{id}/status  (set status)
 *   POST  /api/admin/bookings/{id}/assign  (assign a bike unit → rental)
 *   GET   /api/admin/fleet                 (unit codes for the assign control)
 */
import { API_BASE } from "@/services/api";

const TOKEN_KEY = "rentaro_admin_jwt";

/* ── Contract types (must match the backend exactly) ───────────────────── */

export interface AdminBooking {
  id: string;
  createdAt: string;
  status: string;
  cityId: string;
  modelId: string;
  planId: string;
  accessoryIds: string[];
  preferredStartDate: string | null;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string | null;
}

export interface AdminFleetUnit {
  internalCode: string;
  modelId: string;
  cityId: string;
  status: string;
}

interface AdminFleetResponse {
  models: unknown[];
  units: AdminFleetUnit[];
}

/** Created-rental summary returned by the assign endpoint. */
export interface AdminRentalSummary {
  id: string;
  bookingId: string | null;
  bikeUnitInternalCode: string;
  customerEmail: string;
  startDate: string;
  planId: string;
  monthlyPrice: number;
  depositAmount: number;
  status: string;
  createdAt: string;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class BookingApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 (or a missing token) — the caller should re-auth. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BookingApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class BookingConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "BookingConfigError";
  }
}

/* ── Internals ─────────────────────────────────────────────────────────── */

function readToken(): string {
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    /* localStorage unavailable — treated as not signed in below. */
  }
  if (!token) {
    throw new BookingApiError("You are not signed in. Sign in on the admin home.", 401);
  }
  return token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new BookingConfigError();
  const token = readToken();

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
    throw new BookingApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new BookingApiError("Your session has expired. Sign in again.", 401);
    // Surface a server-provided { error } message when present.
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) detail = ` — ${data.error}`;
    } catch {
      /* non-JSON body; ignore */
    }
    throw new BookingApiError(`Request failed (${res.status})${detail}`, res.status);
  }

  // 204 / empty body tolerance.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

/** Lists all bookings (reuses the read-only dashboard endpoint). */
export function listBookings(): Promise<AdminBooking[]> {
  return request<AdminBooking[]>("/api/admin/bookings");
}

/** Returns the fleet's bike-unit internal codes, for the assign control. */
export async function listUnitCodes(): Promise<AdminFleetUnit[]> {
  const fleet = await request<AdminFleetResponse>("/api/admin/fleet");
  return fleet.units ?? [];
}

/** Sets a booking's status (e.g. "approved" / "rejected"). */
export function updateStatus(bookingId: string, status: string): Promise<AdminBooking> {
  return request<AdminBooking>(`/api/admin/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** Assigns a bike unit to a booking, creating an active rental. */
export function assignUnit(bookingId: string, bikeUnitInternalCode: string): Promise<AdminRentalSummary> {
  return request<AdminRentalSummary>(`/api/admin/bookings/${bookingId}/assign`, {
    method: "POST",
    body: JSON.stringify({ bikeUnitInternalCode }),
  });
}
