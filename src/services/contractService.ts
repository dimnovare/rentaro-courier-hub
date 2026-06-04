import { API_BASE } from "./api";

/**
 * Customer-portal contract client. Like the rest of the portal (portalService),
 * access is via the signed magic-link token from the confirmation email — there
 * are no accounts. All calls hit the token-gated `/api/portal/contract*`
 * endpoints.
 *
 * The "no contract yet" case is first-class: the backend returns 404 before a
 * contract has been generated, and we surface that as a distinct result so the
 * card can simply hide itself rather than show an error.
 */

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

/** The contract view returned to the customer portal. */
export interface PortalContract {
  id: string;
  status: ContractStatus;
  signerName: string | null;
  signingUrl: string | null;
  hasGeneratedPdf: boolean;
  hasSignedPdf: boolean;
  createdAt: string;
  signedAt: string | null;
  /** False when no e-signature provider is wired up yet (signing disabled). */
  providerConfigured: boolean;
}

/** Result of asking the backend to start signing. */
export interface SignStart {
  signingUrl: string | null;
  status: ContractStatus;
}

export type ContractResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "none" } // 404 — no contract has been generated yet
  | { kind: "not_configured" } // 503 — signing provider not set up
  | { kind: "invalid" } // bad/expired token (401) — or no token at all
  | { kind: "no_api" } // API base not configured (preview)
  | { kind: "error" }; // network / unexpected failure

/** Which rendition of the contract PDF to fetch. */
export type ContractDocumentKind = "generated" | "signed";

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/** Normalise a contract status from the lowercase API serialisation to the PascalCase
 *  values the TypeScript type and i18n keys expect (e.g. "generated" → "Generated"). */
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
function normalizeStatus(raw: string): ContractStatus {
  return STATUS_MAP[raw?.toLowerCase()] ?? (raw as ContractStatus);
}

/** Fetch the contract tied to a magic-link token. 404 → { kind: "none" }. */
export async function getContract(token: string): Promise<ContractResult<PortalContract>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/contract?token=${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (res.status === 404) return { kind: "none" };
    if (!res.ok) throw new Error(`portal contract → ${res.status}`);
    const raw = await res.json();
    return { kind: "ok", data: { ...raw, status: normalizeStatus(raw.status) } as PortalContract };
  } catch (err) {
    console.error("[rentaro] portal getContract failed.", err);
    return { kind: "error" };
  }
}

/**
 * Ask the backend to start the signing flow, returning the provider signing URL
 * the customer should be sent to. HTTP 503 → { kind: "not_configured" } when no
 * signing provider is wired up.
 */
export async function startSigning(token: string): Promise<ContractResult<SignStart>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/contract/sign?token=${encodeURIComponent(token)}`,
      { method: "POST", headers: JSON_HEADERS, cache: "no-store" },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (res.status === 404) return { kind: "none" };
    if (res.status === 503) return { kind: "not_configured" };
    if (!res.ok) throw new Error(`portal contract sign → ${res.status}`);
    const raw = await res.json();
    return { kind: "ok", data: { ...raw, status: normalizeStatus(raw.status) } as SignStart };
  } catch (err) {
    console.error("[rentaro] portal startSigning failed.", err);
    return { kind: "error" };
  }
}

/**
 * Build the URL for a contract PDF. The portal document endpoint authenticates
 * via the `token` query param, so this URL is safe to use directly as an <a>
 * href / window.open target (no Authorization header needed).
 */
export function contractDocumentUrl(
  token: string,
  kind: ContractDocumentKind,
): string {
  return `${API_BASE}/api/portal/contract/document?token=${encodeURIComponent(
    token,
  )}&kind=${kind}`;
}
