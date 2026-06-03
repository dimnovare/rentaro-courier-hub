import { API_BASE } from "./api";
import type { IdentityStatus } from "./identityService";

/**
 * Customer self-service portal ("Manage your rental"). Access is via a signed
 * magic-link token emailed to the customer — there are no accounts. All calls
 * hit the token-gated .NET endpoints under `/api/portal/*`.
 */

/** The customer's booking + (once a bike is assigned) rental, for the portal card. */
export interface PortalRental {
  reference: string;
  customerFirstName: string;
  status: string;
  hasRental: boolean;
  cityName: string;
  modelName: string;
  planTerm: string;
  startDate?: string | null;
  plannedEndDate?: string | null;
  unitCode?: string | null;
  pickup?: string | null;
  /**
   * Where this booking sits in the (post-approval) payment flow:
   * - `paid` — the first 30-day period + deposit are settled
   * - `pending` / `pending_manual` — payment is due (online or arranged at pickup)
   * - `null` — not payable yet (e.g. not approved / no contract accepted)
   */
  paymentStatus?: "paid" | "pending" | "pending_manual" | null;
  /** The booking id, used to start a payment via `POST /api/payments/booking/{id}`. */
  bookingId?: string | null;
  /**
   * Identity verification status included by the backend in the portal rental
   * response. Used to determine the initial state of the IdentityCard.
   * - `none` — no attempt yet
   * - `pending` — a session was started but not yet resolved
   * - `verified` — identity confirmed
   * - `failed` — last attempt failed; customer should retry
   */
  identityStatus?: IdentityStatus | null;
  /** Full name as returned by the identity provider (present when identityStatus === "verified"). */
  identityVerifiedName?: string | null;
}

/** Acknowledgement returned by the portal write endpoints. */
export interface PortalAck {
  ok: boolean;
  message: string;
}

export type PortalResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "invalid" } // bad/expired token (401) — or no token at all
  | { kind: "no_api" } // API base not configured (preview)
  | { kind: "error" }; // network / unexpected failure

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/** Fetch the rental tied to a magic-link token. */
export async function getRental(token: string): Promise<PortalResult<PortalRental>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/rental?token=${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) throw new Error(`portal rental → ${res.status}`);
    return { kind: "ok", data: (await res.json()) as PortalRental };
  } catch (err) {
    console.error("[rentaro] portal getRental failed.", err);
    return { kind: "error" };
  }
}

/** A referral reward earned by or for this customer. */
export interface PortalReward {
  id: string;
  role: "referrer" | "referred";
  rewardType: string;
  daysAwarded?: number | null;
  monetaryAmount?: number | null;
  description?: string | null;
  status: "pending" | "applied" | "waived";
  appliedAt?: string | null;
  createdAt: string;
}

/** Fetch all referral rewards tied to the customer's portal token. */
export async function getRewards(token: string): Promise<PortalResult<PortalReward[]>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/rewards?token=${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) throw new Error(`portal rewards → ${res.status}`);
    return { kind: "ok", data: (await res.json()) as PortalReward[] };
  } catch (err) {
    console.error("[rentaro] portal getRewards failed.", err);
    return { kind: "error" };
  }
}

/** Raise a repair request against the customer's bike. */
export async function requestRepair(
  token: string,
  body: { issueType: string; description: string },
): Promise<PortalResult<PortalAck>> {
  return post(token, "/api/portal/repair", body);
}

/** Send a free-text support message to the rentaro team. */
export async function contactSupport(
  token: string,
  message: string,
): Promise<PortalResult<PortalAck>> {
  return post(token, "/api/portal/support", { message });
}

async function post<T>(
  token: string,
  path: string,
  body: unknown,
): Promise<PortalResult<T>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(`${API_BASE}${path}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return { kind: "ok", data: (await res.json()) as T };
  } catch (err) {
    console.error(`[rentaro] portal POST ${path} failed.`, err);
    return { kind: "error" };
  }
}
