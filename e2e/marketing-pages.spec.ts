import { test, expect, type Page } from "@playwright/test";
import { MODEL_ID, MODEL_NAME } from "./helpers";

/**
 * Marketing / public-page smoke.
 *
 * Every public route must render its key heading + a primary conversion CTA,
 * with no console errors and no failed page load. Selectors lean on roles +
 * visible copy (never the dark/lime CSS classes), so a restyle won't break the
 * suite as long as the copy holds.
 *
 * Headings come from `next-intl` messages (messages/en.json) read by each
 * `src/app/[locale]/<route>/page.tsx` and the section components it renders:
 *   /models           -> modelsPage.heading              "All models."
 *   /models/engine-pro-> bikeModels[engine-pro].name     "rentaro Engine Pro 2.0"
 *   /pricing          -> pageHeaders.pricing.heading      + <Pricing> cards
 *   /accessories      -> pageHeaders.accessories.heading "Gear that earns shifts."
 *   /faq              -> pageHeaders.faq.heading         "Everything you need to know."
 *   /how-it-works     -> pageHeaders.howItWorks.heading  "Reserve, verify, accept, pay, ride."
 *   /cities/tallinn   -> cityContent.tallinn.headline    "Monthly e-bike rental in Tallinn."
 *   /delivery-…       -> seo.delivery.hero.heading        "An e-bike built for the job."
 *   /monthly-…        -> seo.monthly.hero.heading          "Rent the bike. Skip the price tag."
 *   /ebike-…couriers  -> seo.couriers.hero.heading         "Made for couriers, not weekend riders."
 *   /privacy /terms /rules -> data/legal/en titles via <Prose> <h1>
 *
 * The global Nav (src/components/layout/Nav.tsx) renders a primary "Reserve"
 * CTA button on every page (nav.reserve), so that's the universal conversion
 * affordance asserted on each route.
 */

/** No `console.error` / `pageerror` fired while loading the route. */
async function expectNoPageErrors(page: Page, path: string): Promise<void> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  const res = await page.goto(path);
  expect(res?.ok(), `${path} should respond 2xx`).toBeTruthy();
  // Let any deferred client logging flush before asserting.
  await page.waitForLoadState("networkidle");
  expect(errors, `${path} logged errors: ${errors.join(" | ")}`).toEqual([]);
}

/** The Nav's primary "Reserve" CTA — present on every public page. */
function navReserve(page: Page) {
  return page.getByRole("navigation").getByRole("button", { name: /^reserve$/i });
}

test.describe("marketing pages render heading + CTA, no errors", () => {
  // Data-driven: pages whose heading is the only page-specific assertion. The
  // universal Nav "Reserve" CTA covers the primary-conversion check for each.
  const pages: { path: string; heading: RegExp }[] = [
    { path: "/accessories", heading: /gear that earns shifts/i },
    { path: "/faq", heading: /everything you need to know/i },
    { path: "/how-it-works", heading: /reserve, verify, accept, pay, ride/i },
    { path: "/cities/tallinn", heading: /monthly e-bike rental in tallinn/i },
    { path: "/privacy", heading: /privacy policy/i },
    { path: "/terms", heading: /terms and conditions/i },
    { path: "/rules", heading: /rental rules/i },
  ];

  for (const { path, heading } of pages) {
    test(`${path} renders its heading + Reserve CTA`, async ({ page }) => {
      await expectNoPageErrors(page, path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expect(navReserve(page)).toBeVisible();
    });
  }

  test("/models lists model cards with Reserve + a details link", async ({ page }) => {
    await expectNoPageErrors(page, "/models");

    // Page heading "All models." (modelsPage.heading).
    await expect(page.getByRole("heading", { name: /^all models\.?$/i })).toBeVisible();

    // The seeded Engine Pro card carries a "Reserve" button and a title link
    // into its detail page (the card's "view details" affordance).
    const card = page.getByRole("article").filter({ hasText: MODEL_NAME }).first();
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /^reserve$/i })).toBeVisible();
    await expect(card.getByRole("link", { name: MODEL_NAME }).first()).toBeVisible();
  });

  test("/models/engine-pro detail shows name, spec table + reserve CTA", async ({ page }) => {
    await expectNoPageErrors(page, `/models/${MODEL_ID}`);

    // Leads with the model name as the H1.
    await expect(page.getByRole("heading", { level: 1, name: MODEL_NAME })).toBeVisible();

    // Full specification block — a labelled spec cell (e.g. "Motor", specTable.motor).
    await expect(page.getByText(/full specification/i)).toBeVisible();
    await expect(page.getByText(/^motor$/i).first()).toBeVisible();

    // In-page reserve CTA (ReserveButton) — label is plan-state dependent
    // ("Reserve this bike" when in stock / "Join the waitlist" when sold out).
    await expect(
      page.getByRole("button", { name: /reserve this bike|join the waitlist/i }),
    ).toBeVisible();
  });

  test("/pricing shows 3 plan cards with Choose CTAs", async ({ page }) => {
    await expectNoPageErrors(page, "/pricing");

    // Page header (pageHeaders.pricing.heading).
    await expect(
      page.getByRole("heading", { name: /one daily rate\. billed every 30 days/i }),
    ).toBeVisible();

    // <Pricing> renders three plan cards, each with a "Choose {term}" CTA.
    await expect(page.getByRole("button", { name: /choose 30 days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /choose 6 months/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /choose 12 months/i })).toBeVisible();
  });

  test("/accessories compares live packages without invented inclusion claims", async ({ page }) => {
    await expectNoPageErrors(page, "/accessories");

    await expect(page.getByRole("group", { name: /rental term/i })).toBeVisible();
    await expect(page.getByText("Bike Only")).toBeVisible();
    await expect(page.getByText("Courier Essentials")).toBeVisible();
    await expect(page.getByText("Courier Pro")).toBeVisible();
    await expect(page.getByText("Battery Only")).toBeVisible();
    await expect(page.getByText("Recommended")).toBeVisible();
    await expect(page.getByText(/only the charger is included/i)).toBeVisible();
    await expect(page.getByText(/most popular/i)).toHaveCount(0);

    await page.getByRole("button", { name: "30 days" }).click();
    await expect(page.getByText("€109")).toBeVisible();
  });

  // SEO landing pages: each leads with an <h1> hero and a reserve/book CTA in
  // the hero CTA row.
  const seoPages: { path: string; heading: RegExp; cta: RegExp }[] = [
    {
      path: "/delivery-ebike-rental",
      heading: /an e-bike built for the job/i,
      cta: /reserve a bike/i,
    },
    {
      path: "/monthly-ebike-rental",
      heading: /rent the bike\. skip the price tag/i,
      cta: /reserve a bike/i,
    },
    {
      path: "/ebike-rental-for-couriers",
      heading: /made for couriers, not weekend riders/i,
      cta: /start booking/i,
    },
  ];

  for (const { path, heading, cta } of seoPages) {
    test(`${path} renders its hero heading + hero CTA`, async ({ page }) => {
      await expectNoPageErrors(page, path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      // Hero CTA links to /book; presence confirms the conversion row rendered.
      await expect(page.getByRole("link", { name: cta }).first()).toBeVisible();
    });
  }
});
