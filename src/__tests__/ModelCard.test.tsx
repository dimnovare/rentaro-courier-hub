import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InteractionProvider } from "@/components/providers/Interactions";
import { ModelCard } from "@/components/models/ModelCard";
import { enginePro } from "@/data/bikeModels";
import { pricingPlans } from "@/data/pricingPlans";

// ModelCard calls useInteractions(), so it must render inside the provider.
// next/navigation + next/link are mocked globally in vitest.setup.tsx.
function renderCard(model = enginePro, compact = false) {
  return render(
    <InteractionProvider>
      <ModelCard m={model} compact={compact} />
    </InteractionProvider>,
  );
}

describe("ModelCard", () => {
  it("renders the model name", () => {
    renderCard();
    // The name appears as a heading link.
    expect(
      screen.getByRole("heading", { name: enginePro.name }),
    ).toBeInTheDocument();
  });

  it("shows the daily price range / day", () => {
    const { container } = renderCard();
    // The card shows the daily-rate span "€3.90–5.90 / day", derived from the
    // pricing plans (min..max daily), not from the model. Assert on the
    // normalised text content since the price is split across nodes.
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    const rates = pricingPlans.map((p) => p.daily);
    const min = Math.min(...rates).toFixed(2);
    const max = Math.max(...rates).toFixed(2);
    expect(text).toContain(`€${min}–${max}`);
    expect(text).toContain("/ day");
  });

  it("renders a Reserve action for an in-stock model", () => {
    renderCard();
    expect(
      screen.getByRole("button", { name: /reserve/i }),
    ).toBeInTheDocument();
  });
});
