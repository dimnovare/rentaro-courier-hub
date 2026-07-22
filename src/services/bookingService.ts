import type { BookingRequest, BookingResult } from "@/types";
import { API_BASE } from "./api";

/**
 * Booking submission payload. Extends the shared {@link BookingRequest} with an
 * optional referral code captured from `?ref=` / the details step, plus the
 * contact + payment preferences captured on the review step. Kept local so the
 * shared type stays untouched; the backend accepts these as optional fields.
 *
 * - `contactMethod`: how rentaro should reach the customer ("email" | "phone").
 * - `paymentMethod`: preferred payment route ("cash" | "transfer"); optional.
 * - `fulfillment`: how the bike reaches the customer ("pickup" = free | "delivery"
 *   = paid). Defaults to "pickup" on the backend when absent. "delivery" adds the
 *   flat one-time delivery fee to the first payment.
 * - `locale`: the site language at booking time ("en"|"et"|"lv"|"fi"|"ru"); the
 *   backend uses it to pick the right-language contract template (ru→RU/EN,
 *   everything else→EE/EN).
 */
export type SubmitBookingInput = BookingRequest & {
  referralCode?: string;
  contactMethod?: "email" | "phone";
  paymentMethod?: "cash" | "transfer";
  fulfillment?: "pickup" | "delivery";
  locale?: string;
};

export class BookingApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "BookingApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Booking submission result. Extends the shared {@link BookingResult} with the
 * optional `portalToken` the backend now returns so the funnel can deep-link the
 * customer to their rental portal on the success page.
 */
export type SubmitBookingResult = BookingResult & { portalToken?: string };

/**
 * Submit a booking request. With the API configured this POSTs to the .NET
 * backend; otherwise it simulates a successful submission (MVP mock).
 */
export async function submitBooking(
  req: SubmitBookingInput,
): Promise<SubmitBookingResult> {
  if (API_BASE) {
    const currentPayload = { ...req };
    delete currentPayload.accessoryIds;
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPayload),
      });
    } catch {
      throw new BookingApiError(
        "Could not submit the booking. Check your connection and try again.",
        0,
        "network_error",
      );
    }
    if (!res.ok) throw await readBookingError(res);
    return (await res.json()) as SubmitBookingResult;
  }

  // Mock: pretend the request was accepted.
  await new Promise((r) => setTimeout(r, 450));
  const id = `bk_${Math.random().toString(36).slice(2, 10)}`;
  return { id, status: "submitted", createdAt: new Date().toISOString() };
}

async function readBookingError(response: Response): Promise<BookingApiError> {
  let code = `http_${response.status}`;
  let message = `Booking failed (${response.status}).`;
  try {
    const problem = (await response.json()) as {
      error?: string;
      code?: string;
      message?: string;
      title?: string;
    };
    code = problem.code ?? problem.error ?? code;
    message = problem.message ?? problem.title ?? problem.error ?? message;
  } catch {
    // Keep the stable fallback for non-JSON responses.
  }
  return new BookingApiError(message, response.status, code);
}
