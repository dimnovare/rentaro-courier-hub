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

  /* ── Ops-dashboard superset (GET /api/admin/metrics, see CONTRACT.md) ─────
   * The backend returns a superset: the legacy fields above are kept for
   * backward compatibility (older backends / readers), and these newer,
   * action-oriented figures are added — the dashboard prefers these and falls
   * back to the legacy names. Names here are authoritative per the shared contract. Some
   * duplicate a legacy field (e.g. availableBikes === bikesAvailable); the
   * dashboard prefers these names. Optional in the type so an older backend
   * that hasn't shipped them yet degrades gracefully rather than throwing.
   * (activeRentals + pendingBookings already declared above.) */
  /** Active/extended rentals with plannedEnd within 7 days. */
  endingSoon?: number;
  /** Active/extended rentals past plannedEnd and not returned. */
  overdue?: number;
  /** Approved/payment-pending/signature-pending bookings with no live rental and no assigned unit. */
  awaitingBike?: number;
  /** BikeUnit count in Available status. */
  availableBikes?: number;
  /** BikeUnit count in Rented status. */
  rentedBikes?: number;
  /** BikeUnit count in Incoming status (on order from distributor). */
  incomingBikes?: number;
  /** Maintenance tickets not yet resolved. */
  maintenanceOpen?: number;
  /** Sum of active + extended rentals' MonthlyPrice. */
  estMonthlyRevenueEur?: number;
  /** Currency of estMonthlyRevenueEur — "EUR". */
  currency?: string;
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
    // Show ONLY a server-supplied detail message when present; otherwise a
    // friendly generic (never the bare "Request failed (nnn)" prefix).
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string; notConfigured?: boolean };
      if (data?.notConfigured) throw new AdminConfigError();
      if (data?.error) detail = data.error;
    } catch (err) {
      if (err instanceof AdminConfigError) throw err;
      /* non-JSON body — fall through */
    }
    throw new AdminMetricsApiError(
      detail || `Something went wrong (${res.status}). Try again.`,
      res.status,
    );
  }

  return (await res.json()) as AdminMetrics;
}
