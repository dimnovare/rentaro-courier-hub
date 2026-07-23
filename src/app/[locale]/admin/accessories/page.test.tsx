import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAccessory } from "@/services/adminCatalogService";
import type { AdminAccessoryMetrics, AdminAccessoryUnit } from "@/types/accessoryInventory";

const inventory = vi.hoisted(() => ({
  getAccessoryUnits: vi.fn(),
  createAccessoryUnit: vi.fn(),
  createAccessoryUnitBatch: vi.fn(),
  updateAccessoryUnit: vi.fn(),
  receiveAccessoryUnit: vi.fn(),
  markAccessoryUnitMaintenance: vi.fn(),
  markAccessoryUnitAvailable: vi.fn(),
  markAccessoryUnitLost: vi.fn(),
  retireAccessoryUnit: vi.fn(),
  deleteAccessoryUnit: vi.fn(),
}));
const metrics = vi.hoisted(() => ({ getAccessoryMetrics: vi.fn() }));
const catalog = vi.hoisted(() => ({ getAccessories: vi.fn(), getCities: vi.fn() }));
const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
const confirms = vi.hoisted(() => ({ confirmAction: vi.fn(() => true) }));
const analytics = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock("@/services/adminAccessoryInventoryService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/adminAccessoryInventoryService")>()),
  ...inventory,
}));
vi.mock("@/services/adminAccessoryMetricsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/adminAccessoryMetricsService")>()),
  ...metrics,
}));
vi.mock("@/services/adminCatalogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/adminCatalogService")>()),
  ...catalog,
}));
vi.mock("@/components/admin/AdminAuth", () => ({
  useAdminAuth: () => ({ authenticated: true, ready: true, signOut: auth.signOut }),
}));
vi.mock("@/components/admin/useAdminRefresh", () => ({ useAdminRefresh: vi.fn() }));
vi.mock("@/lib/confirm", () => confirms);
vi.mock("@/services/analytics", () => analytics);

import AdminAccessoriesPage from "./page";
import { AccessoryInventoryApiError } from "@/services/adminAccessoryInventoryService";

function accessory(overrides: Partial<AdminAccessory>): AdminAccessory {
  return {
    id: "battery",
    name: "Extra battery",
    nameLocalized: {},
    description: null,
    descriptionLocalized: {},
    price: "€60 / 30d",
    price30: 60,
    price6mo: 60,
    price12mo: 60,
    isBundle: false,
    componentIds: [],
    icon: "battery",
    sortOrder: 1,
    colors: [],
    isActive: true,
    customerOfferPlacement: "secondary",
    isRecommended: false,
    benefit: "",
    benefitLocalized: {},
    inventoryTracked: true,
    replacementValue: 300,
    compareAtOfferCodes: [],
    ...overrides,
  };
}

function unit(overrides: Partial<AdminAccessoryUnit> = {}): AdminAccessoryUnit {
  return {
    id: 1,
    assetCode: "BAT-001",
    accessoryCode: "battery",
    accessoryName: "Extra battery",
    serialNumber: "SECRET-SERIAL-1",
    cityId: "tallinn",
    location: "Telliskivi",
    status: "incoming",
    condition: "new",
    purchaseDate: "2026-07-20",
    purchaseCost: 149.99,
    expectedArrivalDate: "2026-07-25",
    notes: "Internal purchase note",
    heldBookingId: "private-booking-id",
    holdExpiresAt: null,
    assignmentId: null,
    rentalId: null,
    hasHistory: false,
    ...overrides,
  };
}

function metric(overrides: Partial<AdminAccessoryMetrics> = {}): AdminAccessoryMetrics {
  return {
    from: "2026-06-23",
    to: "2026-07-22",
    cityId: null,
    eligibleBookings: 40,
    attachedBookings: 17,
    attachRatePercent: 42.5,
    offerMix: [
      {
        offerCode: "courier-pro",
        offerName: "Courier Pro",
        bookingCount: 10,
        sharePercent: 58.82,
        recurringRevenue: 418,
      },
    ],
    activeBikeMonths: 20,
    recurringAccessoryRevenue: 418,
    revenuePerActiveBikeMonth: 20.9,
    inventoryTotal: 12,
    inventory: [
      {
        cityId: "tallinn",
        componentCode: "battery",
        componentName: "Extra battery",
        status: "available",
        count: 7,
      },
    ],
    inspectedAssignments: 8,
    damagedAssignments: 1,
    damageRatePercent: 12.5,
    lostAssignments: 0,
    lossRatePercent: 0,
    currency: "EUR",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-07-22T09:00:00Z"));
  inventory.getAccessoryUnits.mockResolvedValue([
    unit(),
    unit({
      id: 2,
      assetCode: "LOCK-002",
      accessoryCode: "lock",
      accessoryName: "Heavy-duty lock",
      status: "assigned",
      condition: "good",
      heldBookingId: null,
      assignmentId: "assignment-private-id",
      rentalId: "rental-private-id",
      hasHistory: true,
    }),
    unit({
      id: 3,
      assetCode: "MOUNT-003",
      accessoryCode: "lock",
      accessoryName: "Heavy-duty lock",
      status: "maintenance",
      condition: "damaged",
      heldBookingId: null,
      hasHistory: true,
    }),
  ]);
  metrics.getAccessoryMetrics.mockResolvedValue(metric());
  catalog.getAccessories.mockResolvedValue([
    accessory({}),
    accessory({ id: "lock", name: "Heavy-duty lock", customerOfferPlacement: "hidden", replacementValue: 45 }),
    accessory({ id: "courier-pro", name: "Courier Pro", isBundle: true, inventoryTracked: false }),
  ]);
  catalog.getCities.mockResolvedValue([
    { id: "tallinn", name: "Tallinn", country: "Estonia", available: 4, pickup: "Telliskivi", status: "available", sortOrder: 1 },
    { id: "riga", name: "Riga", country: "Latvia", available: 0, pickup: "Riga", status: "soon", sortOrder: 2 },
  ]);
  inventory.createAccessoryUnitBatch.mockResolvedValue([
    unit({ id: 13, assetCode: "BAT-003", heldBookingId: null }),
    unit({ id: 14, assetCode: "BAT-004", heldBookingId: null }),
    unit({ id: 15, assetCode: "BAT-005", heldBookingId: null }),
  ]);
  inventory.receiveAccessoryUnit.mockImplementation(async () => unit({ status: "available" }));
  inventory.markAccessoryUnitLost.mockImplementation(async () => unit({ status: "lost" }));
  inventory.retireAccessoryUnit.mockImplementation(async () => unit({ status: "retired" }));
});

afterEach(() => vi.useRealTimers());

describe("admin accessory inventory", () => {
  it("shows supported commercial and custody metrics without leaking internal row data", async () => {
    render(<AdminAccessoriesPage />);

    expect(await screen.findByRole("heading", { name: "Accessories" })).toBeInTheDocument();
    expect(metrics.getAccessoryMetrics).toHaveBeenCalledWith({
      from: "2026-06-23",
      to: "2026-07-22",
    });
    expect(screen.getByText("42.5%")).toBeInTheDocument();
    expect(screen.getAllByText("€418").length).toBeGreaterThan(0);
    expect(screen.getByText("€20.90")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /BAT-001.*Extra battery.*Tallinn.*Incoming/i })).toBeInTheDocument();
    expect(screen.queryByText("149.99")).not.toBeInTheDocument();
    expect(screen.queryByText("private-booking-id")).not.toBeInTheDocument();
    expect(screen.queryByText("assignment-private-id")).not.toBeInTheDocument();
    expect(screen.queryByText("Internal purchase note")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open LOCK-002 rental" })).toHaveAttribute(
      "href",
      expect.stringContaining("/admin/rentals?id=rental-private-id"),
    );
  });

  it("applies inventory filters and carries the city into the metrics query", async () => {
    render(<AdminAccessoriesPage />);
    await screen.findByText("BAT-001");

    fireEvent.change(screen.getByRole("combobox", { name: "City" }), {
      target: { value: "tallinn" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), {
      target: { value: "incoming" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() =>
      expect(inventory.getAccessoryUnits).toHaveBeenLastCalledWith({
        cityId: "tallinn",
        status: "incoming",
      }),
    );
    expect(metrics.getAccessoryMetrics).toHaveBeenLastCalledWith({
      from: "2026-06-23",
      to: "2026-07-22",
      cityId: "tallinn",
    });
  });

  it("previews zero-padded batch codes and submits the batch contract", async () => {
    render(<AdminAccessoriesPage />);
    await screen.findByText("BAT-001");
    fireEvent.click(screen.getByRole("button", { name: "Batch add" }));
    const dialog = await screen.findByRole("dialog", { name: "Batch add accessory units" });

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Asset-code prefix" }), {
      target: { value: "BAT-" },
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Start number" }), {
      target: { value: "3" },
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Quantity" }), {
      target: { value: "3" },
    });
    expect(within(dialog).getByText("BAT-003 · BAT-004 · BAT-005")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create 3 units" }));

    await waitFor(() =>
      expect(inventory.createAccessoryUnitBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          accessoryCode: "battery",
          cityId: "tallinn",
          prefix: "BAT-",
          start: 3,
          count: 3,
        }),
      ),
    );
    expect(analytics.track).toHaveBeenCalledWith(
      "admin_accessory_inventory_batch_created",
      {
        component_code: "battery",
        city: "tallinn",
        outcome: "incoming",
      },
    );
  });

  it("shows only valid lifecycle actions and confirms loss and retirement", async () => {
    render(<AdminAccessoriesPage />);
    const incomingRow = await screen.findByRole("row", { name: /BAT-001/i });
    const assignedRow = screen.getByRole("row", { name: /LOCK-002/i });
    const damagedMaintenanceRow = screen.getByRole("row", { name: /MOUNT-003/i });

    expect(within(incomingRow).getByRole("button", { name: "Receive BAT-001" })).toBeInTheDocument();
    expect(within(incomingRow).getByRole("button", { name: "Mark BAT-001 lost" })).toBeInTheDocument();
    expect(within(assignedRow).queryByRole("button", { name: /lost/i })).not.toBeInTheDocument();
    expect(
      within(damagedMaintenanceRow).queryByRole("button", { name: "Mark MOUNT-003 available" }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(incomingRow).getByRole("button", { name: "Mark BAT-001 lost" }));
    await waitFor(() => expect(inventory.markAccessoryUnitLost).toHaveBeenCalledWith(1));
    expect(analytics.track).toHaveBeenCalledWith("admin_accessory_loss", {
      component_code: "battery",
      city: "tallinn",
      outcome: "lost",
    });
    expect(confirms.confirmAction).toHaveBeenCalledWith(
      expect.stringContaining("BAT-001"),
      expect.objectContaining({ finality: "irreversible" }),
    );

    const lostRow = screen.getByRole("row", { name: /BAT-001.*Lost/i });
    fireEvent.click(within(lostRow).getByRole("button", { name: "Retire BAT-001" }));
    await waitFor(() => expect(inventory.retireAccessoryUnit).toHaveBeenCalledWith(1));
  });

  it("renders useful zero states and signs out when inventory authorization expires", async () => {
    inventory.getAccessoryUnits.mockResolvedValueOnce([]);
    metrics.getAccessoryMetrics.mockResolvedValueOnce(
      metric({
        eligibleBookings: 0,
        attachedBookings: 0,
        attachRatePercent: 0,
        offerMix: [],
        activeBikeMonths: 0,
        recurringAccessoryRevenue: 0,
        revenuePerActiveBikeMonth: 0,
        inventoryTotal: 0,
        inventory: [],
        inspectedAssignments: 0,
        damagedAssignments: 0,
        damageRatePercent: 0,
        lostAssignments: 0,
        lossRatePercent: 0,
      }),
    );
    const { unmount } = render(<AdminAccessoriesPage />);
    expect(await screen.findByText("No paid accessory packages in this period.")).toBeInTheDocument();
    expect(screen.getByText("No physical accessory units for these filters.")).toBeInTheDocument();
    unmount();

    inventory.getAccessoryUnits.mockRejectedValueOnce(
      new AccessoryInventoryApiError("Session expired", 401, "unauthorized"),
    );
    render(<AdminAccessoriesPage />);
    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
  });

  it("surfaces catalog lookup failures and disables inventory creation without valid options", async () => {
    catalog.getAccessories.mockRejectedValueOnce(new Error("Accessory catalog unavailable."));
    render(<AdminAccessoriesPage />);

    expect(await screen.findByText("Accessory catalog unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Batch add" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "+ New unit" })).toBeDisabled();
  });
});
