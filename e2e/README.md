# E2E tests (Playwright)

End-to-end UI tests for rentaro's public site (marketing, pricing, models, the
booking wizard, waitlist) and the admin console. They run against a **real**
backend so form submits actually hit the API and persist.

## Two run modes

### 1. `npm run e2e:full` — self-contained local stack (recommended)

One command brings up the entire stack and runs the suite against it:

```bash
npm run e2e:full
# pass through Playwright args, e.g. a single file:
npm run e2e:full -- e2e/admin.spec.ts
```

This sets `E2E_LOCAL_STACK=1`, and `playwright.config.ts` then boots, in order:

1. a **throwaway Postgres** container (`rentaro-e2e-postgres`, host port **5437**,
   db `rentaro_e2e`) — recreated and **wiped on every run** via `e2e/start-api.mjs`;
2. the **.NET API** from the sibling repo `../Rentaro/src/Rentaro.Api` on port
   **5141**, pointed at that DB, with known local admin creds and all external
   integrations (SK/Montonio/email) left unconfigured so nothing real is sent;
3. the **Next dev server** on port **3100** (`npm run dev -- -p 3100`), with
   `NEXT_PUBLIC_API_BASE_URL=http://localhost:5141` so the browser talks to the
   throwaway API.

Playwright waits for each service's health URL before starting tests and tears
everything down (including removing the container) on exit.

**Safety:** this stack is fully isolated. It never touches the local **dev**
DB (port 5436), and it never contacts production (`api.rentaro.ee`). The DB and
admin creds are local throwaways — the DB is reset clean on each run, so admin
CRUD tests start from a freshly seeded catalogue.

### 2. `E2E_BASE_URL=… npm run e2e` — bring your own server

Run against an app you've already started yourself (local or deployed). Nothing
is managed for you:

```bash
# Terminal 1 — start the app (and its backend) yourself
npm run dev                       # http://localhost:3000

# Terminal 2 — point the tests at it
E2E_BASE_URL=http://localhost:3000 npm run e2e
```

`E2E_BASE_URL` defaults to `http://localhost:3000` when unset. Point it at any
environment (e.g. `https://staging.example.com`) to smoke-test there. Note that
specs which submit forms or exercise admin flows need a reachable backend with
the seeded catalogue and matching admin creds; otherwise run `e2e:full`.

Interactive UI mode (also honors `E2E_BASE_URL`):

```bash
npm run e2e:ui
```

## Prerequisites

- **Docker** — for the throwaway e2e Postgres on port 5437 (`e2e:full` only).
- **.NET SDK** — `e2e:full` runs `dotnet run` against the sibling `../Rentaro`
  API, so the repo must be checked out next to this one and the SDK installed.
- **Chromium for Playwright** — install once:

  ```bash
  npx playwright install chromium
  ```

The first `e2e:full` run is slow: it includes the initial `dotnet` build and the
Next compile (covered by generous webServer timeouts).

## Local credentials (throwaway)

The admin creds used by the admin specs are defined in `e2e/start-api.mjs` and
mirrored in `e2e/helpers.ts` (`ADMIN_USER` / `ADMIN_PASS`). They are local-only
throwaways for the e2e stack — not real credentials.

## Spec files

All specs use relative gotos (the `baseURL` is set), prefer role + visible-text
selectors over CSS, and pull shared fixtures/constants from `e2e/helpers.ts`
(`CITY`, `MODEL_ID`, `MODEL_NAME`, `PLAN`, `PLAN_PRICE`, `FUTURE_DATE`,
`adminLogin`, `adminGoto`, `fillBookingDetails`, `uniqueEmail`). Anything that
submits uses `uniqueEmail()` so reruns don't trip the per-email rate cap.

- `home.spec.ts` — homepage hero H1 ("Delivery-ready…") and the primary
  "Reserve a bike" CTA render.
- `marketing-pages.spec.ts` — the public marketing/content pages load and render
  their expected headings/content.
- `nav-footer.spec.ts` — header navigation and footer links resolve to the right
  pages across the site.
- `cta-pricing-models.spec.ts` — pricing plans and the models catalogue render
  with correct copy/prices, and their CTAs route into the booking flow.
- `booking.spec.ts` — drives the booking wizard two ways: (1) a deep link
  (`?city=&model=&plan=`) that collapses straight to the Details step, and
  (2) clicking through City → Model → Plan. Both fill Details and assert the
  Review step renders the selection + price.
- `booking-order-flow.spec.ts` — full happy-path booking submission against the
  real API: completes the wizard, submits, and confirms the order/success
  outcome (and its persistence).
- `waitlist-status.spec.ts` — the waitlist signup flow and the resulting status
  state, submitting against the real API.
- `admin.spec.ts` — admin console: signs in with the throwaway creds and
  exercises the admin sections (e.g. bookings, fleet) backed by the freshly
  seeded catalogue.
