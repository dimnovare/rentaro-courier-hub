/**
 * Admin support API client for the /admin/support vertical. Calls the
 * same-origin Next BFF proxy (`/api/admin/*`), which attaches the admin JWT from
 * an httpOnly cookie server-side — so this client holds no token. A 401 surfaces
 * as a typed SupportApiError (unauthorized) so the page can prompt for a fresh
 * sign-in; a not-configured backend surfaces as SupportConfigError.
 *
 * This mirrors src/services/adminMaintenanceService.ts but owns the support
 * inbox contract types.
 *
 * Endpoints (cookie session, via the proxy):
 *   GET  /api/admin/support               (list — newest first)
 *   POST /api/admin/support/{id}/resolve  (mark a ticket resolved)
 */

/* ── Contract types (must match the backend exactly) ───────────────────── */

/**
 * A support ticket as returned by the admin inbox endpoint
 * (AdminSupportTicketDto). `id` and `bookingId` are GUID strings on the wire;
 * `bookingId` is null for messages not tied to a specific booking. `resolvedAt`
 * is OMITTED (not null) until the ticket is resolved — the backend serializes
 * with WhenWritingNull.
 */
export interface SupportTicket {
  id: string;
  bookingId: string | null;
  customerEmail: string;
  source: string;
  message: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class SupportApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SupportApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class SupportConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "SupportConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class SupportAuthError extends Error {
  constructor() {
    super("Sign in on the admin home to manage support.");
    this.name = "SupportAuthError";
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
    throw new SupportApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new SupportApiError("Your session has expired. Sign in again.", 401);
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
    if (notConfigured) throw new SupportConfigError();
    // A server-supplied detail reads best on its own; otherwise fall back to a
    // friendly generic rather than a bare "Request failed (nnn)".
    throw new SupportApiError(
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

/** Lists all support tickets (the backend returns them newest first). */
export const listSupportTickets = () => request<SupportTicket[]>("/api/admin/support");

/** Marks a support ticket resolved; returns the updated ticket. */
export const resolveSupportTicket = (id: string) =>
  request<SupportTicket>(`/api/admin/support/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
  });
