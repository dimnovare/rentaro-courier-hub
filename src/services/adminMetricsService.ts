/**
 * Read-only admin metrics client. Self-contained: it reads the admin JWT from
 * localStorage (the same key the admin hub writes) and talks directly to the
 * live .NET API, so a component can call getMetrics() with no props or context.
 *
 * Mirrors the error contract of adminService.ts: AdminConfigError when the API
 * base URL is unset, and AdminMetricsApiError (with an `unauthorized` flag) for
 * a missing token, a 401, or any other failed request.
 */
import { API_BASE } from "@/services/api";

const TOKEN_KEY = "rentaro_admin_jwt";

/* ── Contract type (must match the backend AdminMetricsDto exactly) ──────── */

export interface AdminMetrics {
  bookingsTotal: number;
  bookingsByStatus: Record<string, number>;
  unitsTotal: number;
  unitsByStatus: Record<string, number>;
  activeRentals: number;
  openMaintenance: number;
  pendingBookings: number;
  bikesAvailable: number;
  bikesRented: number;
  bikesReturningSoon: number;
  mrrEstimate: number;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class AdminMetricsApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 or a missing token — the caller should re-auth. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminMetricsApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class AdminConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "AdminConfigError";
  }
}

/* ── Token access ──────────────────────────────────────────────────────── */

/** Reads the saved admin JWT from localStorage; null when absent/unavailable. */
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/* ── Public surface ────────────────────────────────────────────────────── */

/**
 * Fetches aggregated admin dashboard metrics. Throws AdminConfigError when the
 * API base URL is unset, and AdminMetricsApiError(401) when no token is present,
 * the session has expired, or another request error occurs.
 */
export async function getMetrics(): Promise<AdminMetrics> {
  if (!API_BASE) throw new AdminConfigError();

  const token = readToken();
  if (!token) throw new AdminMetricsApiError("Sign in to view metrics.", 401);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new AdminMetricsApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new AdminMetricsApiError("Your session has expired. Sign in again.", 401);
    }
    throw new AdminMetricsApiError(`Request failed (${res.status})`, res.status);
  }

  return (await res.json()) as AdminMetrics;
}
