import { API_BASE } from "./api";

export interface PortalFeedback {
  rentalId: string;
  customerFirstName: string;
  cityName: string;
  modelName: string;
  locale: string;
  submitted: boolean;
  rating?: number | null;
  comment?: string | null;
  consentToPublish?: boolean | null;
  submittedAt?: string | null;
}

export interface FeedbackSubmission {
  rating: number;
  comment: string;
  consentToPublish: boolean;
}

export type FeedbackResult =
  | { kind: "ok"; data: PortalFeedback }
  | { kind: "invalid" }
  | { kind: "unavailable" }
  | { kind: "no_api" }
  | { kind: "error" };

const TIMEOUT_MS = 12_000;

export async function getFeedback(token: string): Promise<FeedbackResult> {
  return request(token, { method: "GET" });
}

export async function submitFeedback(
  token: string,
  body: FeedbackSubmission,
): Promise<FeedbackResult> {
  return request(token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function request(token: string, init: RequestInit): Promise<FeedbackResult> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const response = await fetch(
      `${API_BASE}/api/portal/feedback`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          "X-Rentaro-Feedback-Token": token,
          ...(init.headers ?? {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (response.status === 401) return { kind: "invalid" };
    if (response.status === 409) return { kind: "unavailable" };
    if (!response.ok) return { kind: "error" };
    return { kind: "ok", data: (await response.json()) as PortalFeedback };
  } catch (error) {
    // Never log the request URL: it contains the signed customer token.
    console.error("[rentaro] feedback request failed.", error);
    return { kind: "error" };
  }
}
