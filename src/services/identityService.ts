import { API_BASE } from "./api";

/**
 * Customer-portal identity verification client. Access is via the signed
 * magic-link token — same as the rest of the portal. Calls hit the token-gated
 * `/api/portal/identity/*` endpoints.
 *
 * Supported providers: Smart-ID and Mobile-ID (Estonian/Latvian/Lithuanian
 * national digital signature infrastructure). The backend drives the provider
 * session; the frontend only relays the verification code and polls for result.
 */

export type IdentityMethod = "smart-id" | "mobile-id";

export type IdentityCountry = "EE" | "LV" | "LT";

/** The identity status returned as part of the portal rental response. */
export type IdentityStatus = "none" | "pending" | "verified" | "failed";

/** Request body for POST /api/portal/identity/start */
export interface StartIdentityPayload {
  method: IdentityMethod;
  personalCode: string;
  country: IdentityCountry;
  /** Required for Mobile-ID only. */
  phoneNumber?: string;
}

/** Response body from POST /api/portal/identity/start */
export interface IdentitySession {
  /** 4-digit code the customer must confirm in their Smart-ID / Mobile-ID app. */
  verificationCode: string;
  /** Opaque session ID used to poll for the result. */
  sessionId: string;
}

/** Possible outcome of a poll request. */
export type PollStatus = "pending" | "verified" | "failed" | "expired";

/** Response body from GET /api/portal/identity/poll/{sessionId} */
export interface PollResult {
  status: PollStatus;
  /** Full name from the identity provider — present when status === "verified". */
  verifiedName?: string | null;
  /** Human-readable failure reason — present when status === "failed". */
  reason?: string | null;
}

export type IdentityResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "invalid" } // bad/expired portal token (401)
  | { kind: "no_api" } // API_BASE not configured (preview)
  | { kind: "error"; reason?: string }; // network / unexpected failure

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/**
 * Start a new identity verification session. Returns a 4-digit verification
 * code the customer must confirm in their Smart-ID or Mobile-ID app, plus a
 * session ID for polling.
 */
export async function startIdentityVerification(
  token: string,
  payload: StartIdentityPayload,
): Promise<IdentityResult<IdentitySession>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/identity/start?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { kind: "error", reason: text || `HTTP ${res.status}` };
    }
    return { kind: "ok", data: (await res.json()) as IdentitySession };
  } catch (err) {
    console.error("[rentaro] identity startIdentityVerification failed.", err);
    return { kind: "error" };
  }
}

/**
 * Poll a running identity session for its current result. Call every ~2 s while
 * the status is "pending". When the status moves to "verified" or "failed"
 * (or "expired") stop polling.
 */
export async function pollIdentitySession(
  token: string,
  sessionId: string,
): Promise<IdentityResult<PollResult>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/identity/poll/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { kind: "error", reason: text || `HTTP ${res.status}` };
    }
    return { kind: "ok", data: (await res.json()) as PollResult };
  } catch (err) {
    console.error("[rentaro] identity pollIdentitySession failed.", err);
    return { kind: "error" };
  }
}
