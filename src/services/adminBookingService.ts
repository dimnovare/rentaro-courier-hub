/**
 * Admin booking-management API client. Calls the same-origin Next BFF proxy
 * (`/api/admin/*`), which attaches the admin JWT from an httpOnly cookie
 * server-side — so this client holds no token. An HTTP 401 surfaces as a typed
 * BookingApiError so the page can prompt for a fresh sign-in.
 *
 * Endpoints:
 *   GET   /api/admin/bookings                       (list — reused from the dashboard)
 *   PATCH /api/admin/bookings/{id}/status           (set status)
 *   POST  /api/admin/bookings/{id}/assign           (assign a bike unit → rental)
 *   GET   /api/admin/bookings/{id}/payment          (latest payment for a booking)
 *   POST  /api/admin/bookings/{id}/confirm-payment  (manually mark payment received)
 *   POST  /api/admin/bookings/{id}/revoke-payment   (revert a payment back to un-paid)
 *   GET   /api/admin/fleet                          (unit codes for the assign control)
 */
/* ── Contract types (must match the backend exactly) ───────────────────── */

export interface AdminBooking {
  id: string;
  createdAt: string;
  status: string;
  cityId: string;
  modelId: string;
  planId: string;
  accessoryIds: string[];
  preferredStartDate: string | null;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string | null;
  /** How the customer wants to be reached: "email" | "phone". */
  contactMethod: string;
  /** Chosen payment method: "cash" | "transfer" | null (unchosen). */
  paymentMethod: string | null;
  /** The customer's preferred language: "en" | "et" | "lv" | "fi" | "ru" | null. */
  locale: string | null;
  /** Referral code the customer entered, if any. */
  referralCode: string | null;
  heldBikeUnitCode: string | null;
  holdExpiresAt: string | null;
}

export interface AdminFleetUnit {
  internalCode: string;
  modelId: string;
  cityId: string;
  status: string;
}

interface AdminFleetResponse {
  models: unknown[];
  units: AdminFleetUnit[];
}

/** Created-rental summary returned by the assign endpoint. */
export interface AdminRentalSummary {
  id: string;
  bookingId: string | null;
  bikeUnitInternalCode: string;
  customerEmail: string;
  startDate: string;
  planId: string;
  monthlyPrice: number;
  depositAmount: number;
  status: string;
  createdAt: string;
}

/**
 * Latest payment for a booking. `status` is a lower-cased PaymentStatus, e.g.
 * "paid", "pending", "pending_manual", "failed". "pending_manual" means no money
 * was collected automatically and an admin must confirm receipt before a bike can
 * be assigned.
 */
export interface AdminPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  method: string;
  paidAt: string | null;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class BookingApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 (or a missing token) — the caller should re-auth. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BookingApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class BookingConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "BookingConfigError";
  }
}

/* ── Internals ─────────────────────────────────────────────────────────── */

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
    throw new BookingApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new BookingApiError("Your session has expired. Sign in again.", 401);
    // Surface a server-provided { error } message when present; the proxy flags
    // an unconfigured backend with { notConfigured: true }.
    let detail = "";
    let notConfigured = false;
    try {
      const data = (await res.json()) as { error?: string; notConfigured?: boolean };
      if (data?.notConfigured) notConfigured = true;
      if (data?.error) detail = ` — ${data.error}`;
    } catch {
      /* non-JSON body; ignore */
    }
    if (notConfigured) throw new BookingConfigError();
    throw new BookingApiError(`Request failed (${res.status})${detail}`, res.status);
  }

  // 204 / empty body tolerance.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

/** Lists all bookings (reuses the read-only dashboard endpoint). */
export function listBookings(): Promise<AdminBooking[]> {
  return request<AdminBooking[]>("/api/admin/bookings");
}

/** Fields for manually creating a booking (admin "New booking"). The catalogue
 *  ids must exist: cityId/modelId/planId are validated server-side. */
export interface CreateBookingInput {
  cityId: string;
  modelId: string;
  planId: string;
  customer: { firstName?: string; lastName?: string; email: string; phone?: string };
  preferredStartDate?: string;
  notes?: string;
}

/** Manually create a booking. When `notify` is true the customer is sent the
 *  standard confirmation email; otherwise it is created silently. Returns the
 *  new booking's id; callers reload the list to pick up the full row. */
export function createBooking(
  input: CreateBookingInput,
  notify: boolean,
): Promise<{ id: string }> {
  return request<{ id: string }>(`/api/admin/bookings${notify ? "?notify=true" : ""}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Returns the fleet's bike-unit internal codes, for the assign control. */
export async function listUnitCodes(): Promise<AdminFleetUnit[]> {
  const fleet = await request<AdminFleetResponse>("/api/admin/fleet");
  return fleet.units ?? [];
}

/** Sets a booking's status (e.g. "approved" / "rejected"). */
export function updateStatus(bookingId: string, status: string): Promise<AdminBooking> {
  return request<AdminBooking>(`/api/admin/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** Assigns a bike unit to a booking, creating an active rental. */
export function assignUnit(bookingId: string, bikeUnitInternalCode: string): Promise<AdminRentalSummary> {
  return request<AdminRentalSummary>(`/api/admin/bookings/${bookingId}/assign`, {
    method: "POST",
    body: JSON.stringify({ bikeUnitInternalCode }),
  });
}

/**
 * Returns the latest payment for a booking, or null when the booking has no
 * payment yet (the backend answers 200 with a JSON `null` body in that case).
 */
export function getPayment(bookingId: string): Promise<AdminPayment | null> {
  return request<AdminPayment | null>(`/api/admin/bookings/${bookingId}/payment`);
}

/** Manually marks a booking's latest payment as received (Paid). */
export function confirmPayment(bookingId: string): Promise<AdminPayment> {
  return request<AdminPayment>(`/api/admin/bookings/${bookingId}/confirm-payment`, {
    method: "POST",
  });
}

/** Reverts a booking's latest payment back to PendingManual (un-paid). */
export function revokePayment(bookingId: string): Promise<AdminPayment> {
  return request<AdminPayment>(`/api/admin/bookings/${bookingId}/revoke-payment`, {
    method: "POST",
  });
}

/**
 * Permanently deletes a booking and its dependent rows (contract, payments and
 * any rental), freeing the bike. Resolves on the backend's 204; throws a typed
 * BookingApiError on any non-ok response, like the other mutations.
 */
export function deleteBooking(bookingId: string): Promise<void> {
  return request<void>(`/api/admin/bookings/${bookingId}`, {
    method: "DELETE",
  });
}
