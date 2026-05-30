/**
 * Admin fleet API client for the /admin/fleet vertical. Calls the same-origin
 * Next BFF proxy (`/api/admin/*`), which attaches the admin JWT from an httpOnly
 * cookie server-side — so this client holds no token. A 401 is surfaced as a
 * typed FleetApiError (unauthorized) so the page can prompt for a fresh sign-in;
 * a not-configured backend surfaces as FleetConfigError.
 *
 * This mirrors src/services/adminService.ts but is kept separate so the fleet
 * slice owns its own contract types and helpers.
 */

/* ── Contract types (must match the backend exactly) ───────────────────── */

export interface FleetUnit {
  internalCode: string;
  modelId: string;
  cityId: string;
  status: string;
  serialNumber: string | null;
  lastServiceDate: string | null;
  nextServiceDueDate: string | null;
  notes: string | null;
}

export interface FleetRental {
  id: string;
  bikeUnitInternalCode: string | null;
  customerEmail: string;
  startDate: string;
  plannedEndDate: string | null;
  planId: string;
  status: string;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class FleetApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FleetApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class FleetConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "FleetConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class FleetAuthError extends Error {
  constructor() {
    super("Sign in on the admin home to manage the fleet.");
    this.name = "FleetAuthError";
  }
}

/* ── Core fetch helper ─────────────────────────────────────────────────── */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new FleetApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new FleetApiError("Your session has expired. Sign in again.", 401);
    // Surface a server-supplied error message when present (e.g. 400/404 bodies);
    // the proxy flags an unconfigured backend with { notConfigured: true }.
    let detail = "";
    let notConfigured = false;
    try {
      const data = (await res.json()) as { error?: string; notConfigured?: boolean };
      if (data?.notConfigured) notConfigured = true;
      if (data?.error) detail = `: ${data.error}`;
    } catch {
      /* non-JSON body — ignore. */
    }
    if (notConfigured) throw new FleetConfigError();
    throw new FleetApiError(`Request failed (${res.status})${detail}`, res.status);
  }

  // 204 / empty bodies are not expected here, but guard anyway.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

export const getUnits = () => request<FleetUnit[]>("/api/admin/units");

export const getRentals = () => request<FleetRental[]>("/api/admin/rentals");

export const updateUnitStatus = (internalCode: string, status: string) =>
  request<FleetUnit>(`/api/admin/units/${encodeURIComponent(internalCode)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
