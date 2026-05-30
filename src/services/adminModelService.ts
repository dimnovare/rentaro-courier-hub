/**
 * Admin bike-model API client for the /admin/models vertical. Self-contained:
 * it reads the admin JWT from localStorage (key `rentaro_admin_jwt`, the same
 * key the admin home writes) and sends it as `Authorization: Bearer <jwt>` to
 * the live .NET API at `${API_BASE}`. A missing token or HTTP 401 surfaces as a
 * typed ModelAuthError so the page can drop to its sign-in gate; a missing API
 * base URL surfaces as ModelConfigError.
 *
 * This mirrors the other admin slices (adminFleetService / adminContractService)
 * but owns the bike-model management contract types.
 *
 * Endpoints (JWT Bearer):
 *   GET    /api/admin/models                  (list — every editable field)
 *   POST   /api/admin/models                  (create)
 *   PUT    /api/admin/models/{code}           (update)
 *   DELETE /api/admin/models/{code}           (delete)
 *   POST   /api/admin/models/{code}/image     (multipart upload, field `file`)
 *
 * The uploaded image is then served publicly at:
 *   GET    /api/public/models/{code}/image
 */
import { API_BASE } from "@/services/api";

/** localStorage key shared with the admin home (src/app/admin/page.tsx). */
export const ADMIN_TOKEN_KEY = "rentaro_admin_jwt";

/* ── Contract types (must match the backend exactly) ───────────────────── */

/** A model's display badge — `variant` drives its colour on the marketing site. */
export interface AdminModelBadge {
  text: string;
  variant: string;
}

/**
 * Free-form manufacturer spec sheet. Every field is optional and the backend
 * round-trips it as an object, so the editor treats it as opaque JSON.
 */
export type AdminModelSpec = Record<string, unknown>;

/**
 * A bike model with every editable field. Mirrors the admin models DTO.
 * `hasUploadedImage` reflects whether a custom photo has been uploaded (and is
 * therefore being served from /api/public/models/{code}/image).
 */
export interface AdminModel {
  code: string;
  brand: string;
  name: string;
  tagline: string;
  blurb: string;
  img: string;
  fromDay: number;
  status: string;
  availability: number;
  popular: boolean;
  sortOrder: number;
  badge: AdminModelBadge | null;
  pills: string[];
  spec: AdminModelSpec | null;
  hasUploadedImage: boolean;
}

/**
 * Editable subset used for create / update. `code` is the identifier: required
 * on create, immutable on update (the URL carries it). All other fields are
 * optional on update so callers can PATCH-style send only what changed; the
 * page sends the full set so the contract stays explicit.
 */
export interface ModelInput {
  code?: string;
  brand?: string;
  name?: string;
  tagline?: string;
  blurb?: string;
  img?: string;
  fromDay?: number;
  status?: string;
  availability?: number;
  popular?: boolean;
  sortOrder?: number;
  badge?: AdminModelBadge | null;
  pills?: string[];
  spec?: AdminModelSpec | null;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class ModelApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 (or a missing token) — the caller should re-auth. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ModelApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class ModelConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "ModelConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class ModelAuthError extends ModelApiError {
  constructor() {
    super("Sign in on the admin home to manage models.", 401);
    this.name = "ModelAuthError";
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

/** Turn a non-OK response into a ModelApiError, surfacing any { error }. */
async function fail(res: Response): Promise<never> {
  if (res.status === 401) {
    throw new ModelApiError("Your session has expired. Sign in again.", 401);
  }
  let detail = "";
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error) detail = `: ${data.error}`;
  } catch {
    /* non-JSON body — ignore. */
  }
  throw new ModelApiError(`Request failed (${res.status})${detail}`, res.status);
}

/**
 * Request helper. Sends the admin bearer token; sets a JSON Content-Type only
 * when there is a body. `body` may be a pre-stringified payload or FormData (in
 * which case the browser sets the multipart boundary — we must not override it).
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new ModelConfigError();

  const token = getAdminToken();
  if (!token) throw new ModelAuthError();

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        // Never set Content-Type for FormData — the browser adds the boundary.
        ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ModelApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) await fail(res);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

/** List all bike models with every editable field. */
export function listModels(): Promise<AdminModel[]> {
  return request<AdminModel[]>("/api/admin/models");
}

/** Create a new bike model; returns the created model. */
export function createModel(input: ModelInput): Promise<AdminModel> {
  return request<AdminModel>("/api/admin/models", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update an existing model by code; returns the updated model. */
export function updateModel(code: string, patch: ModelInput): Promise<AdminModel> {
  return request<AdminModel>(`/api/admin/models/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/** Delete a model by code. */
export function deleteModel(code: string): Promise<void> {
  return request<void>(`/api/admin/models/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}

/**
 * Upload (or replace) a model's photo. Sent as multipart/form-data with the
 * file under the field name `file`. Returns the updated model (with
 * `hasUploadedImage` now true), so the page can refresh its thumbnail.
 */
export function uploadModelImage(code: string, file: File): Promise<AdminModel> {
  const form = new FormData();
  form.append("file", file);
  return request<AdminModel>(`/api/admin/models/${encodeURIComponent(code)}/image`, {
    method: "POST",
    body: form,
  });
}

/**
 * Public URL for a model's uploaded photo. Bearer-free (the endpoint is public),
 * so it is safe to use directly as an <img src>. Pass a cache-busting token
 * (e.g. an incrementing counter or timestamp) to force the browser to re-fetch
 * after a replace upload.
 */
export function modelImageUrl(code: string, cacheBust?: string | number): string {
  const base = `${API_BASE}/api/public/models/${encodeURIComponent(code)}/image`;
  return cacheBust != null ? `${base}?v=${encodeURIComponent(String(cacheBust))}` : base;
}
