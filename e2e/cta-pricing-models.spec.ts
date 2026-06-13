import { test, expect } from "@playwright/test";
import { MODEL_ID, MODEL_NAME } from "./helpers";

/**
 * Conversion-CTA routing + interactive widgets.
 *
 * These guard that the marketing CTAs land on the right route with the right
 * deep-link params, and that the FAQ accordion expands/collapses. Selectors lean
 * on roles + visible copy (never the dark/lime CSS classes), so a restyle won't
 * break them as long as the copy holds.
 *
 * Routing comes from `useInteractions()` (src/components/providers/Interactions):
 *   reserve(planId)  -> /book?plan=<id>   (pricing "Choose {term}")
 *   reserve(modelId) -> /book?model=<id>  (model card "Reserve")
 *   reserve()        -> /book             (hero / final "Reserve a bike")
 *   goModels()       -> /models           (hero "Explore the fleet", "See the full fleet")
 * The model card "View details" is a plain <Link href="/models/<slug>">.
 *
 * The booking wizard drops any deep-linked single-select step and shows a
 * running-selection "chip" row. For ?plan=p365 the chip reads
 * "12 months · €117 per 30 days" (BookingWizard.tsx + pricing.terms / plan.per30).
 */

test.describe("pricing CTAs → /book?plan=", () => {
  // term label (pricing.terms) -> plan id (data/pricingPlans) + chip price.
  const plans = [
    { id: "p30", term: "30 days", price: "€177" },
    { id: "p180", term: "6 months", price: "€147" },
    { id: "p365", term: "12 months", price: "€117" },
  ] as const;

  for (const { id, term, price } of plans) {
    test(`"Choose ${term}" routes to /book?plan=${id} and the wizard reflects the plan`, async ({
      page,
    }) => {
      await page.goto("/");

      // The pricing card CTA reads "Choose {term}" (pricing.choose).
      await page
        .getByRole("button", { name: new RegExp(`choose ${term}`, "i") })
        .click();

      // URL carries the right plan deep-link param.
      await expect(page).toHaveURL(new RegExp(`/book\\?plan=${id}\\b`));

      // Only the Plan step is prefilled, so the wizard opens on its FIRST
      // not-prefilled step — the City step ("Where do you ride?").
      await expect(
        page.getByRole("heading", { name: /where do you ride/i }),
      ).toBeVisible();

      // The running-selection plan chip echoes the chosen term + per-30 price
      // ("{term} · €{monthly} per 30 days", BookingWizard.tsx).
      await expect(
        page.getByText(new RegExp(`${term}\\s·\\s${price} per 30 days`, "i")),
      ).toBeVisible();
    });
  }
});

test.describe("model card CTAs", () => {
  test('"Reserve" on a model card routes to /book?model=…', async ({ page }) => {
    await page.goto("/models");

    // Scope to the seeded Engine Pro card so the assertion is deterministic.
    const card = page.getByRole("article").filter({ hasText: MODEL_NAME }).first();
    await card.getByRole("button", { name: /^reserve$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/book\\?model=${MODEL_ID}\\b`));

    // Only the Model step is prefilled, so the wizard opens on its FIRST
    // not-prefilled step — the City step ("Where do you ride?").
    await expect(
      page.getByRole("heading", { name: /where do you ride/i }),
    ).toBeVisible();

    // The running-selection model chip echoes the chosen model name.
    await expect(page.getByText(MODEL_NAME).first()).toBeVisible();
  });

  test('"View details" on a model card routes to /models/<slug>', async ({ page }) => {
    await page.goto("/models");

    // The card image + title are <Link href="/models/<slug>"> with accessible
    // name = the model name. Follow it via the title link.
    const card = page.getByRole("article").filter({ hasText: MODEL_NAME }).first();
    await card.getByRole("link", { name: MODEL_NAME }).first().click();

    await expect(page).toHaveURL(new RegExp(`/models/${MODEL_ID}\\b`));
    // The detail page leads with the model name.
    await expect(
      page.getByRole("heading", { name: MODEL_NAME }).first(),
    ).toBeVisible();
  });
});

test.describe("homepage hero + fleet CTAs", () => {
  test('hero "Reserve a bike" → /book', async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /reserve a bike/i }).click();
    await expect(page).toHaveURL(/\/book(\?|$)/);
    await expect(
      page.getByRole("heading", { name: /where do you ride/i }),
    ).toBeVisible();
  });

  test('hero "Explore the fleet" → /models', async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /explore the fleet/i }).click();
    await expect(page).toHaveURL(/\/models(\?|$)/);
    await expect(page.getByRole("heading", { name: /^all models\.?$/i })).toBeVisible();
  });

  test('"See the full fleet" → /models', async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /see the full fleet/i }).click();
    await expect(page).toHaveURL(/\/models(\?|$)/);
    await expect(page.getByRole("heading", { name: /^all models\.?$/i })).toBeVisible();
  });
});

test.describe("FAQ accordion", () => {
  test("an item expands on click and collapses again", async ({ page }) => {
    await page.goto("/");

    // First FAQ item — "Can I use the bike for delivery work?" (faq.items.delivery.q).
    // No item is open by default (defaultOpenFaq = -1), so it starts collapsed.
    const q = page.getByRole("button", { name: /can i use the bike for delivery work/i });
    const answer = page.getByText(/built for city delivery shifts/i);

    await q.scrollIntoViewIfNeeded();
    await expect(q).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toBeHidden();

    // Click to expand: aria-expanded flips and the answer becomes visible.
    await q.click();
    await expect(q).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();

    // Click again to collapse: aria-expanded flips back and the answer hides.
    await q.click();
    await expect(q).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toBeHidden();
  });
});
