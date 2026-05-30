/**
 * Read-only admin metrics client. Calls the same-origin Next BFF proxy
 * (`/api/admin/metrics`), which attaches the admin JWT from an httpOnly cookie
 * server-side — so a component can call getMetrics() with no props or context
 * and no token of its own.
 *
 * Mirrors the error contract of adminService.ts: AdminConfigError when the
 * backend base URL is unset, and AdminMetricsApiError (with an `unauthorized`
 * flag) for a 401 or any other failed request.
 */

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

/* ── Public surface ────────────────────────────────────────────────────── */

/**
 * Fetches aggregated admin dashboard metrics via the same-origin proxy. Throws
 * AdminConfigError when the backend base URL is unset, and AdminMetricsApiError(401)
 * when the session is missing/expired, or another request error occurs.
 */
export async function getMetrics(): Promise<AdminMetrics> {
  let res: Response;
  try {
    res = await fetch("/api/admin/metrics", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AdminMetricsApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new AdminMetricsApiError("Your session has expired. Sign in again.", 401);
    }
    try {
      const data = (await res.json()) as { notConfigured?: boolean };
      if (data?.notConfigured) throw new AdminConfigError();
    } catch (err) {
      if (err instanceof AdminConfigError) throw err;
      /* non-JSON body — fall through */
    }
    throw new AdminMetricsApiError(`Request failed (${res.status})`, res.status);
  }

  return (await res.json()) as AdminMetrics;
}
