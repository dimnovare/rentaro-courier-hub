import type { BookingRequest, BookingResult } from "@/types";
import { API_BASE } from "./api";

/**
 * Submit a booking request. With the API configured this POSTs to the .NET
 * backend; otherwise it simulates a successful submission (MVP mock).
 */
export async function submitBooking(req: BookingRequest): Promise<BookingResult> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Booking failed → ${res.status}`);
    return (await res.json()) as BookingResult;
  }

  // Mock: pretend the request was accepted.
  await new Promise((r) => setTimeout(r, 450));
  const id = `bk_${Math.random().toString(36).slice(2, 10)}`;
  return { id, status: "submitted", createdAt: new Date().toISOString() };
}
