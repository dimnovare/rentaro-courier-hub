import { test, expect, type Page } from "@playwright/test";
import {
  adminLogin,
  adminGoto,
  uniqueEmail,
  ADMIN_USER,
  MODEL_ID,
  MODEL_NAME,
} from "./helpers";

/**
 * Authenticated admin-console e2e against the REAL local backend.
 *
 * The throwaway Postgres is wiped + re-seeded with the catalogue (models,
 * cities, plans) on every API boot, but the FLEET is NOT seeded (see the
 * `chore(seed): stop seeding demo fleet` commit). So every test that needs a
 * bike unit / rental creates its own fixtures through the UI — the form submits
 * actually hit the API and persist. Each test is independent and uses a unique
 * internal code / email so reruns and parallel workers never collide.
 *
 * Seeded catalogue ids (from helpers): CITY="tallinn", MODEL_ID="engine-pro"
 * (name "rentaro Engine Pro 2.0"). The New-unit and New-booking drawers default
 * their selects to the first option; we still pick MODEL_NAME / Tallinn by their
 * visible labels so the unit lines up with a booking on the same model + city.
 *
 * Selectors lean on roles + visible text / getByLabel (the drawers wire every
 * field with aria-label), never on the dark/lime CSS classes.
 */

/** A short unique suffix for fixture identifiers (codes etc.). */
function uniqueSuffix(): string {
  return String(Math.floor(performance.now() * 1000) % 1_000_000);
}

/** Create a bike unit via Fleet → "+ New unit"; returns its internal code. */
async function createUnit(
  page: Page,
  opts: { model?: string; city?: string } = {},
): Promise<string> {
  const code = `E2E-${uniqueSuffix()}`;
  await adminGoto(page, "Fleet");
  await page.getByRole("button", { name: /\+ new unit/i }).click();

  const drawer = page.getByRole("dialog", { name: /new bike unit/i });
  await expect(drawer).toBeVisible();

  await drawer.getByLabel("Internal code", { exact: true }).fill(code);
  await drawer.getByLabel("Model", { exact: true }).selectOption({ label: opts.model ?? MODEL_NAME });
  await drawer.getByLabel("City", { exact: true }).selectOption({ label: opts.city ?? "Tallinn" });

  await drawer.getByRole("button", { name: /create unit/i }).click();
  await expect(drawer).toBeHidden();

  // The new unit lands in the Units table.
  await expect(page.getByRole("cell", { name: code, exact: true })).toBeVisible();
  return code;
}

/** Create a booking via Bookings → "+ New booking"; returns its email. */
async function createBooking(
  page: Page,
  opts: { model?: string; city?: string; email?: string } = {},
): Promise<string> {
  const email = opts.email ?? uniqueEmail("admin");
  // The bookings table renders the customer NAME (not the email) in its own
  // column, so make the last name unique per run and key the row on it. The
  // email is rendered as a muted sub-line, but the name is the stable signal.
  const lastName = `Courier-${uniqueSuffix()}`;
  await adminGoto(page, "Bookings");
  await page.getByRole("button", { name: /\+ new booking/i }).click();

  const drawer = page.getByRole("dialog", { name: /new booking/i });
  await expect(drawer).toBeVisible();

  await drawer.getByLabel("City", { exact: true }).selectOption({ label: opts.city ?? "Tallinn" });
  await drawer.getByLabel("Model", { exact: true }).selectOption({ label: opts.model ?? MODEL_NAME });
  // Plan select labels are "<term> · €<monthly>/30d"; the first option is fine.
  await drawer.getByLabel("First name", { exact: true }).fill("Test");
  await drawer.getByLabel("Last name", { exact: true }).fill(lastName);
  await drawer.getByLabel("Email", { exact: true }).fill(email);

  await drawer.getByRole("button", { name: /create booking/i }).click();
  await expect(drawer).toBeHidden();

  // The new booking lands in the Bookings table. The Customer column shows the
  // name; assert on the unique last name (what the table actually renders).
  await expect(page.getByRole("cell", { name: lastName }).first()).toBeVisible();
  return email;
}

/** The bookings table row for a given customer email (rendered as a sub-line). */
function bookingRow(page: Page, email: string) {
  return page.getByRole("row").filter({ hasText: email });
}

test.describe("admin console", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("login shows the dashboard with metrics + navigation", async ({ page }) => {
    // adminLogin already asserted the topbar Refresh appeared. Confirm the
    // dashboard content: greeting, the metric cards, and the sidebar nav.
    await expect(page.getByRole("heading", { name: /, operator/i })).toBeVisible();

    // Metric cards (MetricsCards) — labels are stable.
    await expect(page.getByText("MRR estimate")).toBeVisible();
    await expect(page.getByText("Active rentals")).toBeVisible();
    await expect(page.getByText("Bikes available")).toBeVisible();

    // Sidebar navigation links exist. ("Fleet" also appears as a dashboard
    // quick-action link, so allow more than one match and assert the first.)
    await expect(page.getByRole("link", { name: /^Bookings$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Fleet$/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Maintenance$/ }).first()).toBeVisible();
  });

  test("the sidebar navigates to each section and renders its content", async ({ page }) => {
    // Section pages don't all render an <h1> equal to the nav label (the topbar
    // echoes the label, but each page's own UI uses its own headings/controls).
    // So per section we assert the URL landed on the right route AND a control
    // that section actually renders — a stable, section-specific signal.
    await adminGoto(page, "Bookings");
    await expect(page).toHaveURL(/\/admin\/bookings$/);
    await expect(page.getByRole("button", { name: /\+ new booking/i })).toBeVisible();

    await adminGoto(page, "Rentals");
    await expect(page).toHaveURL(/\/admin\/rentals$/);
    await expect(page.getByRole("heading", { name: /^Rentals$/ }).first()).toBeVisible();

    await adminGoto(page, "Maintenance");
    await expect(page).toHaveURL(/\/admin\/maintenance$/);
    await expect(page.getByRole("button", { name: /\+ new ticket/i })).toBeVisible();

    await adminGoto(page, "Models");
    await expect(page).toHaveURL(/\/admin\/models$/);
    await expect(page.getByRole("heading", { name: /^Models$/ }).first()).toBeVisible();

    await adminGoto(page, "Support");
    await expect(page).toHaveURL(/\/admin\/support$/);
    await expect(page.getByRole("heading", { name: /support inbox/i })).toBeVisible();

    await adminGoto(page, "Fleet");
    await expect(page).toHaveURL(/\/admin\/fleet$/);
    await expect(page.getByRole("button", { name: /\+ new unit/i })).toBeVisible();

    await adminGoto(page, "Settings");
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
  });

  test("Fleet → New unit creates a bike unit that appears in the list", async ({ page }) => {
    const code = await createUnit(page);
    // createUnit already asserts the code cell is visible; double-check the
    // row also carries the model id.
    const row = page.getByRole("row").filter({ hasText: code });
    await expect(row).toContainText(MODEL_ID);
  });

  test("Bookings → New booking creates a booking, then it can be approved", async ({ page }) => {
    const email = await createBooking(page);

    // Open the row's Manage panel and approve.
    const row = bookingRow(page, email);
    await row.getByRole("button", { name: /manage ▾/i }).click();

    await page.getByRole("button", { name: /^Approve$/ }).click();

    // Success banner + the row's status pill flips to "approved".
    await expect(page.getByText(/booking approved\./i)).toBeVisible();
    await expect(bookingRow(page, email)).toContainText(/approved/i);
  });

  test("Maintenance → New ticket against a fresh unit appears in the list", async ({ page }) => {
    const code = await createUnit(page);

    await adminGoto(page, "Maintenance");
    await page.getByRole("button", { name: /\+ new ticket/i }).click();

    const drawer = page.getByRole("dialog", { name: /^new ticket$/i });
    await expect(drawer).toBeVisible();
    await drawer.getByLabel("Bike unit code", { exact: true }).fill(code);
    await drawer.getByLabel("Description", { exact: true }).fill("Front brake rubbing.");
    await drawer.getByRole("button", { name: /create ticket/i }).click();
    await expect(drawer).toBeHidden();

    // The ticket lands in the Tickets table, keyed by the bike unit code.
    await expect(page.getByRole("cell", { name: code, exact: true })).toBeVisible();
  });

  test("the assign gate blocks an approved booking without a signed contract / settled payment", async ({
    page,
  }) => {
    // A matching available unit must exist, otherwise the assign control shows
    // "no available unit" instead of the payment/contract gate we want to test.
    await createUnit(page);
    const email = await createBooking(page);

    // Approve it so it is past review (assignment is still gated on payment).
    const row = bookingRow(page, email);
    await row.getByRole("button", { name: /manage ▾/i }).click();
    await page.getByRole("button", { name: /^Approve$/ }).click();
    await expect(page.getByText(/booking approved\./i)).toBeVisible();

    // Re-open the (now approved) row's Manage panel — the silent refresh keeps
    // it open, but re-open defensively in case it collapsed.
    const approved = bookingRow(page, email);
    const manage = approved.getByRole("button", { name: /manage|close/i });
    if ((await manage.textContent())?.toLowerCase().includes("manage")) {
      await manage.click();
    }

    // The Assign control mirrors the backend's 409 pre-conditions: with payment
    // unsettled (no Montonio → pending_manual) the assign button is disabled and
    // the inline reason explains why. The "Assign & start rental" button must be
    // disabled and the blocked reason surfaced.
    const assignBtn = page.getByRole("button", { name: /assign & start rental/i });
    await expect(assignBtn).toBeVisible();
    await expect(assignBtn).toBeDisabled();
    await expect(page.getByText(/confirm payment first/i)).toBeVisible();
  });

  test("sign out returns to the sign-in screen", async ({ page }) => {
    await page.getByRole("button", { name: /^sign out$/i }).click();

    // The shell drops back to the full-screen sign-in.
    await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    // The console chrome (topbar Refresh) is gone.
    await expect(page.getByRole("button", { name: /refresh/i })).toHaveCount(0);
  });
});

test.describe("admin sign-in errors", () => {
  test("a wrong password shows an error and does NOT enter the console", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Username", { exact: true }).fill(ADMIN_USER);
    await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-pass");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // An inline error appears (role="alert" on the sign-in form).
    await expect(page.getByRole("alert")).toBeVisible();

    // We never entered the console: still on the sign-in form, no topbar Refresh.
    await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh/i })).toHaveCount(0);
  });
});
