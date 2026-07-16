export interface AdminRentalFeedback {
  id: string;
  rentalId: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  comment?: string | null;
  consentToPublish: boolean;
  locale: string;
  cityId: string;
  cityName: string;
  modelId: string;
  modelName: string;
  submittedAt: string;
}

export interface AdminRentalFeedbackPage {
  items: AdminRentalFeedback[];
  total: number;
  averageRating?: number | null;
  publishable: number;
  skip: number;
  take: number;
}

export class FeedbackApiError extends Error {
  readonly status: number;
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FeedbackApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured (mirrors the other
 *  admin service clients, so the page can show the "Not configured" panel). */
export class FeedbackConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "FeedbackConfigError";
  }
}

export async function listRentalFeedback(
  skip = 0,
  take = 100,
): Promise<AdminRentalFeedbackPage> {
  const skipN = Math.max(0, Math.trunc(skip));
  const takeN = Math.min(200, Math.max(1, Math.trunc(take)));
  let response: Response;
  try {
    response = await fetch(`/api/admin/feedback?skip=${skipN}&take=${takeN}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new FeedbackApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new FeedbackApiError("Your session has expired. Sign in again.", 401);
    }
    // Show ONLY the server-supplied detail message when present; otherwise a
    // friendly generic. The proxy flags an unconfigured backend with
    // { notConfigured: true }.
    let detail = "";
    try {
      const data = (await response.json()) as { error?: string; notConfigured?: boolean };
      if (data?.notConfigured) throw new FeedbackConfigError();
      if (data?.error) detail = data.error;
    } catch (err) {
      if (err instanceof FeedbackConfigError) throw err;
      /* non-JSON body — ignore. */
    }
    throw new FeedbackApiError(
      detail || `Something went wrong (${response.status}). Try again.`,
      response.status,
    );
  }

  return (await response.json()) as AdminRentalFeedbackPage;
}
