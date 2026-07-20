import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { InteractionProvider } from "@/components/providers/Interactions";
import { formatDailyPrice, Hero } from "@/components/sections/Hero";
import en from "../../messages/en.json";
import et from "../../messages/et.json";
import fi from "../../messages/fi.json";
import lv from "../../messages/lv.json";
import ru from "../../messages/ru.json";

describe("Hero pricing", () => {
  it("renders the live cheapest 12-month daily price", () => {
    const livePricing = { startingDailyPrice: 5.63 };
    const { container } = render(
      <InteractionProvider>
        <Hero {...livePricing} />
      </InteractionProvider>,
    );

    expect(container.textContent).toContain("from €5.63/day");
    expect(container.textContent).not.toContain("from €3.90/day");
  });

  it("omits the price claim when current API pricing is unavailable", () => {
    const { container } = render(
      <InteractionProvider>
        <Hero />
      </InteractionProvider>,
    );

    expect(container.textContent).not.toContain("from €");
    expect(container.querySelectorAll(".hero-stat")).toHaveLength(2);
  });

  it.each([
    ["en", en, "from €5.63"],
    ["et", et, "al. €5,63"],
    ["fi", fi, "alk. €5,63"],
    ["lv", lv, "no €5,63"],
    ["ru", ru, "от €5,63"],
  ])("formats and interpolates the price for %s", (locale, messages, expected) => {
    const formatted = formatDailyPrice(5.63, locale);
    const rendered = messages.hero.stats.priceValue.replace("{price}", formatted);

    expect(rendered).toBe(expected);
  });
});
