/**
 * Admin pricing API client for the /admin/pricelist vertical. Calls the
 * same-origin Next BFF proxy (`/api/admin/*`), which attaches the admin JWT from
 * an httpOnly cookie server-side — so this client holds no token. A 401 surfaces
 * as a typed PricingApiError (unauthorized) so the page can prompt for a fresh
 * sign-in; a not-configured backend surfaces as PricingConfigError.
 *
 * This mirrors src/services/adminMaintenanceService.ts but is kept separate so
 * the pricelist slice owns its own contract types and helpers.
 *
 * Endpoints (backend: AdminCatalogEndpoints.Pricing.cs, MapGroup "/api/admin"):
 *   GET /api/admin/pricing         (list all plans — AdminPlanDto[])
 *   PUT /api/admin/pricing/{code}  (edit one plan — body AdminPlanInput; the
 *                                   {code} path segment is authoritative, any
 *                                   id in the body is ignored on update)
 */

import type { LocalizedStrings } from "@/types/pricing";

/* ── Contract types (must match the backend AdminPlanDto exactly) ────────── */

export interface AdminPlan {
  /** Stable plan code (e.g. "p30"); fills the {code} route segment. Fixed after create. */
  id: string;
  /** Display term, e.g. "30 days" / "6 months" / "12 months". */
  term: string;
  /** Commitment length in months (1 / 6 / 12). */
  months: number;
  /** Daily rate in EUR (decimal, e.g. 5.9). */
  daily: number;
  /** Price per 30-day period in EUR (integer, e.g. 177). */
  monthly: number;
  /** Marketing tag, e.g. "Best price". */
  tag: string;
  /** Highlighted plan on the public pricing section. */
  featured: boolean;
  /** Per-language perk lists (locale → string[]); e.g. { en: [...], et: [...], … }. */
  perks: LocalizedStrings;
  sortOrder: number;
}

/** Body for editing a plan — the full AdminPlanInput minus the immutable id. */
export type PlanInput = Omit<AdminPlan, "id">;

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class PricingApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PricingApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class PricingConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "PricingConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class PricingAuthError extends Error {
  constructor() {
    super("Sign in on the admin home to manage the pricelist.");
    this.name = "PricingAuthError";
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
    throw new PricingApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new PricingApiError("Your session has expired. Sign in again.", 401);
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
    if (notConfigured) throw new PricingConfigError();
    throw new PricingApiError(`Request failed (${res.status})${detail}`, res.status);
  }

  // 204 / empty body tolerance.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

/** Lists every pricing plan (global tiers), unordered — sort by sortOrder client-side. */
export const getPlans = () => request<AdminPlan[]>("/api/admin/pricing");

/** Saves one plan's editable fields; returns the saved plan. */
export const updatePlan = (code: string, body: PlanInput) =>
  request<AdminPlan>(`/api/admin/pricing/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
