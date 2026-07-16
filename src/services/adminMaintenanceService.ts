/**
 * Admin maintenance API client for the /admin/maintenance vertical. Calls the
 * same-origin Next BFF proxy (`/api/admin/*`), which attaches the admin JWT from
 * an httpOnly cookie server-side — so this client holds no token. A 401 surfaces
 * as a typed MaintenanceApiError (unauthorized) so the page can prompt for a
 * fresh sign-in; a not-configured backend surfaces as MaintenanceConfigError.
 *
 * This mirrors src/services/adminFleetService.ts but is kept separate so the
 * maintenance slice owns its own contract types and helpers.
 *
 * Endpoints:
 *   GET    /api/admin/maintenance              (list — reused from the dashboard)
 *   POST   /api/admin/maintenance              (create a ticket)
 *   PATCH  /api/admin/maintenance/{id}/status  (set status)
 *   DELETE /api/admin/maintenance/{id}         (delete a ticket)
 */

/* ── Contract types (must match the backend exactly) ───────────────────── */

export interface MaintenanceTicket {
  id: number;
  bikeUnitCode: string;
  issueType: string;
  priority: string;
  status: string;
  createdAt: string;
  /** Present on the write-endpoint shape; the list endpoint omits it (undefined). */
  resolvedAt?: string | null;
  description: string;
}

export interface CreateTicketInput {
  bikeUnitCode: string;
  issueType: string;
  priority: string;
  description: string;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class MaintenanceApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MaintenanceApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class MaintenanceConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "MaintenanceConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class MaintenanceAuthError extends Error {
  constructor() {
    super("Sign in on the admin home to manage maintenance.");
    this.name = "MaintenanceAuthError";
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
    throw new MaintenanceApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new MaintenanceApiError("Your session has expired. Sign in again.", 401);
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
    if (notConfigured) throw new MaintenanceConfigError();
    // A server-supplied detail reads best on its own; otherwise fall back to a
    // friendly generic rather than a bare "Request failed (nnn)".
    throw new MaintenanceApiError(
      detail || `Something went wrong (${res.status}). Try again.`,
      res.status,
    );
  }

  // 204 / empty body tolerance.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

/** Lists all maintenance tickets (reuses the read-only dashboard endpoint). */
export const listTickets = () => request<MaintenanceTicket[]>("/api/admin/maintenance");

/** Creates a new maintenance ticket; returns the created ticket. */
export const createTicket = (input: CreateTicketInput) =>
  request<MaintenanceTicket>("/api/admin/maintenance", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** Sets a ticket's status (e.g. "inprogress" / "resolved"). */
export const updateStatus = (id: number, status: string) =>
  request<MaintenanceTicket>(`/api/admin/maintenance/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

/** Deletes a ticket permanently. A backend without the endpoint answers
 *  400/404, which surfaces as a normal MaintenanceApiError banner. */
export const deleteTicket = (id: number) =>
  request<void>(`/api/admin/maintenance/${id}`, { method: "DELETE" });
