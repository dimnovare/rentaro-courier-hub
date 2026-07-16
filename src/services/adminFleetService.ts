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
  location: string | null;
  batteryId: string | null;
  lockId: string | null;
  lastServiceDate: string | null;
  nextServiceDueDate: string | null;
  notes: string | null;
  condition: "new" | "used";
  forSale: boolean;
  salePrice: number | null;
  /** ISO yyyy-mm-dd. When a unit is on order (status "incoming"), the date it is
   *  expected to arrive from the distributor. Null for in-stock units. */
  expectedArrivalDate: string | null;
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
      if (data?.error) detail = data.error;
    } catch {
      /* non-JSON body — ignore. */
    }
    if (notConfigured) throw new FleetConfigError();
    // A server-supplied detail reads best on its own; otherwise fall back to a
    // friendly generic rather than a bare "Request failed (nnn)".
    throw new FleetApiError(
      detail || `Something went wrong (${res.status}). Try again.`,
      res.status,
    );
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

/** Fields that can be patched on an existing unit. Any subset is accepted;
 *  only the provided keys are updated server-side (salePrice must be >= 0).
 *  For optional strings, send the trimmed value to set it, "" to clear it, or
 *  omit the key to leave it unchanged. The PATCH route param is the unit's
 *  CURRENT internal code; sending `internalCode` here RENAMES it to that new
 *  (unique) code — backend ignores an unchanged value, 409s on a collision.
 *  A blank modelId/cityId leaves the current one. */
export interface UpdateUnitInput {
  internalCode?: string;
  modelId?: string;
  cityId?: string;
  serialNumber?: string;
  location?: string;
  batteryId?: string;
  lockId?: string;
  lastServiceDate?: string;
  nextServiceDueDate?: string;
  notes?: string;
  condition?: "new" | "used";
  forSale?: boolean;
  salePrice?: number | null;
  /** ISO yyyy-mm-dd to set the expected-arrival date, "" to clear it, or omit
   *  the key to leave it unchanged (matches the other optional-string fields). */
  expectedArrivalDate?: string;
}

/** Update the used/for-sale state of an existing bike unit. Returns the
 *  updated unit for the fleet table. */
export const updateUnit = (internalCode: string, patch: UpdateUnitInput) =>
  request<FleetUnit>(`/api/admin/units/${encodeURIComponent(internalCode)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

/** Permanently delete a bike unit (204 on success). 409 when the unit has
 *  rental history — retire it instead. The request helper returns undefined
 *  for a 204 body. */
export const deleteUnit = (internalCode: string): Promise<void> =>
  request<void>(`/api/admin/units/${encodeURIComponent(internalCode)}`, {
    method: "DELETE",
  });

/** Fields accepted when creating a bike unit. `internalCode`, `modelId` and
 *  `cityId` are required; everything else is optional. */
export interface CreateUnitInput {
  internalCode: string;
  modelId: string;
  cityId: string;
  status?: string;
  serialNumber?: string;
  location?: string;
  batteryId?: string;
  lockId?: string;
  lastServiceDate?: string;
  nextServiceDueDate?: string;
  notes?: string;
  condition?: "new" | "used";
  forSale?: boolean;
  salePrice?: number | null;
  /** ISO yyyy-mm-dd — expected arrival for a unit created as "incoming". */
  expectedArrivalDate?: string;
}

/** Create a physical bike unit. Returns the created unit for the fleet table. */
export const createUnit = (input: CreateUnitInput) =>
  request<FleetUnit>("/api/admin/units", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** Receive an incoming (on-order) unit into live stock: PATCH its status from
 *  "incoming" to "available". Thin wrapper over updateUnitStatus so the fleet
 *  page's one-click "Receive" reads clearly at the call site. Returns the
 *  updated unit. */
export const receiveUnit = (internalCode: string) =>
  updateUnitStatus(internalCode, "available");
