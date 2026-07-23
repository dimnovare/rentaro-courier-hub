import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminRentalAccessoryResponse } from "@/types/accessoryInventory";

const rentals = vi.hoisted(() => ({
  listRentals: vi.fn(),
  scheduleReturn: vi.fn(),
  markReturned: vi.fn(),
  inspectRental: vi.fn(),
  updateRentalDates: vi.fn(),
  sendReturnReminder: vi.fn(),
  listRentalExtensions: vi.fn(),
  createComplimentaryExtension: vi.fn(),
  cancelRentalExtension: vi.fn(),
  getRentalAccessories: vi.fn(),
  confirmRentalAccessoryHandover: vi.fn(),
  updateRentalAccessoryDeposit: vi.fn(),
}));
const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
const confirms = vi.hoisted(() => ({ confirmAction: vi.fn(() => true) }));
const analytics = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock("@/services/adminRentalService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/adminRentalService")>()),
  ...rentals,
}));
vi.mock("@/components/admin/AdminAuth", () => ({
  useAdminAuth: () => ({ authenticated: true, ready: true, signOut: auth.signOut }),
}));
vi.mock("@/components/admin/useAdminRefresh", () => ({ useAdminRefresh: vi.fn() }));
vi.mock("@/lib/confirm", () => confirms);
vi.mock("@/services/analytics", () => analytics);

import AdminRentalsPage from "@/app/[locale]/admin/rentals/page";

const rental = {
  id: "rental-1",
  bookingId: "booking-1",
  customerEmail: "courier@example.com",
  bikeUnitInternalCode: "TLL-001",
  modelId: "engine-pro",
  planId: "p30",
  startDate: "2026-06-15",
  plannedEndDate: "2026-07-15",
  actualEndDate: null,
  returnScheduledDate: null,
  status: "active",
  monthlyPrice: 177,
  depositAmount: 100,
  isOverdue: false,
  createdAt: "2026-06-15T08:00:00Z",
  lastReturnReminderSentAt: null,
};

function custody(
  outcome: "assigned" | "handedover" | "returned" = "assigned",
  depositStatus: "due" | "collected" = "due",
): AdminRentalAccessoryResponse {
  const returned = outcome === "returned";
  return {
    depositDue: depositStatus === "due",
    offerCode: "courier-pro",
    items: [
      {
        assignmentId: "assignment-battery",
        accessoryUnitId: 11,
        assetCode: "BAT-011",
        serialNumber: "SN-BAT-011",
        cityId: "tallinn",
        accessoryCode: "battery",
        accessoryName: "Extra battery",
        unitStatus: returned ? "inspectionpending" : "assigned",
        unitCondition: "good",
        outcome,
        outboundCondition: "good",
        outboundNotes: null,
        inboundCondition: null,
        inspectionNotes: null,
        replacementValue: 300,
        depositAmount: 120,
        depositStatus,
        retainedAmount: 0,
        retainedReason: null,
        assignedAt: "2026-06-15T08:00:00Z",
        handedOverAt: outcome === "assigned" ? null : "2026-06-15T09:00:00Z",
        returnedAt: returned ? "2026-07-15T09:00:00Z" : null,
        completedAt: null,
      },
      {
        assignmentId: "assignment-lock",
        accessoryUnitId: 12,
        assetCode: "LOCK-012",
        serialNumber: null,
        cityId: "tallinn",
        accessoryCode: "lock",
        accessoryName: "Heavy-duty lock",
        unitStatus: returned ? "inspectionpending" : "assigned",
        unitCondition: "new",
        outcome,
        outboundCondition: "new",
        outboundNotes: null,
        inboundCondition: null,
        inspectionNotes: null,
        replacementValue: 45,
        depositAmount: 0,
        depositStatus: "notrequired",
        retainedAmount: 0,
        retainedReason: null,
        assignedAt: "2026-06-15T08:00:00Z",
        handedOverAt: outcome === "assigned" ? null : "2026-06-15T09:00:00Z",
        returnedAt: returned ? "2026-07-15T09:00:00Z" : null,
        completedAt: null,
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rentals.listRentals.mockResolvedValue([rental]);
  rentals.listRentalExtensions.mockResolvedValue([]);
  rentals.getRentalAccessories.mockResolvedValue(custody());
  rentals.confirmRentalAccessoryHandover.mockResolvedValue(custody("handedover"));
  rentals.updateRentalAccessoryDeposit.mockResolvedValue(custody("handedover", "collected"));
  rentals.markReturned.mockResolvedValue({
    ...rental,
    status: "returned",
    actualEndDate: "2026-07-15",
  });
  rentals.inspectRental.mockResolvedValue({ ...rental, status: "closed", actualEndDate: "2026-07-15" });
});

async function openManage() {
  render(<AdminRentalsPage />);
  fireEvent.click(await screen.findByRole("button", { name: /manage/i }));
  return screen.findByRole("dialog", { name: "Manage rental" });
}

describe("admin rental accessory custody", () => {
  it("loads every held unit, confirms exact handover conditions, and collects the deposit", async () => {
    const handoverResponse = custody("handedover");
    handoverResponse.items.push({
      ...handoverResponse.items[1],
      assignmentId: "assignment-history",
      accessoryUnitId: 99,
      assetCode: "LOCK-HISTORY",
      outcome: "returned",
      unitStatus: "available",
      returnedAt: "2026-05-15T09:00:00Z",
      completedAt: "2026-05-15T10:00:00Z",
    });
    rentals.confirmRentalAccessoryHandover.mockResolvedValueOnce(handoverResponse);
    const dialog = await openManage();

    expect(await within(dialog).findByText("Equipment custody")).toBeInTheDocument();
    expect(within(dialog).getByText(/BAT-011/)).toBeInTheDocument();
    expect(within(dialog).getByText("LOCK-012")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("combobox", { name: "LOCK-012 outbound condition" }), {
      target: { value: "worn" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm equipment handover" }));

    await waitFor(() =>
      expect(rentals.confirmRentalAccessoryHandover).toHaveBeenCalledWith("rental-1", {
        items: [
          { accessoryUnitId: 11, condition: "good", notes: null },
          { accessoryUnitId: 12, condition: "worn", notes: null },
        ],
      }),
    );
    expect(analytics.track).toHaveBeenCalledWith("admin_accessory_handover", {
      offer_code: "courier-pro",
      component_code: "battery",
      city: "tallinn",
      outcome: "handedover",
    });
    expect(analytics.track).toHaveBeenCalledTimes(2);

    fireEvent.click(within(dialog).getByRole("button", { name: "Mark deposit collected" }));
    await waitFor(() =>
      expect(rentals.updateRentalAccessoryDeposit).toHaveBeenCalledWith("rental-1", {
        status: "collected",
      }),
    );
  });

  it("records one PII-free return event per live accessory when the rental is returned", async () => {
    rentals.getRentalAccessories.mockResolvedValueOnce(custody("handedover", "collected"));
    const dialog = await openManage();
    await within(dialog).findByText("Equipment custody");

    fireEvent.click(within(dialog).getByRole("button", { name: "Mark returned" }));

    await waitFor(() => expect(rentals.markReturned).toHaveBeenCalledWith("rental-1"));
    expect(analytics.track).toHaveBeenCalledWith("admin_accessory_return", {
      offer_code: "courier-pro",
      component_code: "battery",
      city: "tallinn",
      outcome: "returned",
    });
    expect(analytics.track).toHaveBeenCalledWith("admin_accessory_return", {
      offer_code: "courier-pro",
      component_code: "lock",
      city: "tallinn",
      outcome: "returned",
    });
    expect(analytics.track).toHaveBeenCalledTimes(2);
  });

  it("requires a valid retained amount and reason before updating a collected deposit", async () => {
    rentals.getRentalAccessories.mockResolvedValueOnce(custody("handedover", "collected"));
    const dialog = await openManage();
    await within(dialog).findByText("Equipment custody");

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Deposit outcome" }), {
      target: { value: "partially_retained" },
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Amount retained (€)" }), {
      target: { value: "120" },
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Retention reason" }), {
      target: { value: "Damaged battery case" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Update deposit" }));
    expect(
      within(dialog).getByText("A partial retention must be greater than zero and less than €120.00."),
    ).toBeInTheDocument();
    expect(rentals.updateRentalAccessoryDeposit).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Amount retained (€)" }), {
      target: { value: "40" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Update deposit" }));
    await waitFor(() =>
      expect(rentals.updateRentalAccessoryDeposit).toHaveBeenCalledWith("rental-1", {
        status: "partially_retained",
        retainedAmount: 40,
        reason: "Damaged battery case",
      }),
    );
  });

  it("requires and submits one inspection outcome for every returned unit", async () => {
    rentals.listRentals.mockResolvedValue([{ ...rental, status: "returned", actualEndDate: "2026-07-15" }]);
    rentals.getRentalAccessories.mockResolvedValue(custody("returned", "collected"));
    const dialog = await openManage();
    await within(dialog).findByText("Equipment custody");

    const history = within(dialog).getByLabelText("BAT-011 custody history");
    expect(history).toHaveTextContent("Assigned");
    expect(history).toHaveTextContent("Handed over");
    expect(history).toHaveTextContent("Returned");

    const pass = within(dialog).getByRole("button", { name: "Pass inspection" });
    expect(pass).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("combobox", { name: "BAT-011 inspection outcome" }), {
      target: { value: "returned" },
    });
    fireEvent.change(within(dialog).getByRole("combobox", { name: "LOCK-012 inspection outcome" }), {
      target: { value: "missing" },
    });
    expect(pass).toBeEnabled();
    fireEvent.click(pass);

    await waitFor(() =>
      expect(rentals.inspectRental).toHaveBeenCalledWith(
        "rental-1",
        true,
        undefined,
        [
          { accessoryUnitId: 11, outcome: "returned", condition: "good", notes: null },
          { accessoryUnitId: 12, outcome: "missing", condition: null, notes: null },
        ],
      ),
    );
    expect(analytics.track).toHaveBeenCalledWith("admin_accessory_loss", {
      offer_code: "courier-pro",
      component_code: "lock",
      city: "tallinn",
      outcome: "missing",
    });
    expect(analytics.track).toHaveBeenCalledTimes(1);
  });
});
