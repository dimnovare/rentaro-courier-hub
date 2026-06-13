import { expect, type Page } from "@playwright/test";

/**
 * Shared e2e helpers + fixtures. The suite runs against a real LOCAL backend
 * (see playwright.config.ts + e2e/start-api.mjs): a throwaway Postgres seeded
 * with the catalogue on API boot. So catalogue ids below are the seeded ones,
 * and the admin creds match the ones start-api.mjs passes to the API.
 */

// Local admin creds (MUST match e2e/start-api.mjs).
export const ADMIN_USER = "admin";
export const ADMIN_PASS = "e2e-admin-pass";

// Seeded catalogue ids used for deep-links + assertions.
export const CITY = "tallinn";
export const MODEL_ID = "engine-pro";
export const MODEL_NAME = "rentaro Engine Pro 2.0";
export const PLAN = "p365"; // 12 months → €117 / 30 days
export const PLAN_TERM = /12 months/i;
export const PLAN_PRICE = "€117";

// A start date comfortably past the "today + 3 business days" minimum.
export const FUTURE_DATE = "2030-06-16";

/** Sign in to the admin console and wait for the console chrome to appear. */
export async function adminLogin(page: Page): Promise<void> {
  await page.goto("/admin");
  await page.getByLabel("Username", { exact: true }).fill(ADMIN_USER);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASS);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  // The topbar Refresh control only renders once authenticated.
  await expect(page.getByRole("button", { name: /refresh/i })).toBeVisible();
}

/** Open an admin section from the sidebar nav by its visible label. */
export async function adminGoto(page: Page, label: string | RegExp): Promise<void> {
  await page.getByRole("link", { name: label }).first().click();
}

/** Fill the booking wizard's Details step (assumes the Details step is shown). */
export async function fillBookingDetails(
  page: Page,
  o: { first?: string; last?: string; email?: string; phone?: string; start?: string } = {},
): Promise<void> {
  await expect(page.getByRole("heading", { name: /your details/i })).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill(o.first ?? "Test");
  await page.getByLabel("Last name", { exact: true }).fill(o.last ?? "Courier");
  await page.getByLabel("Email", { exact: true }).fill(o.email ?? "test.courier@example.com");
  await page.getByLabel("Phone", { exact: true }).fill(o.phone ?? "+372 5555 1234");
  await page.getByLabel("Preferred start date", { exact: true }).fill(o.start ?? FUTURE_DATE);
}

/** Unique email per run so real-backend booking rows don't collide across runs. */
export function uniqueEmail(prefix = "e2e"): string {
  // Date.now is unavailable in some sandboxes; performance.now + random is fine here.
  const stamp = Math.floor(performance.now() * 1000) % 1_000_000;
  return `${prefix}.${stamp}@example.com`;
}
