# E2E tests (Playwright)

End-to-end UI smoke tests for the critical conversion flows: the homepage hero
and the `/book` booking wizard.

## Running

These tests run against an **already-running app** — they do not start the dev
server themselves. Bring the app up first, then point the tests at it:

```bash
# Terminal 1 — start the app
npm run dev            # serves http://localhost:3000

# Terminal 2 — run the tests
E2E_BASE_URL=http://localhost:3000 npm run e2e
```

`E2E_BASE_URL` defaults to `http://localhost:3000` if unset. Point it at any
deployed environment to smoke-test there:

```bash
E2E_BASE_URL=https://staging.example.com npm run e2e
```

Interactive UI mode:

```bash
npm run e2e:ui
```

First-time setup (installs the Chromium browser binary):

```bash
npx playwright install chromium
```

## What's covered

- `home.spec.ts` — homepage renders the hero H1 ("Delivery-ready…") and the
  primary "Reserve a bike" CTA.
- `booking.spec.ts` — drives the booking wizard two ways: (1) a deep link
  (`?city=&model=&plan=`) that collapses straight to the Details step, and
  (2) clicking through City → Model → Plan. Both fill Details and assert the
  Review step renders the selection + price.

## Backend dependency

The tests stop at the **Review** step. Clicking **Submit request** calls the
booking service and, on success, navigates to `/booking/success` — this needs a
live booking API. To exercise that final hop end-to-end, run against an
environment with the backend reachable and uncomment the submit assertions
noted in `booking.spec.ts`.
