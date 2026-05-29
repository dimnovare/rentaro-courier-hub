import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InteractionProvider } from "@/components/providers/Interactions";
import { ModelCard } from "@/components/models/ModelCard";
import { enginePro } from "@/data/bikeModels";

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

  it("shows the 'From €X.XX / day' price", () => {
    const { container } = renderCard();
    // The price is split across FROM / €5.90 / "/ day" nodes, so assert on the
    // normalised text content of the card.
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toContain(`€${enginePro.fromDay.toFixed(2)}`);
    expect(text).toContain("/ day");
  });

  it("renders a Reserve action for an in-stock model", () => {
    renderCard();
    expect(
      screen.getByRole("button", { name: /reserve/i }),
    ).toBeInTheDocument();
  });
});
