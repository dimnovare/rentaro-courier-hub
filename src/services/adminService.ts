/**
 * Read-only admin API client. Unlike the public services (which fall back to
 * local mock data via apiGet), the admin UI requires the live .NET API and a
 * logged-in admin. The admin signs in with username + password via adminLogin
 * to obtain a JWT, which every subsequent request sends as
 * `Authorization: Bearer <token>`. A 401 is surfaced as a typed AdminApiError
 * so the dashboard can prompt for a fresh sign-in.
 */
import { API_BASE } from "./api";

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

async function adminGet<T>(path: string, token: string): Promise<T> {
  if (!API_BASE) throw new AdminConfigError();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new AdminApiError("Your session has expired. Sign in again.", 401);
    throw new AdminApiError(`Request failed (${res.status})`, res.status);
  }

  return (await res.json()) as T;
}

/* ── Authentication ────────────────────────────────────────────────────── */

/**
 * Exchanges admin credentials for a JWT. Resolves with the bearer token on
 * success; throws AdminApiError(401) on invalid credentials and
 * AdminConfigError when the API base URL is not set.
 */
export async function adminLogin(username: string, password: string): Promise<string> {
  if (!API_BASE) throw new AdminConfigError();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new AdminApiError("Invalid username or password", 401);
    throw new AdminApiError(`Sign-in failed (${res.status})`, res.status);
  }

  const data = (await res.json()) as { token: string; expiresAt: string };
  return data.token;
}

/* ── Public surface ────────────────────────────────────────────────────── */

export const getAdminBookings = (token: string) =>
  adminGet<AdminBooking[]>("/api/admin/bookings", token);

export const getAdminFleet = (token: string) =>
  adminGet<AdminFleet>("/api/admin/fleet", token);

export const getAdminMaintenance = (token: string) =>
  adminGet<AdminMaintenanceTicket[]>("/api/admin/maintenance", token);
