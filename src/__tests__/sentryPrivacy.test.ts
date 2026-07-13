import { redactSentryTokens } from "@/lib/sentryPrivacy";

describe("redactSentryTokens", () => {
  it("removes feedback tokens from nested telemetry strings", () => {
    const event = {
      request: {
        url: "https://rentaro.ee/feedback?token=secret-value&source=email",
      },
      breadcrumbs: [
        {
          category: "fetch",
          data: {
            url: "https://api.rentaro.ee/api/portal/feedback?token=secret-value",
          },
        },
      ],
      spans: [
        {
          description: "GET /feedback?token=secret-value",
        },
      ],
      browser: {
        location: "https://rentaro.ee/feedback#token=fragment-secret",
      },
      headers: {
        "X-Rentaro-Feedback-Token": "header-secret",
      },
      untouched: "ordinary diagnostic text",
    };

    const redacted = redactSentryTokens(event);
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("secret-value");
    expect(serialized).not.toContain("fragment-secret");
    expect(serialized).not.toContain("header-secret");
    expect(serialized).toContain("token=%5BFiltered%5D");
    expect(serialized).toContain("#token=%5BFiltered%5D");
    expect(redacted.headers["X-Rentaro-Feedback-Token"]).toBe("[Filtered]");
    expect(serialized).toContain("source=email");
    expect(redacted.untouched).toBe("ordinary diagnostic text");
  });
});
