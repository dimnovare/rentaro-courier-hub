import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for the rentaro courier hub.
 *
 * Two run modes:
 *   1. `npm run e2e:full` — sets E2E_LOCAL_STACK=1 and Playwright boots the whole
 *      LOCAL stack itself: a throwaway Postgres (:5437) + the .NET API (:5141, via
 *      e2e/start-api.mjs) + the Next dev server (:3000) pointed at that API. One
 *      self-contained command; it never touches dev (:5436) or production data.
 *   2. `E2E_BASE_URL=http://localhost:3000 npm run e2e` — run against an
 *      already-running app (bring your own server); no webServer managed here.
 */
const LOCAL_STACK = !!process.env.E2E_LOCAL_STACK;
const API_URL = "http://localhost:5141";
// In local-stack mode use a dedicated port (3100) so we never collide with — or
// accidentally reuse — another app already running on the usual dev port 3000.
const APP_URL = process.env.E2E_BASE_URL ?? (LOCAL_STACK ? "http://localhost:3100" : "http://localhost:3000");

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
    baseURL: APP_URL,
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

  // In local-stack mode, boot the API (+ its throwaway DB) and the Next dev
  // server (pointed at that API) ourselves. Order matters: Playwright waits for
  // each `url` to respond before starting tests. Generous timeouts cover the
  // first-time dotnet build + Next compile.
  webServer: LOCAL_STACK
    ? [
        {
          command: "node e2e/start-api.mjs",
          url: `${API_URL}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 240_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          // Use a PRODUCTION build, not `next dev`: the dev server compiles
          // routes on demand and buckles under parallel e2e load (intermittent
          // 500s/timeouts). A prebuilt `next start` is stable. NEXT_PUBLIC_* is
          // inlined at build time, so the env must be set for the build too.
          command: "npm run build && npm run start -- -p 3100",
          url: APP_URL,
          reuseExistingServer: false,
          timeout: 300_000,
          env: { NEXT_PUBLIC_API_BASE_URL: API_URL },
        },
      ]
    : undefined,
});
