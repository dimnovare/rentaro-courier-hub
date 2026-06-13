import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

/**
 * Waitlist capture + booking-status lookup.
 *
 * Both flows hit the REAL local backend (throwaway Postgres, wiped each run):
 *  - The waitlist modal POSTs to /api/waitlist (waitlistService → API_BASE set).
 *  - The status form GETs /api/bookings/{ref}/status (bookingStatusService).
 *
 * Waitlist trigger (CitiesView.tsx): each city card renders a CTA. A city with
 * status "soon" shows "Notify me" and opens the WaitlistModal instead of
 * routing to /book. From src/data/cities.ts, Helsinki is the "soon" city, so its
 * card is the trigger. The Cities section lives on the homepage under id="cities".
 *
 * Modal (WaitlistModal.tsx): role="dialog" aria-modal, heading "Join the
 * waitlist", an "Email" field, submit "Join waitlist", a "Close" button. On a
 * successful POST it swaps to a success body + a "Done" button. It traps Tab
 * focus and closes on Esc.
 *
 * Status lookup (BookingStatusLookup.tsx): heading "Check your reservation
 * status.", a "Booking reference" field, submit "Check status". An unknown
 * reference 404s → not_found → an alert "No booking found…".
 *
 * Selectors lean on roles + visible copy (labels from messages/en.json), never
 * on the dark/lime CSS classes.
 */

test.describe("waitlist modal", () => {
  test.beforeEach(async ({ page }) => {
    // The Cities section is rendered on the homepage.
    await page.goto("/");
    await page.locator("#cities").scrollIntoViewIfNeeded();
  });

  test("opens from Helsinki's 'Notify me' trigger and submits to success", async ({ page }) => {
    // Helsinki is the "soon" city, so its card CTA is "Notify me".
    await page.getByRole("button", { name: /notify me/i }).click();

    // The modal mounts as an accessible dialog.
    const dialog = page.getByRole("dialog", { name: /join the waitlist/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /join the waitlist/i })).toBeVisible();

    // Fill the single email field (unique per run to dodge the rate cap) and
    // submit. The submit button is gated on a valid email.
    await dialog.getByLabel("Email", { exact: true }).fill(uniqueEmail("waitlist"));
    const submit = dialog.getByRole("button", { name: /join waitlist/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Real POST to /api/waitlist → success state: body copy + a "Done" button.
    await expect(dialog.getByText(/you're on the list/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^done$/i })).toBeVisible();

    // Dismissing the success state closes the dialog.
    await dialog.getByRole("button", { name: /^done$/i }).click();
    await expect(page.getByRole("dialog", { name: /join the waitlist/i })).toHaveCount(0);
  });

  test("traps focus within the dialog and closes on Esc", async ({ page }) => {
    await page.getByRole("button", { name: /notify me/i }).click();
    const dialog = page.getByRole("dialog", { name: /join the waitlist/i });
    await expect(dialog).toBeVisible();

    // The email field is auto-focused on open.
    const email = dialog.getByLabel("Email", { exact: true });
    await expect(email).toBeFocused();

    // Tabbing repeatedly must keep focus inside the dialog (focus trap), never
    // escaping to the page chrome behind the backdrop.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      await expect(dialog.locator(":focus")).toHaveCount(1);
    }

    // Esc closes the modal.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /join the waitlist/i })).toHaveCount(0);
  });
});

test.describe("booking status lookup", () => {
  test("renders the lookup form on /booking/status", async ({ page }) => {
    await page.goto("/booking/status");

    await expect(
      page.getByRole("heading", { name: /check your reservation status/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Booking reference", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /check status/i })).toBeVisible();
  });

  test("an unknown reference shows the not-found state", async ({ page }) => {
    await page.goto("/booking/status");

    // A reference that cannot exist in the freshly-wiped backend → 404.
    await page
      .getByLabel("Booking reference", { exact: true })
      .fill("no-such-booking-reference-000000");
    await page.getByRole("button", { name: /check status/i }).click();

    // Real backend lookup → not_found → alert copy from bookingStatus.notFound.
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/no booking found for that reference/i)).toBeVisible();
  });
});
