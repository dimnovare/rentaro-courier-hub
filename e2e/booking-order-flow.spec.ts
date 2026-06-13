import { test, expect, type Page } from "@playwright/test";
import {
  fillBookingDetails,
  uniqueEmail,
  CITY,
  MODEL_ID,
  MODEL_NAME,
  PLAN,
  PLAN_TERM,
  PLAN_PRICE,
} from "./helpers";

/**
 * FULL booking order flow, end-to-end against the REAL local backend.
 *
 * Backend: throwaway Postgres (e2e/start-api.mjs), seeded with the catalogue on
 * boot and wiped each run, so every Submit actually POSTs to /api/bookings and
 * persists a row. Each submit uses uniqueEmail() so reruns don't trip the
 * per-email rate cap.
 *
 * Wizard mechanics (BookingWizard.tsx):
 *  - Single-select steps (City, Model, Plan) select AND auto-advance on one tap
 *    — no separate "Continue".
 *  - Deep-link `?city=&model=&plan=` pre-satisfies and DROPS those steps,
 *    collapsing straight to Details → Review.
 *  - Details "Continue" enables only once first/last/valid-email/phone/start are
 *    filled. Tapping it while invalid runs markAllTouched(), surfacing every
 *    field error at once.
 *  - Review gates "Submit request" behind the consent checkbox; on a successful
 *    submit the wizard router.push("/booking/success").
 *  - The success page (success namespace) shows "Request received, {name}." and
 *    a "Reference" row carrying the booking id.
 *
 * Seeded ids (helpers.ts): city=tallinn, model=engine-pro
 * (name "rentaro Engine Pro 2.0"), plan=p365 ("12 months", €117 / 30 days).
 *
 * Note: showAddGear defaults to FALSE in the seeded backend, so the add-gear
 * toggle / "Add-ons" review row may be absent — test 6 probes for it and only
 * exercises the accessory toggle when present, but always asserts the
 * contact/payment segmented toggles (which always render on Review).
 */

const DEEP_LINK = `/book?city=${CITY}&model=${MODEL_ID}&plan=${PLAN}`;

/** Advance through City → Model → Plan by tapping the auto-advancing options. */
async function pickCityModelPlan(page: Page): Promise<void> {
  // Step: City. Tapping an available city selects and auto-advances.
  await expect(page.getByRole("heading", { name: /where do you ride/i })).toBeVisible();
  await page.getByRole("button", { name: /tallinn/i }).click();

  // Step: Model. Pick engine-pro and auto-advance.
  await expect(page.getByRole("heading", { name: /pick your bike/i })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(MODEL_NAME.replace(/\./g, "\\."), "i") }).click();

  // Step: Plan. Choose the 12-month plan and auto-advance.
  await expect(page.getByRole("heading", { name: /choose a plan/i })).toBeVisible();
  await page.getByRole("button", { name: PLAN_TERM }).click();
}

/** Tick consent, submit, and wait for the success page to render. */
async function consentSubmitAndExpectSuccess(page: Page, firstName: string): Promise<void> {
  const submit = page.getByRole("button", { name: /submit request/i });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(submit).toBeEnabled();
  await submit.click();

  // Real backend round-trip → navigation to /booking/success.
  await expect(page).toHaveURL(/\/booking\/success/);

  // Success heading carries the rider's first name (success.headingNamed) and a
  // "Reference" row carrying the persisted booking id.
  await expect(
    page.getByRole("heading", { name: new RegExp(`request received,\\s*${firstName}`, "i") }),
  ).toBeVisible();
  await expect(page.getByText(/^reference$/i)).toBeVisible();
}

test.describe("booking order flow (real backend)", () => {
  test("happy path: deep-link → details → review → submit → success", async ({ page }) => {
    await page.goto(DEEP_LINK);

    // Deep link pre-satisfies City/Model/Plan, so the wizard opens on Details.
    // The running-selection chips echo the deep-linked choices.
    await expect(page.getByText("Tallinn").first()).toBeVisible();
    await expect(page.getByText(MODEL_NAME).first()).toBeVisible();
    await expect(page.getByText(PLAN_TERM).first()).toBeVisible();

    const email = uniqueEmail("order");
    await fillBookingDetails(page, { first: "Deeplink", email });

    const cont = page.getByRole("button", { name: /^continue$/i });
    await expect(cont).toBeEnabled();
    await cont.click();

    // Review echoes the selection + price.
    await expect(page.getByRole("heading", { name: /review & confirm/i })).toBeVisible();
    await expect(page.getByText(MODEL_NAME).first()).toBeVisible();
    await expect(page.getByText(PLAN_TERM).first()).toBeVisible();
    await expect(page.getByText("Deeplink Courier")).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText(new RegExp(PLAN_PRICE)).first()).toBeVisible();

    await consentSubmitAndExpectSuccess(page, "Deeplink");
  });

  test("click-through: City → Model → Plan → Details → Review → submit → success", async ({
    page,
  }) => {
    await page.goto("/book");

    await pickCityModelPlan(page);

    const email = uniqueEmail("clickthrough");
    await fillBookingDetails(page, { first: "Clickthrough", email });

    const cont = page.getByRole("button", { name: /^continue$/i });
    await expect(cont).toBeEnabled();
    await cont.click();

    // Review renders with the selection and price.
    await expect(page.getByRole("heading", { name: /review & confirm/i })).toBeVisible();
    await expect(page.getByText(MODEL_NAME).first()).toBeVisible();
    await expect(page.getByText(new RegExp(PLAN_PRICE)).first()).toBeVisible();

    await consentSubmitAndExpectSuccess(page, "Clickthrough");
  });

  test("validation: invalid Details won't advance and tapping Continue reveals every field error", async ({
    page,
  }) => {
    await page.goto(DEEP_LINK);

    // On the (now-first) Details step the required-field errors haven't surfaced
    // yet (each field-err <p role="alert"> renders only once touched /
    // markAllTouched runs). Assert that behaviour directly rather than a brittle
    // global alert baseline: the specific first-name / email field errors are
    // absent before any interaction.
    await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
    const cont = page.getByRole("button", { name: /^continue$/i });
    await expect(page.getByText(/enter your first name/i)).toHaveCount(0);
    await expect(page.getByText(/enter your email/i)).toHaveCount(0);

    // The Details Continue is gated as a no-op (opacity 0.5, onClick→markAllTouched)
    // rather than the [disabled] attribute, so it stays clickable: a click while
    // invalid surfaces every error and does NOT advance to Review. The
    // "complete the required fields" hint sits next to it.
    await expect(page.getByText(/complete the required fields/i)).toBeVisible();
    await cont.click();

    // markAllTouched → all five required fields now show their error alerts…
    await expect(page.getByText(/enter your first name/i)).toBeVisible();
    await expect(page.getByText(/enter your last name/i)).toBeVisible();
    await expect(page.getByText(/enter your email/i)).toBeVisible();
    await expect(page.getByText(/enter your phone number/i)).toBeVisible();
    await expect(page.getByText(/choose a preferred start date/i)).toBeVisible();
    // …and the wizard stayed on Details (no advance to Review).
    await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /review & confirm/i })).toHaveCount(0);

    // An invalid email format surfaces the dedicated "valid email" message.
    await page.getByLabel("Email", { exact: true }).fill("not-an-email");
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();

    // Filling everything correctly clears the field errors and lets Continue advance.
    await fillBookingDetails(page, { email: uniqueEmail("valid") });
    await expect(page.getByText(/enter your first name/i)).toHaveCount(0);
    await expect(page.getByText(/enter a valid email address/i)).toHaveCount(0);
    await expect(page.getByText(/choose a preferred start date/i)).toHaveCount(0);
    await expect(cont).toBeEnabled();
    await cont.click();
    await expect(page.getByRole("heading", { name: /review & confirm/i })).toBeVisible();
  });

  test("back navigation re-shows the prior step", async ({ page }) => {
    await page.goto("/book");

    await pickCityModelPlan(page);

    // On Details now. Back returns to the Plan step.
    await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(page.getByRole("heading", { name: /choose a plan/i })).toBeVisible();

    // Back again returns to the Model step.
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(page.getByRole("heading", { name: /pick your bike/i })).toBeVisible();

    // Re-pick the model to advance forward again and confirm the flow resumes.
    await page.getByRole("button", { name: new RegExp(MODEL_NAME.replace(/\./g, "\\."), "i") }).click();
    await expect(page.getByRole("heading", { name: /choose a plan/i })).toBeVisible();
  });

  test("model-info modal: opens from the info button, traps focus, closes on Esc", async ({
    page,
  }) => {
    await page.goto("/book");

    // /book opens on the City step; pick a city to advance to the Model step,
    // where each option carries an adjacent "View details" info button.
    await expect(page.getByRole("heading", { name: /where do you ride/i })).toBeVisible();
    await page.getByRole("button", { name: /tallinn/i }).click();

    await expect(page.getByRole("heading", { name: /pick your bike/i })).toBeVisible();
    const infoButtons = page.getByRole("button", { name: /view details/i });
    await expect(infoButtons.first()).toBeVisible();
    await infoButtons.first().click();

    // The popup mounts as an accessible dialog (aria-modal) labelled by the model
    // name (aria-label={infoModel.name}); engine-pro sorts first, so the first
    // info button opens its modal.
    const dialog = page.getByRole("dialog", { name: new RegExp(MODEL_NAME.replace(/\./g, "\\."), "i") });
    await expect(dialog).toBeVisible();

    // Focus trap: tabbing repeatedly keeps focus inside the dialog.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      await expect(dialog.locator(":focus")).toHaveCount(1);
    }

    // Esc closes the popup without changing the selection (still on Model step).
    // Use keyboard dismissal: the modal's × button and the backdrop overlap the
    // sticky header (the nav's locale <select> intercepts pointer events at that
    // coordinate), so a pointer close is layout-fragile — Esc is unambiguous.
    // Scope to the model dialog by name: the cookie-consent banner is ALSO a
    // role="dialog", so an unscoped getByRole("dialog") would keep matching it.
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /pick your bike/i })).toBeVisible();
  });

  test("review toggles: contact + payment (and accessory when enabled) reflect in state", async ({
    page,
  }) => {
    await page.goto(DEEP_LINK);

    // If the add-gear feature is enabled, exercise the accessory toggle on the
    // Details step before continuing (it defaults to hidden in the seed).
    await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
    const addGear = page.getByRole("button", { name: /add gear/i });
    const addGearOn = (await addGear.count()) > 0;
    if (addGearOn) {
      await addGear.click();
      // First accessory option in the expanded grid is a toggle button.
      const firstAcc = page.locator("#addons-grid").getByRole("button").first();
      await firstAcc.click();
      // The toggle count badge appears once an accessory is selected.
      await expect(page.locator(".addons-count")).toHaveText("1");
    }

    await fillBookingDetails(page, { email: uniqueEmail("toggles") });
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("heading", { name: /review & confirm/i })).toBeVisible();

    // Contact preference defaults to Email (aria-pressed). Switching to Phone
    // flips the pressed state.
    const emailBtn = page.getByRole("button", { name: /^email$/i });
    const phoneBtn = page.getByRole("button", { name: /^phone$/i });
    await expect(emailBtn).toHaveAttribute("aria-pressed", "true");
    await expect(phoneBtn).toHaveAttribute("aria-pressed", "false");
    await phoneBtn.click();
    await expect(phoneBtn).toHaveAttribute("aria-pressed", "true");
    await expect(emailBtn).toHaveAttribute("aria-pressed", "false");

    // Payment defaults to Cash at pickup. Switching to Bank transfer flips the
    // pressed state and reveals the transfer note.
    const cashBtn = page.getByRole("button", { name: /cash at pickup/i });
    const transferBtn = page.getByRole("button", { name: /bank transfer/i });
    await expect(cashBtn).toHaveAttribute("aria-pressed", "true");
    await expect(transferBtn).toHaveAttribute("aria-pressed", "false");
    await transferBtn.click();
    await expect(transferBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/send our bank details/i)).toBeVisible();

    // When add-gear was exercised, the selected accessory shows in the review
    // "Add-ons" summary row (no longer "None").
    if (addGearOn) {
      const addonsRow = page.locator(".summary-row", { hasText: /add-ons/i });
      await expect(addonsRow).toBeVisible();
      await expect(addonsRow.getByText(/^none$/i)).toHaveCount(0);
    }
  });
});
