import { afterEach, describe, expect, it, vi } from "vitest";
import { listRentalFeedback } from "@/services/adminFeedbackService";

describe("adminFeedbackService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads feedback through the same-origin authenticated admin proxy", async () => {
    const item = {
        id: "feedback-1",
        rentalId: "rental-1",
        bookingId: "booking-1",
        customerName: "Karl Klient",
        customerEmail: "karl@example.com",
        rating: 5,
        comment: "Reliable bike.",
        consentToPublish: true,
        locale: "et",
        cityId: "tallinn",
        cityName: "Tallinn",
        modelId: "engine-pro",
        modelName: "rentaro Engine Pro 2.0",
        submittedAt: "2026-07-10T10:00:00Z",
      };
    const payload = {
      items: [item],
      total: 201,
      averageRating: 4.4,
      publishable: 38,
      skip: 100,
      take: 50,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listRentalFeedback(100, 50)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/feedback?skip=100&take=50",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
  });
});
