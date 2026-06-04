import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for the rentaro courier hub.
 *
 * Run against an already-running app:
 *   E2E_BASE_URL=http://localhost:3000 npm run e2e
 *
 * These tests do NOT start the dev server themselves (see the commented
 * `webServer` block below). Bring up `npm run dev` (or a deployed URL) first.
 */
export default defineConfig({
  testDir: "./e2e",
  // One retry in CI smooths over cold-start flakiness; none locally for fast feedback.
  retries: process.env.CI ? 1 : 0,
  // Cap total runtime per test and per assertion so a hung page fails fast.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Default locale is `en` with `localePrefix: "as-needed"`, so unprefixed
    // routes (`/`, `/book`) resolve to English without a redirect.
    locale: "en-US",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // The integrator runs the app separately; we deliberately do NOT force-start
  // a server here. Uncomment to let Playwright boot the dev server locally:
  //
  // webServer: {
  //   command: "npm run dev",
  //   url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
