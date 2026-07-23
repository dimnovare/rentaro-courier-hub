import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WindDownPage, { generateMetadata } from "./page";
import en from "../../../../messages/en.json";

describe("wind-down notice page", () => {
  it("renders the localized title, body and contact email", async () => {
    render(await WindDownPage());

    expect(
      screen.getByRole("heading", { name: en.windDown.heading }),
    ).toBeInTheDocument();
    expect(en.windDown.heading).toBe("New rentals are currently closed");
    expect(screen.getByText(en.windDown.body)).toBeInTheDocument();

    const mailto = screen.getByRole("link", { name: "info@rentaro.ee" });
    expect(mailto).toHaveAttribute("href", "mailto:info@rentaro.ee");
  });

  it("shows a customer-portal button linking to /my-rental", async () => {
    render(await WindDownPage());

    const portalLink = screen.getByRole("link", { name: en.windDown.portalCta });
    expect(portalLink).toHaveAttribute("href", "/my-rental");
  });

  it("does NOT expose commercial content (pricing / reserve / waitlist)", async () => {
    render(await WindDownPage());

    // No booking/reserve CTA, no pricing figures, no waitlist form.
    expect(screen.queryByRole("link", { name: /reserve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reserve|waitlist|join/i })).toBeNull();
    expect(screen.queryByText(/€\s?\d/)).toBeNull();
  });

  it("is marked noindex via metadata", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(meta.robots).toMatchObject({ index: false });
    expect(meta.title).toBe(en.pageMeta.windDown.title);
  });
});
