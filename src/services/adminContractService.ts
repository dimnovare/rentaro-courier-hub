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
  /** True once the customer has uploaded a signed copy back (self-service path). */
  hasUploadedDoc: boolean;
  /** Original file name of the customer-uploaded copy, or null. */
  uploadedDocFileName: string | null;
  /** When the customer uploaded a signed copy (ISO), or null. */
  uploadedAt: string | null;
}

/** Which rendition of the contract document to fetch. "uploaded" is the
 *  customer's self-signed copy (may be a .docx, not just a PDF). */
export type ContractDocumentKind = "generated" | "signed" | "uploaded";

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
  // Show ONLY the server-supplied detail message when present; otherwise a
  // friendly generic — never the raw "Request failed" prefix.
  let detail = "";
  try {
    const data = (await res.json()) as { error?: string; notConfigured?: boolean };
    if (data?.notConfigured) throw new ContractConfigError();
    if (data?.error) detail = data.error;
  } catch (err) {
    if (err instanceof ContractConfigError) throw err;
    /* non-JSON body — ignore. */
  }
  throw new ContractApiError(
    detail || `Something went wrong (${res.status}). Try again.`,
    res.status,
  );
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

/* ── Status normalisation ──────────────────────────────────────────────── */

/** Map the backend's lowercase status serialisation (it does
 *  `Status.ToString().ToLowerInvariant()`) to the PascalCase ContractStatus the
 *  UI compares against (e.g. "signed" → "Signed"). Without this every
 *  `contract.status === "Signed"` check silently never matches. */
const STATUS_MAP: Record<string, ContractStatus> = {
  notstarted: "NotStarted",
  generated: "Generated",
  sentforsignature: "SentForSignature",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  expired: "Expired",
  failed: "Failed",
};

/** Return the contract with its status normalised to PascalCase. */
function normalizeContract(c: Contract): Contract {
  const mapped = STATUS_MAP[String(c.status).toLowerCase()];
  return mapped ? { ...c, status: mapped } : c;
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

/**
 * Delete a template. The backend refuses to delete the ACTIVE template (409) —
 * activate a replacement first.
 */
export function deleteTemplate(id: string): Promise<void> {
  return request<void>(`/api/admin/contract-templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* ── Contracts ─────────────────────────────────────────────────────────── */

/**
 * Generate (or regenerate) a contract for a booking from the active template.
 * When `notify` is true (the default — matching the backend) the customer is
 * emailed a "contract ready" message; pass `false` to generate silently (e.g.
 * for paper signing, where the operator hands over the contract in person).
 */
export function generateContract(bookingId: string, notify = true): Promise<Contract> {
  return request<Contract>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/contract${notify ? "" : "?notify=false"}`,
    { method: "POST" },
  ).then(normalizeContract);
}

/**
 * Mark a booking's latest generated AGREEMENT contract as Signed — for paper
 * signing, where the renter signs in person rather than through a digital
 * provider. When `notify` is true the customer is emailed a "contract signed"
 * confirmation; otherwise no email is sent. `signedAt` is the optional day the
 * paper contract was actually signed (ISO `yyyy-MM-dd`, stamped at UTC midnight);
 * omitted → today. Re-posting with a different `signedAt` corrects the recorded
 * date even when the contract is already signed. Returns the updated Contract
 * (same shape as generateContract). Throws ContractApiError (404) if no contract
 * has been generated for the booking yet, or (400) on an invalid `signedAt`.
 */
export function markContractSigned(
  bookingId: string,
  notify: boolean,
  signedAt?: string,
): Promise<Contract> {
  const signedAtParam = signedAt ? `&signedAt=${encodeURIComponent(signedAt)}` : "";
  return request<Contract>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/contract/mark-signed?notify=${notify}${signedAtParam}`,
    { method: "POST" },
  ).then(normalizeContract);
}

/** Fetch a single contract by id. */
export function getContract(id: string): Promise<Contract> {
  return request<Contract>(`/api/admin/contracts/${encodeURIComponent(id)}`).then(normalizeContract);
}

/**
 * Fetch a booking's latest agreement contract (same shape as generateContract),
 * or null when none has been generated yet (the backend answers 200 with a JSON
 * `null` body in that case). Lets a Manage panel restore the contract state after
 * a page refresh instead of forgetting it. The status is normalised to PascalCase
 * like the other contract calls.
 */
export function getBookingContract(bookingId: string): Promise<Contract | null> {
  return request<Contract | null>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/contract`,
  ).then((c) => (c ? normalizeContract(c) : null));
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
