/**
 * Admin contract API client. Calls the same-origin Next BFF proxy
 * (`/api/admin/*`), which attaches the admin JWT from an httpOnly cookie
 * server-side — so this client holds no token, including for the PDF download
 * (the cookie is sent with the blob fetch automatically). An HTTP 401 surfaces
 * as a typed ContractApiError so the page can prompt for a fresh sign-in; a
 * not-configured backend surfaces as ContractConfigError.
 *
 * This mirrors the other admin slices (adminFleetService / adminBookingService)
 * but owns the contract-template + contract-generation contract types.
 *
 * Endpoints (cookie session, via the proxy):
 *   POST  /api/admin/contract-templates              (multipart upload: file + name)
 *   GET   /api/admin/contract-templates              (list)
 *   POST  /api/admin/contract-templates/{id}/activate
 *   POST  /api/admin/bookings/{bookingId}/contract   (generate a contract)
 *   GET   /api/admin/contracts/{id}                  (contract DTO)
 *   GET   /api/admin/contracts/{id}/document?kind=…  (PDF bytes)
 */

/* ── Contract types (must match the backend exactly) ───────────────────── */

/** A uploaded contract template (.docx / .pdf) with its detected placeholders. */
export interface ContractTemplate {
  id: string;
  name: string;
  fileName: string;
  contentType: string;
  placeholders: string[];
  isActive: boolean;
  version: number;
  createdAt: string;
}

/** Signature lifecycle — must match the backend SignatureStatus enum. */
export type ContractStatus =
  | "NotStarted"
  | "Generated"
  | "SentForSignature"
  | "Viewed"
  | "Signed"
  | "Declined"
  | "Expired"
  | "Failed";

/** A generated rental contract for a booking. */
export interface Contract {
  id: string;
  bookingId: string;
  status: ContractStatus;
  signatureProvider: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signingUrl: string | null;
  hasGeneratedPdf: boolean;
  hasSignedPdf: boolean;
  createdAt: string;
  signedAt: string | null;
  /** Cryptographically verified signer from the qualified e-signature. Present
   *  once the contract is signed; lets an admin confirm the signer matches the
   *  renter. Distinct from signerName, which is the intended/booked signer. */
  signedByName: string | null;
  signedByCountry: string | null;
}

/** Which rendition of the contract PDF to fetch. */
export type ContractDocumentKind = "generated" | "signed";

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class ContractApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 (or a missing token) — the caller should re-auth. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ContractApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class ContractConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "ContractConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class ContractAuthError extends ContractApiError {
  constructor() {
    super("You are not signed in. Sign in on the admin home.", 401);
    this.name = "ContractAuthError";
  }
}

/* ── Core fetch helper ─────────────────────────────────────────────────── */

/**
 * Turn a non-OK proxy response into a typed error: ContractConfigError when the
 * backend base URL is unset (`{ notConfigured: true }`), otherwise a
 * ContractApiError carrying any server-supplied `{ error }` message.
 */
async function fail(res: Response): Promise<never> {
  if (res.status === 401) {
    throw new ContractApiError("Your session has expired. Sign in again.", 401);
  }
  let detail = "";
  try {
    const data = (await res.json()) as { error?: string; notConfigured?: boolean };
    if (data?.notConfigured) throw new ContractConfigError();
    if (data?.error) detail = `: ${data.error}`;
  } catch (err) {
    if (err instanceof ContractConfigError) throw err;
    /* non-JSON body — ignore. */
  }
  throw new ContractApiError(`Request failed (${res.status})${detail}`, res.status);
}

/**
 * JSON/multipart request helper for the same-origin proxy. Sets a JSON
 * Content-Type only when there is a body. `body` may be a pre-stringified
 * payload or a FormData (in which case we let the browser set the multipart
 * boundary). The session cookie is sent automatically.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        // Never set Content-Type for FormData — the browser adds the boundary.
        ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ContractApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) await fail(res);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Templates ─────────────────────────────────────────────────────────── */

/** List all contract templates (newest backend ordering preserved). */
export function listTemplates(): Promise<ContractTemplate[]> {
  return request<ContractTemplate[]>("/api/admin/contract-templates");
}

/**
 * Upload a new contract template. `file` is a .docx or .pdf; `name` is optional
 * (the backend falls back to the file name). Sent as multipart/form-data.
 */
export function uploadTemplate(file: File, name?: string): Promise<ContractTemplate> {
  const form = new FormData();
  form.append("file", file);
  const trimmed = name?.trim();
  if (trimmed) form.append("name", trimmed);
  return request<ContractTemplate>("/api/admin/contract-templates", {
    method: "POST",
    body: form,
  });
}

/** Make a template the active one used for new contracts. */
export function activateTemplate(id: string): Promise<ContractTemplate> {
  return request<ContractTemplate>(
    `/api/admin/contract-templates/${encodeURIComponent(id)}/activate`,
    { method: "POST" },
  );
}

/* ── Contracts ─────────────────────────────────────────────────────────── */

/** Generate (or regenerate) a contract for a booking from the active template. */
export function generateContract(bookingId: string): Promise<Contract> {
  return request<Contract>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/contract`,
    { method: "POST" },
  );
}

/** Fetch a single contract by id. */
export function getContract(id: string): Promise<Contract> {
  return request<Contract>(`/api/admin/contracts/${encodeURIComponent(id)}`);
}

/* ── Document download ─────────────────────────────────────────────────── */

/**
 * The same-origin proxy path for a contract's PDF. We fetch the bytes and open
 * them via a blob URL (rather than navigating to the path) so the document
 * opens in a new tab without leaving the console. The session cookie is sent
 * automatically with the fetch.
 */
export function contractDocumentPath(id: string, kind: ContractDocumentKind): string {
  return `/api/admin/contracts/${encodeURIComponent(id)}/document?kind=${kind}`;
}

/**
 * Fetch a contract PDF through the same-origin proxy (the cookie carries auth)
 * and open it in a new browser tab via an object URL. Throws ContractApiError on
 * failure so the caller can surface a banner. The object URL is revoked after a
 * delay so the new tab has time to load it.
 */
export async function openContractDocument(
  id: string,
  kind: ContractDocumentKind,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(contractDocumentPath(id, kind), {
      headers: { Accept: "application/pdf" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ContractApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) await fail(res);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // Give the new tab time to read the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
