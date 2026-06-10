/**
 * Admin catalog (content) API client for the /admin/content vertical: typed CRUD
 * for accessories, cities, pricing plans and FAQ entries. Calls the same-origin
 * Next BFF proxy (`/api/admin/*`), which attaches the admin JWT from an httpOnly
 * cookie server-side — so this client holds no token. A 401 is surfaced as a
 * typed CatalogApiError (unauthorized) so the page can prompt for a fresh
 * sign-in; a not-configured backend surfaces as CatalogConfigError.
 *
 * This mirrors src/services/adminFleetService.ts but owns its own contract types.
 * The field shapes match the live API exactly (camelCase). The public
 * /api/public/* DTOs are a read-only subset of these admin entities, so the `id`
 * field here is the same stable business key the public site already uses
 * (e.g. "battery", "tallinn", "p30") — and that `id` value is what gets
 * interpolated into the `{code}` route segment for write/delete requests.
 *
 * Backend (JWT Bearer):
 *   Accessories  GET/POST/PUT/DELETE /api/admin/accessories[/{code}]
 *   Cities       GET/POST/PUT/DELETE /api/admin/cities[/{code}]
 *   Pricing      GET/POST/PUT/DELETE /api/admin/pricing[/{code}]
 *   FAQ          GET/POST/PUT/DELETE /api/admin/faq[/{id}]
 */
/* ── Contract types (match the live API exactly) ───────────────────────── */

/** City status enum — must match the backend CityStatus enum (lowercased). */
export type CityStatusValue = "available" | "limited" | "soon";

export interface AdminAccessory {
  /** Stable business key; this value fills the {code} route segment. */
  id: string;
  name: string;
  /** Display price, e.g. "€29 / 30d". */
  price: string;
  /** Icon key (see components/ui/Icon). */
  icon: string;
  sortOrder: number;
}

export interface AdminCity {
  /** Stable business key; this value fills the {code} route segment. */
  id: string;
  name: string;
  country: string;
  available: number;
  pickup: string;
  status: CityStatusValue;
  sortOrder: number;
}

export interface AdminPlan {
  /** Stable business key; this value fills the {code} route segment. Set on create, fixed after. */
  id: string;
  term: string;
  months: number;
  /** Daily rate in EUR. */
  daily: number;
  /** Price per 30-day period in EUR. */
  monthly: number;
  tag: string;
  featured: boolean;
  perks: string[];
  sortOrder: number;
}

export interface AdminFaq {
  /** Numeric id; this value fills the {id} route segment. Assigned on create. */
  id: number;
  question: string;
  answer: string;
  openByDefault: boolean;
  sortOrder: number;
}

/* ── Write payloads ────────────────────────────────────────────────────── */

/** Body for creating/updating an accessory. */
export type AccessoryInput = AdminAccessory;
/** Body for creating/updating a city. */
export type CityInput = AdminCity;
/** Body for editing a pricing plan (term, months, daily, monthly, tag, featured, perks, sortOrder).
 *  Creating a plan uses the full AdminPlan (it must also carry the `id`/code). */
export type PlanInput = Omit<AdminPlan, "id">;
/** Body for creating/updating a FAQ entry (id is server-assigned / in the path). */
export type FaqInput = Omit<AdminFaq, "id">;

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class CatalogApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CatalogApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class CatalogConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "CatalogConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class CatalogAuthError extends Error {
  constructor() {
    super("Sign in on the admin home to manage content.");
    this.name = "CatalogAuthError";
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
    throw new CatalogApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new CatalogApiError("Your session has expired. Sign in again.", 401);
    }
    // Surface a server-supplied error message when present (e.g. 400/404/409 { error });
    // the proxy flags an unconfigured backend with { notConfigured: true }.
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
      if (msg) detail = `: ${msg}`;
    } catch {
      /* non-JSON body — ignore. */
    }
    if (notConfigured) throw new CatalogConfigError();
    throw new CatalogApiError(`Request failed (${res.status})${detail}`, res.status);
  }

  // Some writes (e.g. DELETE) reply 204 with no body.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/* ── Accessories ───────────────────────────────────────────────────────── */

export const getAccessories = () => request<AdminAccessory[]>("/api/admin/accessories");

export const createAccessory = (body: AccessoryInput) =>
  request<AdminAccessory>("/api/admin/accessories", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateAccessory = (code: string, body: AccessoryInput) =>
  request<AdminAccessory>(`/api/admin/accessories/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteAccessory = (code: string) =>
  request<void>(`/api/admin/accessories/${encodeURIComponent(code)}`, { method: "DELETE" });

/* ── Cities ────────────────────────────────────────────────────────────── */

export const getCities = () => request<AdminCity[]>("/api/admin/cities");

export const createCity = (body: CityInput) =>
  request<AdminCity>("/api/admin/cities", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateCity = (code: string, body: CityInput) =>
  request<AdminCity>(`/api/admin/cities/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteCity = (code: string) =>
  request<void>(`/api/admin/cities/${encodeURIComponent(code)}`, { method: "DELETE" });

/* ── Pricing plans (create + edit + delete; pricing stays GLOBAL per plan) ─ */

export const getPlans = () => request<AdminPlan[]>("/api/admin/pricing");

/** Create a new pricing tier. Body carries the chosen `id`/code (unique, ≤64 chars). */
export const createPlan = (body: AdminPlan) =>
  request<AdminPlan>("/api/admin/pricing", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updatePlan = (code: string, body: PlanInput) =>
  request<AdminPlan>(`/api/admin/pricing/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deletePlan = (code: string) =>
  request<void>(`/api/admin/pricing/${encodeURIComponent(code)}`, { method: "DELETE" });

/* ── FAQ ───────────────────────────────────────────────────────────────── */

export const getFaqs = () => request<AdminFaq[]>("/api/admin/faq");

export const createFaq = (body: FaqInput) =>
  request<AdminFaq>("/api/admin/faq", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateFaq = (id: number, body: FaqInput) =>
  request<AdminFaq>(`/api/admin/faq/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteFaq = (id: number) =>
  request<void>(`/api/admin/faq/${encodeURIComponent(String(id))}`, { method: "DELETE" });
