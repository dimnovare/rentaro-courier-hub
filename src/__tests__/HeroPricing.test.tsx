import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { InteractionProvider } from "@/components/providers/Interactions";
import { Hero } from "@/components/sections/Hero";

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
});
