/**
 * Admin site-settings API client. Reads and writes the single-row SiteSettings
 * record that controls public-site feature visibility (six toggles) and the bank
 * requisites shown for manual transfers.
 *
 * Like adminCatalogService, this calls the same-origin Next BFF proxy
 * (`/api/admin/settings`), which attaches the admin JWT from an httpOnly cookie
 * server-side — so this client holds no token. A 401 surfaces as a typed
 * SettingsApiError (unauthorized) so the page can prompt for a fresh sign-in; an
 * unconfigured backend surfaces as SettingsConfigError.
 *
 * Backend (JWT Bearer):
 *   GET /api/admin/settings  → SiteSettings
 *   PUT /api/admin/settings  (body = SiteSettings) → upserts the row
 *
 * The shape matches the public GET /api/public/settings DTO exactly (camelCase),
 * so the public read client (settingsService.ts) and this admin client share one
 * contract.
 */

/* ── Contract type ─────────────────────────────────────────────────────── */

// One canonical SiteSettings lives in @/types/settings; import it for local use
// and re-export so existing consumers importing it from this admin client keep
// working.
import type { SiteSettings } from "@/types/settings";
export type { SiteSettings };

/* ── Typed errors (mirror adminCatalogService) ─────────────────────────── */

export class SettingsApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SettingsApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class SettingsConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "SettingsConfigError";
  }
}

/* ── Core fetch helper (mirrors adminCatalogService.request) ───────────── */

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
    throw new SettingsApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new SettingsApiError("Your session has expired. Sign in again.", 401);
    }
    // Show ONLY the server-supplied error message when present, otherwise a
    // friendly generic — never the raw "Request failed" prefix.
    let detail = "";
    let notConfigured = false;
    try {
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        title?: string;
        notConfigured?: boolean;
      };
      if (data?.notConfigured) notConfigured = true;
      const msg = data?.error ?? data?.message ?? data?.title;
      if (msg) detail = msg;
    } catch {
      /* non-JSON body — ignore. */
    }
    if (notConfigured) throw new SettingsConfigError();
    throw new SettingsApiError(
      detail || `Something went wrong (${res.status}). Try again.`,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/* ── Endpoints ─────────────────────────────────────────────────────────── */

export const getSettings = () => request<SiteSettings>("/api/admin/settings");

export const updateSettings = (body: SiteSettings) =>
  request<SiteSettings>("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
