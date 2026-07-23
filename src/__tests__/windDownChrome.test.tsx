import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InteractionProvider } from "@/components/providers/Interactions";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import en from "../../messages/en.json";

// The wind-down chrome tests toggle NEXT_PUBLIC_BUSINESS_MODE at render time.
// Both components read the flag inside their render body (via isWindDownMode),
// so setting the env var before render is enough — no module reload needed.
const ORIGINAL_MODE = process.env.NEXT_PUBLIC_BUSINESS_MODE;

function setMode(mode: string | undefined) {
  if (mode === undefined) delete process.env.NEXT_PUBLIC_BUSINESS_MODE;
  else process.env.NEXT_PUBLIC_BUSINESS_MODE = mode;
}

afterEach(() => setMode(ORIGINAL_MODE));

// Href substrings that identify a commercial (acquisition) surface. None of
// these may appear in the header/footer while the site is winding down.
const COMMERCIAL_HREFS = [
  "/models",
  "/pricing",
  "/book",
  "/accessories",
  "/how-it-works",
  "/cities",
  "/faq",
  "/monthly-ebike-rental",
  "/delivery-ebike-rental",
  "/ebike-rental-for-couriers",
];

function hrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a[href]")).map(
    (a) => a.getAttribute("href") ?? "",
  );
}

function renderNav() {
  return render(
    <InteractionProvider>
      <Nav />
    </InteractionProvider>,
  );
}

describe("wind-down header (Nav)", () => {
  beforeEach(() => setMode("wind_down"));

  it("suppresses the commercial nav links and CTAs", () => {
    const { container } = renderNav();

    // No Reserve / View-fleet CTAs, no Models/Pricing/How/Cities links, no menu.
    expect(screen.queryByRole("button", { name: en.nav.reserve })).toBeNull();
    expect(screen.queryByRole("button", { name: en.nav.viewFleet })).toBeNull();
    expect(screen.queryByRole("button", { name: en.nav.menu })).toBeNull();
    expect(screen.queryByRole("link", { name: en.nav.models })).toBeNull();
    expect(screen.queryByRole("link", { name: en.nav.pricing })).toBeNull();
    expect(screen.queryByRole("link", { name: en.nav.howItWorks })).toBeNull();
    expect(screen.queryByRole("link", { name: en.nav.cities })).toBeNull();

    // No anchor points at any commercial route.
    for (const href of hrefs(container)) {
      for (const commercial of COMMERCIAL_HREFS) {
        expect(href.includes(commercial)).toBe(false);
      }
    }
  });

  it("keeps the logo, language switcher and customer-portal link", () => {
    renderNav();

    // Brand / logo (Link carries the accessible name).
    expect(screen.getByLabelText("rentaro — home")).toBeInTheDocument();
    // Language switcher trigger (aria-label from the localeSwitcher namespace).
    expect(
      screen.getByRole("button", { name: en.localeSwitcher.label }),
    ).toBeInTheDocument();
    // Customer-portal link → /my-rental.
    const portal = screen.getByRole("link", { name: en.nav.portal });
    expect(portal).toHaveAttribute("href", "/my-rental");
  });
});

describe("normal-mode header (Nav) is unchanged", () => {
  beforeEach(() => setMode(undefined));

  it("still renders the Reserve / View-fleet CTAs and commercial links", () => {
    renderNav();

    expect(
      screen.getByRole("button", { name: en.nav.reserve }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: en.nav.viewFleet }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en.nav.models }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en.nav.pricing }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en.nav.cities }),
    ).toBeInTheDocument();
  });
});

describe("wind-down footer", () => {
  beforeEach(() => setMode("wind_down"));

  it("suppresses commercial columns, the reserve link and the city line", async () => {
    const { container } = render(await Footer());

    // No commercial footer links.
    expect(
      screen.queryByRole("link", { name: en.footer.links.reserveBike }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: en.footer.links.pricing }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: en.footer.links.accessories }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: en.footer.links.monthlyRental }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: en.footer.links.riga }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: en.footer.links.helsinki }),
    ).toBeNull();

    // No "Riga / Helsinki (soon)" marketing city line anywhere in the footer.
    // (Tallinn is deliberately NOT asserted — it appears in the registry
    // address, which is kept.)
    const text = container.textContent ?? "";
    expect(text).not.toContain("Riga");
    expect(text).not.toContain("Helsinki");

    // No anchor points at any commercial route.
    for (const href of hrefs(container)) {
      for (const commercial of COMMERCIAL_HREFS) {
        expect(href.includes(commercial)).toBe(false);
      }
    }
  });

  it("keeps the logo, legal links, portal link and company/contact info", async () => {
    render(await Footer());

    // Legal pages stay reachable.
    expect(
      screen.getByRole("link", { name: en.footer.links.rules }),
    ).toHaveAttribute("href", "/rules");
    expect(
      screen.getByRole("link", { name: en.footer.links.privacy }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByRole("link", { name: en.footer.links.terms }),
    ).toHaveAttribute("href", "/terms");

    // Customer portal.
    expect(
      screen.getByRole("link", { name: en.footer.links.myRental }),
    ).toHaveAttribute("href", "/my-rental");

    // Company / contact info: email, phone, registry code.
    expect(
      screen.getByRole("link", { name: "info@rentaro.ee" }),
    ).toHaveAttribute("href", "mailto:info@rentaro.ee");
    expect(screen.getByRole("link", { name: /\+372/ })).toBeInTheDocument();
    expect(document.body.textContent ?? "").toContain("14621591");
  });
});

describe("normal-mode footer is unchanged", () => {
  beforeEach(() => setMode(undefined));

  it("still renders the commercial columns and the city line", async () => {
    const { container } = render(await Footer());

    expect(
      screen.getByRole("link", { name: en.footer.links.reserveBike }),
    ).toHaveAttribute("href", "/book");
    expect(
      screen.getByRole("link", { name: en.footer.links.accessories }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en.footer.links.riga }),
    ).toBeInTheDocument();
    // City line is present in normal mode.
    expect(container.textContent ?? "").toContain("Helsinki");
  });
});
