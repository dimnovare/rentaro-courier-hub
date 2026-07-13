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
    throw new FeedbackApiError(`Could not load feedback (${response.status}).`, response.status);
  }

  return (await response.json()) as AdminRentalFeedbackPage;
}
