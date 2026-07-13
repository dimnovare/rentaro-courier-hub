import { afterEach, describe, expect, it, vi } from "vitest";
import { locales } from "@/i18n/config";
import {
  confirmManualInvoicePayment,
  createInvoice,
  type Invoice,
} from "@/services/adminBillingService";
import {
  cancelRentalExtension,
  createComplimentaryExtension,
  listRentalExtensions,
  type RentalExtension,
} from "@/services/adminRentalService";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const extensionInvoice: Invoice = {
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

describe("adminBillingService extension contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a canonical invoice locale when creating an invoice", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(extensionInvoice, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createInvoice({ bookingId: "booking-1", locale: locales[1] });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/invoices",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ bookingId: "booking-1", locale: "et" }),
      }),
    );
  });

  it("confirms a manual bank transfer with reference, amount, and currency", async () => {
    const paymentResult = {
      paymentId: "payment-1",
      invoiceId: "invoice-1",
      idempotent: false,
      status: "paid" as const,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(paymentResult));
    vi.stubGlobal("fetch", fetchMock);

    const result = await confirmManualInvoicePayment("invoice/with spaces", {
      amount: 177,
      currency: "EUR",
      providerReference: "BANK-2026-0042",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/invoices/invoice%2Fwith%20spaces/payments/manual-confirmation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          amount: 177,
          currency: "EUR",
          providerReference: "BANK-2026-0042",
        }),
      }),
    );
    expect(result).toEqual(paymentResult);
  });
});

describe("adminRentalService extension contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the exact rental extension history route", async () => {
    const extension: RentalExtension = {
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
      periods: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([extension]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await listRentalExtensions("rental/with spaces");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/rentals/rental%2Fwith%20spaces/extensions",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
    expect(result).toEqual([extension]);
  });

  it("creates a reasoned complimentary extension through the tracked ledger route", async () => {
    const actionResult = {
      extensionId: "extension-2",
      plannedEndDate: "2026-08-14",
      idempotent: false,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(actionResult));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createComplimentaryExtension("rental-1", {
      newEndDate: "2026-08-14",
      reason: "  Service downtime credit  ",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/rentals/rental-1/complimentary-extension",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          newEndDate: "2026-08-14",
          reason: "Service downtime credit",
        }),
      }),
    );
    expect(result).toEqual(actionResult);
  });

  it("cancels a pending extension through its rental-scoped route", async () => {
    const actionResult = {
      extensionId: "extension-1",
      plannedEndDate: "2026-07-15",
      idempotent: false,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(actionResult));
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelRentalExtension("rental-1", "extension/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/rentals/rental-1/extensions/extension%2F1/cancel",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(actionResult);
  });
});
