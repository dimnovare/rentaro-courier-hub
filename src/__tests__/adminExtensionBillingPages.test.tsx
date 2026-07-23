import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const billing = vi.hoisted(() => ({
  listExpenses: vi.fn(),
  listInvoices: vi.fn(),
  getSummary: vi.fn(),
  createExpense: vi.fn(),
  deleteExpense: vi.fn(),
  uploadExpenseInvoice: vi.fn(),
  createInvoice: vi.fn(),
  markInvoicePaid: vi.fn(),
  confirmManualInvoicePayment: vi.fn(),
  deleteInvoice: vi.fn(),
}));

const rentals = vi.hoisted(() => ({
  listRentals: vi.fn(),
  listRentalExtensions: vi.fn(),
  createComplimentaryExtension: vi.fn(),
  cancelRentalExtension: vi.fn(),
  scheduleReturn: vi.fn(),
  markReturned: vi.fn(),
  inspectRental: vi.fn(),
  updateRentalDates: vi.fn(),
  sendReturnReminder: vi.fn(),
  getRentalAccessories: vi.fn(),
  confirmRentalAccessoryHandover: vi.fn(),
  updateRentalAccessoryDeposit: vi.fn(),
}));

const bookings = vi.hoisted(() => ({ listBookings: vi.fn() }));
const adminAuth = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/components/admin/AdminAuth", () => ({
  useAdminAuth: () => ({ authenticated: true, ready: true, signOut: adminAuth.signOut }),
}));

vi.mock("@/components/admin/useAdminRefresh", () => ({ useAdminRefresh: vi.fn() }));

vi.mock("@/services/adminBillingService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/adminBillingService")>();
  return { ...actual, ...billing };
});

vi.mock("@/services/adminRentalService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/adminRentalService")>();
  return { ...actual, ...rentals };
});

vi.mock("@/services/adminBookingService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/adminBookingService")>();
  return { ...actual, ...bookings };
});

import AdminBillingPage from "@/app/[locale]/admin/billing/page";
import AdminRentalsPage from "@/app/[locale]/admin/rentals/page";

const invoice = {
  id: "invoice-1",
  number: "R-2026-0042",
  bookingId: "booking-1",
  rentalId: "rental-1",
  rentalExtensionId: "extension-1",
  billingPeriodId: "period-1",
  kind: "rentalExtension",
  locale: "et",
  customerName: "Karl Klient",
  customerEmail: "karl@example.com",
  issueDate: "2026-07-13",
  dueDate: "2026-07-15",
  serviceStartDate: "2026-07-15",
  serviceEndDateExclusive: "2026-08-14",
  lines: [],
  subtotal: 145.08,
  vatRatePercent: 22,
  vatAmount: 31.92,
  total: 177,
  currency: "EUR",
  status: "issued",
  paidAt: null,
  voidedAt: null,
  notes: null,
  hasPdf: true,
  createdAt: "2026-07-13T08:00:00Z",
};

const rental = {
  id: "rental-1",
  bookingId: "booking-1",
  customerEmail: "karl@example.com",
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

const extension = {
  id: "extension-1",
  status: "awaiting_payment",
  planId: "p180",
  previousPlannedEndDate: "2026-07-15",
  proposedPlannedEndDate: "2027-01-11",
  billingPeriodCount: 6,
  baseAmountPerPeriod: 147,
  accessoryAmountPerPeriod: 30,
  totalAmountPerPeriod: 177,
  totalCommitmentAmount: 1062,
  currency: "EUR",
  locale: "et",
  source: "portal",
  adminReason: null,
  requestedAt: "2026-07-13T08:00:00Z",
  activatedAt: null,
  cancelledAt: null,
  periods: [
    {
      id: "period-1",
      sequenceNumber: 1,
      serviceStartDate: "2026-07-15",
      serviceEndDateExclusive: "2026-08-14",
      dueDate: "2026-07-15",
      total: 177,
      currency: "EUR",
      status: "invoiced",
      invoiceId: "invoice-1",
      invoiceNumber: "R-2026-0042",
      invoiceStatus: "issued",
      paymentId: null,
      paymentProvider: null,
      paymentReference: null,
      paymentStatus: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  billing.listExpenses.mockResolvedValue([]);
  billing.listInvoices.mockResolvedValue([invoice]);
  billing.getSummary.mockResolvedValue({
    monthIncomings: 0,
    monthOutgoings: 0,
    monthNet: 0,
    allIncomings: 0,
    allOutgoings: 0,
    allNet: 0,
    currency: "EUR",
  });
  bookings.listBookings.mockResolvedValue([
    {
      id: "booking-1",
      createdAt: "2026-07-01T08:00:00Z",
      status: "approved",
      cityId: "tallinn",
      modelId: "engine-pro",
      planId: "p30",
      accessoryIds: [],
      preferredStartDate: null,
      customerFirstName: "Karl",
      customerLastName: "Klient",
      customerEmail: "karl@example.com",
      customerPhone: "+3725555555",
      notes: null,
      contactMethod: "email",
      paymentMethod: "transfer",
      fulfillment: "pickup",
      locale: "et",
      referralCode: null,
      heldBikeUnitCode: null,
      holdExpiresAt: null,
    },
  ]);
  rentals.listRentals.mockResolvedValue([rental]);
  rentals.getRentalAccessories.mockResolvedValue({ depositDue: false, offerCode: null, items: [] });
  rentals.listRentalExtensions.mockResolvedValue([extension]);
  rentals.createComplimentaryExtension.mockResolvedValue({
    extensionId: "extension-2",
    plannedEndDate: "2026-08-14",
    idempotent: false,
  });
  rentals.cancelRentalExtension.mockResolvedValue({
    extensionId: "extension-1",
    plannedEndDate: "2026-07-15",
    idempotent: false,
  });
});

describe("admin billing extension UX", () => {
  it("shows invoice language and provenance while protecting extension invoices", async () => {
    render(<AdminBillingPage />);

    expect(await screen.findByText("R-2026-0042")).toBeInTheDocument();
    expect(screen.getByText("ET")).toBeInTheDocument();
    expect(screen.getByText("Rental extension")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm transfer" })).toBeInTheDocument();
    expect(screen.getByText("Protected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete invoice R-2026-0042" })).not.toBeInTheDocument();
  });

  it("uses the selected booking locale in the create-invoice request", async () => {
    billing.createInvoice.mockResolvedValue(invoice);
    render(<AdminBillingPage />);

    await screen.findByText("R-2026-0042");
    fireEvent.click(screen.getByRole("button", { name: /create invoice/i }));
    const dialog = await screen.findByRole("dialog", { name: "Create invoice" });
    const bookingSelect = within(dialog).getByRole("combobox", { name: "Booking" });
    await waitFor(() => expect(bookingSelect).toBeEnabled());
    fireEvent.change(bookingSelect, { target: { value: "booking-1" } });

    expect(within(dialog).getByRole("combobox", { name: "Invoice language" })).toHaveValue("et");
    const paymentTerm = within(dialog).getByRole("spinbutton", {
      name: "Payment timeframe in days",
    });
    expect(paymentTerm).toHaveValue(7);
    fireEvent.change(paymentTerm, { target: { value: "14" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create invoice" }));

    await waitFor(() =>
      expect(billing.createInvoice).toHaveBeenCalledWith({
        bookingId: "booking-1",
        locale: "et",
        paymentTermDays: 14,
      }),
    );
  });

  it("confirms amount and currency then refreshes billing data", async () => {
    billing.confirmManualInvoicePayment.mockResolvedValue({
      paymentId: "payment-1",
      invoiceId: "invoice-1",
      idempotent: false,
      status: "paid",
    });
    render(<AdminBillingPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Confirm transfer" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirm bank transfer" });
    expect(within(dialog).getByRole("spinbutton", { name: "Payment amount" })).toHaveValue(177);
    expect(within(dialog).getByRole("combobox", { name: "Payment currency" })).toHaveValue("EUR");
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Bank reference" }), {
      target: { value: "BANK-2026-0042" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm payment" }));

    await waitFor(() =>
      expect(billing.confirmManualInvoicePayment).toHaveBeenCalledWith("invoice-1", {
        amount: 177,
        currency: "EUR",
        providerReference: "BANK-2026-0042",
      }),
    );
    await waitFor(() => expect(billing.listInvoices).toHaveBeenCalledTimes(2));
  });
});

describe("admin rental extension UX", () => {
  it("shows extension history, source, status, and linked invoice details", async () => {
    render(<AdminRentalsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /manage/i }));
    const dialog = await screen.findByRole("dialog", { name: "Manage rental" });

    expect(await within(dialog).findByText("Extension history")).toBeInTheDocument();
    expect(within(dialog).getByText("Awaiting payment")).toBeInTheDocument();
    expect(within(dialog).getByText("Portal")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "R-2026-0042" })).toHaveAttribute(
      "href",
      "/api/admin/invoices/invoice-1/pdf",
    );
  });

  it("requires a reason before creating a complimentary extension", async () => {
    render(<AdminRentalsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /manage/i }));
    const dialog = await screen.findByRole("dialog", { name: "Manage rental" });
    const submit = within(dialog).getByRole("button", { name: "Apply complimentary extension" });
    expect(submit).toBeDisabled();

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Complimentary extension reason" }), {
      target: { value: "Service downtime credit" },
    });
    const dateGroup = within(dialog).getByRole("group", {
      name: "Complimentary extension end date",
    });
    fireEvent.change(within(dateGroup).getByRole("spinbutton", { name: "Day" }), {
      target: { value: "14" },
    });
    fireEvent.change(within(dateGroup).getByRole("combobox", { name: "Month" }), {
      target: { value: "8" },
    });
    fireEvent.change(within(dateGroup).getByRole("spinbutton", { name: "Year" }), {
      target: { value: "2026" },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() =>
      expect(rentals.createComplimentaryExtension).toHaveBeenCalledWith("rental-1", {
        newEndDate: "2026-08-14",
        reason: "Service downtime credit",
      }),
    );
  });

  it("cancels a pending extension from its history", async () => {
    render(<AdminRentalsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /manage/i }));
    const dialog = await screen.findByRole("dialog", { name: "Manage rental" });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Cancel extension" }));

    await waitFor(() =>
      expect(rentals.cancelRentalExtension).toHaveBeenCalledWith("rental-1", "extension-1"),
    );
  });
});
