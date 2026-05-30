/**
 * Read-only admin API client. Unlike the public services (which fall back to
 * local mock data via apiGet), the admin UI requires the live .NET API and a
 * logged-in admin.
 *
 * Auth goes through the same-origin Next BFF: `adminLogin` posts credentials to
 * `/api/admin/login`, which stores the JWT in an httpOnly cookie server-side.
 * Every subsequent request hits the same-origin `/api/admin/*` proxy, which
 * attaches the token — so this client never sees or sends the JWT itself, and a
 * browser never holds it where XSS could read it. A 401 is surfaced as a typed
 * AdminApiError so the dashboard can prompt for a fresh sign-in.
 */

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
  /** Optional referral / promo code the customer entered at booking time. */
  referralCode: string | null;
}

export interface AdminFleetModel {
  id: string;
  name: string;
  brand: string;
  status: string;
  availability: number;
}

export interface AdminFleetUnit {
  internalCode: string;
  modelId: string;
  cityId: string;
  status: string;
}

export interface AdminFleet {
  models: AdminFleetModel[];
  units: AdminFleetUnit[];
}

export interface AdminMaintenanceTicket {
  id: string;
  bikeUnitCode: string;
  issueType: string;
  priority: string;
  status: string;
  createdAt: string;
  description: string;
}

/* ── Typed error ───────────────────────────────────────────────────────── */

export class AdminApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
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

/* ── Core fetch helper ─────────────────────────────────────────────────── */

/** Maps a not-OK same-origin proxy response to a typed error. */
async function failed(res: Response): Promise<never> {
  if (res.status === 401) throw new AdminApiError("Your session has expired. Sign in again.", 401);
  try {
    const data = (await res.json()) as { notConfigured?: boolean };
    if (data?.notConfigured) throw new AdminConfigError();
  } catch (err) {
    if (err instanceof AdminConfigError) throw err;
    /* non-JSON body — fall through to a generic error */
  }
  throw new AdminApiError(`Request failed (${res.status})`, res.status);
}

async function adminGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) await failed(res);

  return (await res.json()) as T;
}

/* ── Authentication ────────────────────────────────────────────────────── */

/**
 * Signs in via the BFF: posts credentials to the same-origin `/api/admin/login`
 * route, which stores the JWT in an httpOnly cookie server-side. Resolves on
 * success (the token is never returned to the browser); throws AdminApiError(401)
 * on invalid credentials and AdminConfigError when the API base URL is not set.
 */
export async function adminLogin(username: string, password: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (res.ok) return;

  if (res.status === 401) throw new AdminApiError("Invalid username or password", 401);
  let message = `Sign-in failed (${res.status})`;
  try {
    const data = (await res.json()) as { error?: string; notConfigured?: boolean };
    if (data?.notConfigured) throw new AdminConfigError();
    if (data?.error) message = data.error;
  } catch (err) {
    if (err instanceof AdminConfigError) throw err;
    /* non-JSON body — keep the default message */
  }
  throw new AdminApiError(message, res.status);
}

/** Clears the admin session cookie via the BFF logout route. Never throws. */
export async function adminLogout(): Promise<void> {
  try {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    /* best-effort — the client drops its session regardless */
  }
}

/* ── Public surface ────────────────────────────────────────────────────── */

export const getAdminBookings = () => adminGet<AdminBooking[]>("/api/admin/bookings");

export const getAdminFleet = () => adminGet<AdminFleet>("/api/admin/fleet");

export const getAdminMaintenance = () =>
  adminGet<AdminMaintenanceTicket[]>("/api/admin/maintenance");
