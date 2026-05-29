import { API_BASE } from "./api";

/** Result of asking the backend to start a payment for a booking. */
export interface CreatePaymentResult {
  /** Montonio hosted checkout URL to redirect to, or null when payment is skipped. */
  checkoutUrl: string | null;
  /** True when the backend skipped payment (no Montonio keys configured). */
  skipped: boolean;
}

/** Latest payment status for a booking. */
export interface PaymentStatus {
  id: string;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl: string | null;
  paidAt: string | null;
}

/**
 * Start a payment for a booking. With the API configured this POSTs to the .NET
 * backend, which either returns a Montonio `checkoutUrl` (redirect the customer)
 * or `skipped: true` when Montonio keys are absent. With no API configured we
 * simulate the skipped path so the booking flow keeps working.
 */
export async function createBookingPayment(
  bookingId: string,
  method: string = "card",
): Promise<CreatePaymentResult> {
  if (!API_BASE) {
    return { checkoutUrl: null, skipped: true };
  }

  const res = await fetch(`${API_BASE}/api/payments/booking/${bookingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method }),
  });
  if (!res.ok) throw new Error(`Payment start failed → ${res.status}`);
  return (await res.json()) as CreatePaymentResult;
}

/** Fetch the latest payment status for a booking (null when none / not configured). */
export async function getBookingPayment(bookingId: string): Promise<PaymentStatus | null> {
  if (!API_BASE) return null;

  const res = await fetch(`${API_BASE}/api/payments/booking/${bookingId}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Payment status failed → ${res.status}`);
  return (await res.json()) as PaymentStatus;
}
