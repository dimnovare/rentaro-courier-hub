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
 */
export type SubmitBookingInput = BookingRequest & {
  referralCode?: string;
  contactMethod?: "email" | "phone";
  paymentMethod?: "cash" | "transfer";
};

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
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Booking failed → ${res.status}`);
    return (await res.json()) as SubmitBookingResult;
  }

  // Mock: pretend the request was accepted.
  await new Promise((r) => setTimeout(r, 450));
  const id = `bk_${Math.random().toString(36).slice(2, 10)}`;
  return { id, status: "submitted", createdAt: new Date().toISOString() };
}
