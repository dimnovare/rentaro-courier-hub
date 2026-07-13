import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  API_BASE: "https://api.rentaro.ee",
}));

import { getFeedback } from "@/services/feedbackService";

describe("feedbackService credential handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the signed token in a header, never in the API URL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        rentalId: "rental-1",
        customerFirstName: "Roman",
        cityName: "Tallinn",
        modelName: "Engine Pro 2.0",
        locale: "en",
        submitted: false,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getFeedback("signed-secret-token")).resolves.toMatchObject({ kind: "ok" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("signed-secret-token");
    expect(String(url)).not.toContain("token=");
    expect(new Headers(init?.headers).get("X-Rentaro-Feedback-Token"))
      .toBe("signed-secret-token");
  });
});
