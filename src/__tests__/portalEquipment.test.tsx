import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageRental } from "@/app/[locale]/my-rental/ManageRental";
import type { PortalRental } from "@/services/portalService";

const { getRental } = vi.hoisted(() => ({ getRental: vi.fn() }));

vi.mock("@/services/portalService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/portalService")>()),
  getRental,
  getRewards: vi.fn().mockResolvedValue({ kind: "ok", data: [] }),
}));

vi.mock("@/services/contractService", () => ({
  getContract: vi.fn().mockResolvedValue({ kind: "invalid" }),
  startSigning: vi.fn(),
  contractDocumentUrl: vi.fn(),
  contractEditableUrl: vi.fn(),
  uploadSignedContract: vi.fn(),
}));

vi.mock("next-intl", () => {
  const copy: Record<string, string> = {
    "equipment.heading": "Equipment",
    "equipment.selected": "Selected package",
    "equipment.awaitingAssignment": "Equipment will be assigned before pickup.",
    "equipment.serial": "Serial: {serial}",
    "equipment.deposit.label": "Extra battery deposit",
    "equipment.deposit.status.notRequired": "Not required",
    "equipment.deposit.status.due": "Due",
    "equipment.deposit.status.collected": "Collected",
    "equipment.deposit.status.refunded": "Refunded",
    "equipment.deposit.status.retained": "Retained",
    "equipment.deposit.status.partiallyRetained": "Partly retained",
    "equipment.condition.good": "Good condition",
    "equipment.packageBenefits.courierPro": "Delivery-ready essentials for each shift.",
  };
  const t = ((key: string, values?: Record<string, string>) => {
    const message = copy[key] ?? key;
    return values
      ? Object.entries(values).reduce((result, [name, value]) => result.replace(`{${name}}`, value), message)
      : message;
  }) as ((key: string, values?: Record<string, string>) => string) & {
    has: (key: string) => boolean;
  };
  t.has = (key) => key in copy;
  return {
    useLocale: () => "en",
    useTranslations: () => t,
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=portal-token"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePathname: () => "/my-rental",
  useRouter: () => ({ replace: vi.fn() }),
}));

const settings = {
  showOnlineSigning: false,
  showPayConfirm: false,
  showReferAcourier: false,
} as never;

const rental: PortalRental = {
  reference: "RNT-1042",
  customerFirstName: "Karl",
  status: "active",
  hasRental: true,
  cityName: "Tallinn",
  modelName: "rentaro Courier Pro",
  planTerm: "6 months",
  unitCode: "TLL-042",
  accessoryPackage: {
    code: "courier-pro",
    name: "Courier Pro",
    recurringPrice: 79,
    refundableDeposit: 120,
    depositEnabled: true,
  },
  accessories: [
    {
      componentCode: "extra-battery",
      name: "Extra battery",
      assetCode: "BAT-019",
      serialNumber: "SN-1042",
      condition: "good",
      depositStatus: "collected",
      internalId: "assignment-42",
      purchaseCost: 53,
      adminNotes: "Replace before winter",
    } as NonNullable<PortalRental["accessories"]>[number],
  ],
};

describe("customer portal equipment", () => {
  it("shows the selected package, customer-safe assigned equipment, and deposit details", async () => {
    getRental.mockResolvedValueOnce({ kind: "ok", data: rental });

    render(<ManageRental settings={settings} />);

    expect(await screen.findByRole("heading", { name: "Equipment" })).toBeInTheDocument();
    expect(screen.getByText("Courier Pro")).toBeInTheDocument();
    expect(screen.getByText("Delivery-ready essentials for each shift.")).toBeInTheDocument();
    expect(screen.getByText("BAT-019")).toBeInTheDocument();
    expect(screen.getByText("Serial: SN-1042")).toBeInTheDocument();
    expect(screen.getByText("Good condition")).toBeInTheDocument();
    expect(screen.getByText("Extra battery deposit")).toBeInTheDocument();
    expect(screen.getByText("Collected")).toBeInTheDocument();
    expect(screen.getByText(/€120\.00/)).toBeInTheDocument();
    expect(screen.queryByText("assignment-42")).not.toBeInTheDocument();
    expect(screen.queryByText("Replace before winter")).not.toBeInTheDocument();
  });

  it("explains when selected package equipment has not been assigned yet", async () => {
    getRental.mockResolvedValueOnce({
      kind: "ok",
      data: { ...rental, accessories: [] },
    });

    render(<ManageRental settings={settings} />);

    await waitFor(() => {
      expect(screen.getByText("Equipment will be assigned before pickup.")).toBeInTheDocument();
    });
    expect(screen.getByText("Due")).toBeInTheDocument();
    expect(screen.getByText(/€120\.00/)).toBeInTheDocument();
  });
});
