/**
 * Admin maintenance API client for the /admin/maintenance vertical.
 * Self-contained: it reads the admin JWT from localStorage (the same key the
 * admin home writes) and sends it as `Authorization: Bearer <token>` on every
 * request. A 401 is surfaced as a typed MaintenanceAuthError so the page can
 * prompt for a fresh sign-in; a missing API base URL surfaces as
 * MaintenanceConfigError.
 *
 * This mirrors src/services/adminFleetService.ts but is kept separate so the
 * maintenance slice owns its own contract types and helpers.
 *
 * Endpoints:
 *   GET   /api/admin/maintenance              (list — reused from the dashboard)
 *   POST  /api/admin/maintenance              (create a ticket)
 *   PATCH /api/admin/maintenance/{id}/status  (set status)
 */
import { API_BASE } from "@/services/api";

/** localStorage key shared with the admin home (src/app/admin/page.tsx). */
export const ADMIN_TOKEN_KEY = "rentaro_admin_jwt";

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
  if (!API_BASE) throw new MaintenanceConfigError();

  const token = getAdminToken();
  if (!token) throw new MaintenanceAuthError();

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
    throw new MaintenanceApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new MaintenanceApiError("Your session has expired. Sign in again.", 401);
    // Surface a server-supplied error message when present (e.g. 400/404 bodies).
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) detail = `: ${data.error}`;
    } catch {
      /* non-JSON body — ignore. */
    }
    throw new MaintenanceApiError(`Request failed (${res.status})${detail}`, res.status);
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
