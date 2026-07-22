import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessoryPackages } from "./AccessoryPackages";
import { getAccessoryOffers } from "@/services/accessoryOfferService";
import type { AccessoryOfferQuote } from "@/types/accessoryOffer";

vi.mock("@/services/accessoryOfferService", () => ({
  getAccessoryOffers: vi.fn(),
}));

const cityOptions = [
  { id: "tallinn", name: "Tallinn" },
  { id: "riga", name: "Riga" },
];

function offers(planId: string, cityId: string): AccessoryOfferQuote[] {
  const longPlan = planId !== "p30";
  const batteryAvailable = cityId === "tallinn";
  return [
    {
      code: null,
      name: "Bike Only",
      benefit: "Start with the bike and included charger.",
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
      benefit: "Keep your phone visible and bike secured between orders.",
      components: [
        { code: "lock", name: "Heavy-duty lock" },
        { code: "phone", name: "Phone holder" },
      ],
      recurringPrice: longPlan ? 30 : 60,
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
      recurringPrice: longPlan ? 79 : 109,
      savingAmount: 11,
      recommended: true,
      placement: "primary",
      available: batteryAvailable,
      unavailableComponent: batteryAvailable ? null : "battery",
      extraBatteryDeposit: null,
    },
    {
      code: "battery",
      name: "Battery Only",
      benefit: "Add an extra battery for more flexibility between charges.",
      components: [{ code: "battery", name: "Extra battery" }],
      recurringPrice: 60,
      savingAmount: 0,
      recommended: false,
      placement: "secondary",
      available: batteryAvailable,
      unavailableComponent: batteryAvailable ? null : "battery",
      extraBatteryDeposit: null,
    },
  ];
}

describe("AccessoryPackages", () => {
  beforeEach(() => {
    vi.mocked(getAccessoryOffers).mockImplementation(async ({ planId, cityId }) =>
      offers(planId, cityId),
    );
  });

  it("renders current server prices, computed saving, and honest optional copy", async () => {
    render(<AccessoryPackages cities={cityOptions} />);

    expect(await screen.findByText("Courier Pro")).toBeInTheDocument();
    expect(screen.getByText("€79")).toBeInTheDocument();
    expect(screen.getByText("Save €11")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.queryByText(/most popular/i)).not.toBeInTheDocument();
    expect(screen.getByText(/only the charger is included/i)).toBeInTheDocument();
    expect(screen.queryByText(/\b\d+\s*km\b/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "30 days" }));
    await waitFor(() => expect(screen.getByText("€109")).toBeInTheDocument());
    expect(getAccessoryOffers).toHaveBeenLastCalledWith({
      cityId: "tallinn",
      locale: "en",
      planId: "p30",
    });
  });

  it("requotes by city and keeps unavailable packages visible", async () => {
    render(<AccessoryPackages cities={cityOptions} />);
    await screen.findByText("Courier Pro");

    fireEvent.change(screen.getByLabelText("City availability"), {
      target: { value: "riga" },
    });

    expect(await screen.findAllByText("Extra battery unavailable in Riga.")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /courier pro/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("uses a compact primary subset on the homepage and carries booking intent", async () => {
    render(<AccessoryPackages cities={cityOptions.slice(0, 1)} compact />);

    await screen.findByText("Courier Pro");
    expect(screen.getByText("Bike Only")).toBeInTheDocument();
    expect(screen.getByText("Courier Essentials")).toBeInTheDocument();
    expect(screen.queryByText("Battery Only")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose courier pro/i })).toHaveAttribute(
      "href",
      "/book?city=tallinn&plan=p365",
    );
  });
});
