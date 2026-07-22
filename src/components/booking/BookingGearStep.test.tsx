import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BookingGearStep } from "./BookingGearStep";
import type { AccessoryOfferQuote } from "@/types/accessoryOffer";

const offers: AccessoryOfferQuote[] = [
  {
    code: null,
    name: "Bike Only",
    benefit: "Ride with the bike's included equipment.",
    components: [],
    recurringPrice: 0,
    savingAmount: 0,
    recommended: false,
    placement: "primary",
    available: true,
    unavailableComponent: null,
    extraBatteryDeposit: null,
  },
  {
    code: "security-kit",
    name: "Courier Essentials",
    benefit: "Keep your phone visible and your bike secured between orders.",
    components: [
      { code: "lock", name: "Heavy-duty lock" },
      { code: "phone", name: "Phone holder" },
    ],
    recurringPrice: 30,
    savingAmount: 0,
    recommended: false,
    placement: "primary",
    available: true,
    unavailableComponent: null,
    extraBatteryDeposit: null,
  },
  {
    code: "courier-pro",
    name: "Courier Pro",
    benefit: "Extra shift flexibility with the essential courier setup.",
    components: [
      { code: "battery", name: "Extra battery" },
      { code: "lock", name: "Heavy-duty lock" },
      { code: "phone", name: "Phone holder" },
    ],
    recurringPrice: 79,
    savingAmount: 11,
    recommended: true,
    placement: "primary",
    available: true,
    unavailableComponent: null,
    extraBatteryDeposit: 150,
  },
  {
    code: "battery",
    name: "Battery Only",
    benefit: "Add a second battery for longer working days.",
    components: [{ code: "battery", name: "Extra battery" }],
    recurringPrice: 60,
    savingAmount: 0,
    recommended: false,
    placement: "secondary",
    available: false,
    unavailableComponent: "battery",
    extraBatteryDeposit: 150,
  },
];

describe("BookingGearStep", () => {
  it("shows an unselected primary comparison and a secondary battery choice", () => {
    render(
      <BookingGearStep
        offers={offers}
        value={undefined}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /bike only/i })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /courier pro/i })).not.toBeChecked();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText(/save €11/i)).toBeInTheDocument();
    expect(screen.queryByText(/most popular/i)).not.toBeInTheDocument();
    expect(screen.getByText(/other gear/i)).toBeInTheDocument();
  });

  it("emits the stable offer code and explicit null for Bike Only", () => {
    const onChange = vi.fn();
    render(
      <BookingGearStep offers={offers} value={undefined} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /courier pro/i }));
    fireEvent.click(screen.getByRole("radio", { name: /bike only/i }));

    expect(onChange).toHaveBeenNthCalledWith(1, "courier-pro");
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });

  it("keeps an unavailable offer visible but disabled with the missing component", () => {
    render(
      <BookingGearStep offers={offers} value={undefined} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("radio", { name: /battery only/i })).toBeDisabled();
    expect(screen.getByText(/extra battery is unavailable/i)).toBeInTheDocument();
  });

  it("shows loading and retry states without inventing prices", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <BookingGearStep
        offers={[]}
        value={undefined}
        onChange={vi.fn()}
        loading
      />,
    );
    expect(screen.getByText(/loading gear options/i)).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    rerender(
      <BookingGearStep
        offers={[]}
        value={undefined}
        onChange={vi.fn()}
        error="Could not load gear options."
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
