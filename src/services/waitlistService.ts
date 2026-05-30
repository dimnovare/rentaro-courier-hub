import { API_BASE } from "./api";

/** A single waitlist signup — an email plus the context it was captured in. */
export interface WaitlistRequest {
  email: string;
  /** City the rider is interested in (e.g. "helsinki"), when known. */
  cityId?: string;
  /** Bike model the rider is waiting for, when the signup came from a model card. */
  modelId?: string;
  /** Where the signup originated, e.g. "city-helsinki" or "model-engine-pro". */
  source: string;
}

/** Backend acknowledgement of a waitlist signup. */
export interface WaitlistResult {
  ok: boolean;
}

/**
 * Submit a waitlist signup. With the API configured this POSTs to the .NET
 * backend; otherwise it simulates a successful capture (MVP mock) so the modal
 * flow keeps working without a backend.
 */
export async function submitWaitlist(req: WaitlistRequest): Promise<WaitlistResult> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Waitlist failed → ${res.status}`);
    return (await res.json()) as WaitlistResult;
  }

  // Mock: pretend the signup was accepted.
  await new Promise((r) => setTimeout(r, 450));
  return { ok: true };
}
