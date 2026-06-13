import { test, expect, type Page } from "@playwright/test";

/**
 * Header + footer + global chrome smoke.
 *
 * Covers the persistent layout: the top Nav (src/components/layout/Nav.tsx),
 * the Footer (src/components/layout/Footer.tsx), the LocaleSwitcher
 * (src/components/ui/LocaleSwitcher.tsx) and the GDPR CookieConsent banner
 * (src/components/ui/CookieConsent.tsx).
 *
 * House style: role/label/visible-text selectors only — never the dark/lime
 * CSS classes. baseURL is set, so gotos are relative. Default locale `en` is
 * unprefixed (localePrefix "as-needed"); other locales gain a `/xx` segment.
 *
 * Layout facts that drive the selectors below:
 *  - The header in-page nav links ("Models"/"Pricing"/"How it works"/"Cities")
 *    are `/#id` anchors that smooth-scroll on the landing page rather than
 *    routing. The real route changers in the header are the "View fleet" ghost
 *    button (-> /models) and the "Reserve" primary button (-> /book), plus the
 *    brand logo (-> / ).
 *  - At <=900px the desktop links + locale + ghost button hide and a hamburger
 *    ("Menu") appears; tapping it reveals the mobile dropdown (#mobile-menu).
 *  - Footer columns are real links to standalone routes (/models, /pricing,
 *    /cities/tallinn, /faq, /book, ...).
 *  - CookieConsent persists `rentaro_consent` (granted|denied) and unmounts
 *    once a choice exists; it only mounts after a post-hydration effect.
 */

/** Wide enough that the desktop nav (links + locale + ghost button) renders. */
const DESKTOP = { width: 1280, height: 900 };
/** Narrow phone where the top bar collapses to brand + Reserve + hamburger. */
const MOBILE = { width: 390, height: 844 };

/** Dismiss the consent banner if it is up, so it can't intercept clicks. */
async function dismissConsentIfPresent(page: Page) {
  const accept = page.getByRole("button", { name: /accept all/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

test.describe("header navigation", () => {
  test.use({ viewport: DESKTOP });

  test("desktop in-page links smooth-scroll to their sections", async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    // The header links are anchors; on the landing page they scroll to the
    // matching section id rather than navigating. Scope to the header nav (the
    // first, unnamed <nav>) so we don't collide with the footer's same-text
    // links. Assert the target section becomes visible (URL stays on landing).
    const header = page.getByRole("navigation").first();
    await header.getByRole("link", { name: "Models", exact: true }).click();
    await expect(page.locator("#models")).toBeVisible();

    await header.getByRole("link", { name: "Pricing", exact: true }).click();
    await expect(page.locator("#pricing")).toBeVisible();

    await header.getByRole("link", { name: "How it works", exact: true }).click();
    await expect(page.locator("#how")).toBeVisible();

    await header.getByRole("link", { name: "Cities", exact: true }).click();
    await expect(page.locator("#cities")).toBeVisible();

    // None of those should have left the landing route.
    await expect(page).toHaveURL(/\/$/);
  });

  test('"View fleet" routes to /models', async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    await page.getByRole("button", { name: /view fleet/i }).click();
    await expect(page).toHaveURL(/\/models$/);
    // The /models page renders its "All models." section heading.
    await expect(
      page.getByRole("heading", { name: /all models\.?/i }),
    ).toBeVisible();
  });

  test('header "Reserve" CTA routes to /book', async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    // Scope to the header nav (the first, unnamed <nav>) — the fleet model
    // cards also render "Reserve" buttons, so the bare role query is ambiguous.
    await page
      .getByRole("navigation")
      .first()
      .getByRole("button", { name: /^reserve$/i })
      .click();
    await expect(page).toHaveURL(/\/book$/);
    // The booking wizard opens on the City step.
    await expect(
      page.getByRole("heading", { name: /where do you ride/i }),
    ).toBeVisible();
  });

  test("brand logo returns home from another page", async ({ page }) => {
    // Start away from the landing so the brand acts as a real link home.
    await page.goto("/models");
    await dismissConsentIfPresent(page);
    await expect(page).toHaveURL(/\/models$/);

    await page.getByRole("link", { name: /rentaro . home/i }).click();
    await expect(page).toHaveURL(/\/$/);
    // The landing hero H1 confirms we're home.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /delivery-ready/i,
    );
  });
});

test.describe("mobile menu", () => {
  test.use({ viewport: MOBILE });

  test("hamburger opens the dropdown and its links scroll the page", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    // The desktop links are hidden at this width; the hamburger drives nav.
    const menuBtn = page.getByRole("button", { name: /menu/i });
    await expect(menuBtn).toBeVisible();
    await expect(menuBtn).toHaveAttribute("aria-expanded", "false");

    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute("aria-expanded", "true");

    // The dropdown exposes the same in-page links. Scope to the dropdown so we
    // don't collide with the footer's "Pricing" link.
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();

    await menu.getByRole("link", { name: "Pricing", exact: true }).click();
    // Tapping a link runs the nav action and closes the menu.
    await expect(menu).toBeHidden();
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("mobile menu View fleet routes to /models", async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    await page.getByRole("button", { name: /menu/i }).click();
    const menu = page.locator("#mobile-menu");
    await menu.getByRole("button", { name: /view fleet/i }).click();
    await expect(page).toHaveURL(/\/models$/);
  });
});

test.describe("locale switcher", () => {
  test.use({ viewport: DESKTOP });

  test("switching to Estonian prefixes the URL and localizes the chrome", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    // English baseline: the header Reserve CTA reads "Reserve". Scope to the
    // header nav (first <nav>) — fleet cards also have "Reserve" buttons.
    const headerNav = page.getByRole("navigation").first();
    await expect(
      headerNav.getByRole("button", { name: /^reserve$/i }),
    ).toBeVisible();

    // The switcher is a <select> labelled "Language".
    await page.getByLabel("Language").selectOption("et");

    // localePrefix "as-needed": non-default locales gain a `/et` segment.
    await expect(page).toHaveURL(/\/et(\/|$)/);

    // A known nav string localizes: nav.reserve "Reserve" -> "Broneeri".
    await expect(
      headerNav.getByRole("button", { name: /^broneeri$/i }),
    ).toBeVisible();
    // And the select now reflects the active locale.
    await expect(page.getByLabel("Keel")).toHaveValue("et");
  });
});

test.describe("footer", () => {
  test.use({ viewport: DESKTOP });

  test("Product > Models link routes to /models", async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: "Models", exact: true }).click();
    await expect(page).toHaveURL(/\/models$/);
    await expect(
      page.getByRole("heading", { name: /all models\.?/i }),
    ).toBeVisible();
  });

  test("Company > FAQ link routes to /faq", async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: /^faq$/i }).click();
    await expect(page).toHaveURL(/\/faq$/);
    await expect(
      page.getByRole("heading", { name: /everything you need to know/i }),
    ).toBeVisible();
  });

  test("Cities > Tallinn link routes to /cities/tallinn", async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: /^tallinn$/i }).click();
    await expect(page).toHaveURL(/\/cities\/tallinn$/);
  });

  test("Get started > Reserve a bike link routes to /book", async ({ page }) => {
    await page.goto("/");
    await dismissConsentIfPresent(page);

    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: /reserve a bike/i }).click();
    await expect(page).toHaveURL(/\/book$/);
  });
});

test.describe("cookie consent", () => {
  test.use({ viewport: DESKTOP });

  test("banner can be accepted and stays dismissed across navigation", async ({
    page,
  }) => {
    await page.goto("/");

    const banner = page.getByRole("dialog", { name: /cookies on rentaro/i });
    await expect(banner).toBeVisible();

    await page.getByRole("button", { name: /accept all/i }).click();
    await expect(banner).toBeHidden();

    // The choice is persisted as a cookie (granted) ...
    const cookies = await page.context().cookies();
    expect(
      cookies.find((c) => c.name === "rentaro_consent")?.value,
    ).toBe("granted");

    // ... and the banner does not return on a fresh navigation.
    await page.goto("/models");
    await expect(
      page.getByRole("dialog", { name: /cookies on rentaro/i }),
    ).toBeHidden();
  });

  test("banner can be declined and records denied consent", async ({ page }) => {
    await page.goto("/");

    const banner = page.getByRole("dialog", { name: /cookies on rentaro/i });
    await expect(banner).toBeVisible();

    await page.getByRole("button", { name: /^decline$/i }).click();
    await expect(banner).toBeHidden();

    const cookies = await page.context().cookies();
    expect(
      cookies.find((c) => c.name === "rentaro_consent")?.value,
    ).toBe("denied");

    await page.reload();
    await expect(
      page.getByRole("dialog", { name: /cookies on rentaro/i }),
    ).toBeHidden();
  });
});
