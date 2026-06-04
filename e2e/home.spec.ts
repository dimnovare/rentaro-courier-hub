import { test, expect } from "@playwright/test";

/**
 * Homepage smoke test.
 *
 * Guards that the marketing landing page renders its hero and the primary
 * conversion CTA. Selectors lean on roles + visible text (not the dark/lime
 * CSS classes), so a restyle won't break the test as long as the copy holds.
 */
test.describe("homepage", () => {
  test("renders the hero and the primary Reserve CTA", async ({ page }) => {
    await page.goto("/");

    // Brand: the document <title> carries "rentaro".
    await expect(page).toHaveTitle(/rentaro/i);

    // The hero H1 is split across three lines + an accent <span> in the markup
    // ("Delivery-ready" / "e-bikes by" / "the month."). Matching on a stable
    // fragment of the heading text avoids depending on the exact line breaks.
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Delivery-ready/i);
    await expect(heading).toContainText(/e-bikes/i);

    // Primary conversion CTA — "Reserve a bike" (hero.ctaReserve).
    const reserve = page.getByRole("button", { name: /reserve a bike/i });
    await expect(reserve).toBeVisible();

    // Secondary CTA exists too ("Explore the fleet"); presence is a useful
    // signal that the hero CTA row rendered fully.
    await expect(
      page.getByRole("button", { name: /explore the fleet/i }),
    ).toBeVisible();
  });
});
