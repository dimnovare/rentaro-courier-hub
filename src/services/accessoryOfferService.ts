import { API_BASE } from "./api";
import type { AccessoryOfferQuery, AccessoryOfferQuote } from "@/types/accessoryOffer";

const OFFER_TIMEOUT_MS = 12_000;

export class AccessoryOfferApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AccessoryOfferApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Fetch current package prices and city stock. There is intentionally no local
 * commerce fallback: callers must show a retry state if the live quote is unavailable.
 */
export async function getAccessoryOffers(
  query: AccessoryOfferQuery,
): Promise<AccessoryOfferQuote[]> {
  if (!API_BASE) {
    throw new AccessoryOfferApiError(
      "Live accessory offers are not configured.",
      0,
      "api_not_configured",
    );
  }

  const params = new URLSearchParams({
    planId: query.planId,
    cityId: query.cityId,
    locale: query.locale,
  });

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE}/api/public/accessory-offers?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(OFFER_TIMEOUT_MS),
      },
    );
  } catch {
    throw new AccessoryOfferApiError(
      "Could not load accessory offers. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  if (!response.ok) {
    throw await readOfferError(response);
  }
  return (await response.json()) as AccessoryOfferQuote[];
}

async function readOfferError(response: Response): Promise<AccessoryOfferApiError> {
  let code = `http_${response.status}`;
  let message = `Could not load accessory offers (${response.status}).`;
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
    // Keep the stable fallback code and message for non-JSON failures.
  }
  return new AccessoryOfferApiError(message, response.status, code);
}
