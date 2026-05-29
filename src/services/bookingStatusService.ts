import { API_BASE } from "./api";

/**
 * Public booking-status shape returned by the .NET API
 * (`GET /api/bookings/{id}/status`). Intentionally minimal and non-sensitive —
 * no customer email/phone/notes.
 */
export interface BookingStatus {
  reference: string;
  status: string;
  cityName: string;
  modelName: string;
  planTerm: string;
  preferredStartDate?: string | null;
  createdAt: string;
}

export type LookupResult =
  | { kind: "ok"; data: BookingStatus }
  | { kind: "not_found" }
  | { kind: "no_api" }
  | { kind: "error" };

/**
 * Look up a booking by its public reference id. With the API configured this
 * GETs the .NET backend; otherwise it reports `no_api` so the page can show a
 * "preview only" note (the MVP mock has no shared store to read from).
 */
export async function lookupBookingStatus(reference: string): Promise<LookupResult> {
  if (!API_BASE) return { kind: "no_api" };

  try {
    const res = await fetch(
      `${API_BASE}/api/bookings/${encodeURIComponent(reference.trim())}/status`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok) throw new Error(`Status lookup failed → ${res.status}`);
    return { kind: "ok", data: (await res.json()) as BookingStatus };
  } catch (err) {
    console.error(`[rentaro] booking status lookup failed for ${reference}.`, err);
    return { kind: "error" };
  }
}
