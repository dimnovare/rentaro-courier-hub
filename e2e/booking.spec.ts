import { test, expect, type Page } from "@playwright/test";

/**
 * Booking wizard UI smoke.
 *
 * Route: `/book` (App Router segment `src/app/[locale]/book/page.tsx`). The
 * default locale is `en` with `localePrefix: "as-needed"`, so the unprefixed
 * `/book` resolves to English — no locale segment needed.
 *
 * Wizard mechanics (from BookingWizard.tsx):
 *  - Single-select steps (City, Model, Plan) select AND auto-advance on one tap
 *    — there is no separate "Continue" on those steps.
 *  - Deep-link params `?city=&model=&plan=` pre-satisfy and DROP those steps,
 *    collapsing the flow straight to Details → Review.
 *  - Details requires first/last name, a valid email, phone, and a start date
 *    before "Continue" enables.
 *  - The Review step requires a consent checkbox before "Submit request"
 *    enables. The final submit hits the booking service / backend, so we stop
 *    at asserting Review renders (see the note on submission below).
 *
 * Real data ids used for deep-linking (src/data):
 *   city  = "tallinn"      (status "available")
 *   model = "engine-pro"   -> name "rentaro Engine Pro 2.0"
 *   plan  = "p365"         -> "12 months", €117 / 30 days, €3.90/day
 */

const FUTURE_DATE = "2030-06-15";

/** Fill the Details step's required fields. Assumes the Details step is shown. */
async function fillDetails(page: Page) {
  await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();

  // Inputs are wired to <label htmlFor>, so getByLabel resolves each field.
  await page.getByLabel("First name", { exact: true }).fill("Test");
  await page.getByLabel("Last name", { exact: true }).fill("Courier");
  await page.getByLabel("Email", { exact: true }).fill("test.courier@example.com");
  await page.getByLabel("Phone", { exact: true }).fill("+372 5555 1234");

  // The start date is a native <input type="date"> (id="start") nested inside a
  // styled button. getByLabel reaches the input; fill() sets the ISO value.
  await page.getByLabel("Preferred start date", { exact: true }).fill(FUTURE_DATE);
}

test.describe("booking wizard", () => {
  test("deep-link collapses to Details, then Review shows the selection + price", async ({
    page,
  }) => {
    // Pre-fill city/model/plan via query params so City/Model/Plan steps are
    // dropped and the wizard opens on Details.
    await page.goto("/book?city=tallinn&model=engine-pro&plan=p365");

    // Sanity: the running-selection chips reflect the deep-linked choices.
    await expect(page.getByText("Tallinn", { exact: true })).toBeVisible();
    await expect(page.getByText("rentaro Engine Pro 2.0")).toBeVisible();
    // Plan chip combines term + price, e.g. "12 months · €117 per 30 days".
    await expect(page.getByText(/12 months/i)).toBeVisible();

    await fillDetails(page);

    // "Continue" should enable once required details are valid.
    const cont = page.getByRole("button", { name: /^continue$/i });
    await expect(cont).toBeEnabled();
    await cont.click();

    // Review step.
    await expect(
      page.getByRole("heading", { name: /review & confirm/i }),
    ).toBeVisible();

    // The summary echoes the selection.
    await expect(page.getByText("rentaro Engine Pro 2.0")).toBeVisible();
    await expect(page.getByText(/12 months/i)).toBeVisible();
    await expect(page.getByText("Test Courier")).toBeVisible();
    await expect(page.getByText("test.courier@example.com")).toBeVisible();

    // Price: the 12-month plan is €117 / 30 days (appears as deposit + total).
    await expect(page.getByText(/€117/).first()).toBeVisible();

    // Submit is gated on the consent checkbox.
    const submit = page.getByRole("button", { name: /submit request/i });
    await expect(submit).toBeDisabled();
    await page.getByRole("checkbox").check();
    await expect(submit).toBeEnabled();

    // NOTE: clicking Submit calls submitBooking() (booking service / backend)
    // and on success navigates to /booking/success. That requires a live API,
    // so we stop here. To exercise the full happy path end-to-end, run against
    // an environment with the booking backend reachable and add:
    //   await submit.click();
    //   await expect(page).toHaveURL(/\/booking\/success/);
  });

  test("clicks through City -> Model -> Plan -> Details -> Review", async ({
    page,
  }) => {
    // No deep link: exercise the single-select steps' tap-to-advance behaviour.
    await page.goto("/book");

    // Step 1: City. Tapping an available city selects and auto-advances.
    await expect(page.getByRole("heading", { name: /where do you ride/i })).toBeVisible();
    // City options are buttons whose accessible name includes the city name;
    // "Tallinn" is available (not the "Coming soon" disabled option).
    await page.getByRole("button", { name: /tallinn/i }).click();

    // Step 2: Model. Pick the first model and auto-advance.
    await expect(page.getByRole("heading", { name: /pick your bike/i })).toBeVisible();
    await page.getByRole("button", { name: /rentaro Engine Pro 2\.0/i }).click();

    // Step 3: Plan. Choose the 12-month ("12 months") plan.
    await expect(page.getByRole("heading", { name: /choose a plan/i })).toBeVisible();
    await page.getByRole("button", { name: /12 months/i }).click();

    // Step 4: Details.
    await fillDetails(page);
    const cont = page.getByRole("button", { name: /^continue$/i });
    await expect(cont).toBeEnabled();
    await cont.click();

    // Step 5: Review renders with the selection and price.
    await expect(
      page.getByRole("heading", { name: /review & confirm/i }),
    ).toBeVisible();
    await expect(page.getByText("rentaro Engine Pro 2.0")).toBeVisible();
    await expect(page.getByText(/€117/).first()).toBeVisible();
  });
});
