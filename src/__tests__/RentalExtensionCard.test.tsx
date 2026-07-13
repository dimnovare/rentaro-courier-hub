import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceHistoryCard } from "@/app/[locale]/my-rental/InvoiceHistoryCard";
import { RentalExtensionCard } from "@/app/[locale]/my-rental/RentalExtensionCard";
import type {
  PortalExtensionMutation,
  PortalInvoiceSummary,
  PortalRental,
} from "@/services/portalService";

const invoices: PortalInvoiceSummary[] = [
  {
    id: "invoice-1",
    number: "R-2026-0042",
    kind: "rentalExtension",
    rentalExtensionId: "extension-1",
    status: "issued",
    locale: "en",
    issueDate: "2026-07-13",
    dueDate: "2026-07-15",
    serviceStartDate: "2026-07-15",
    serviceEndDate: "2026-08-13",
    total: 147,
    currency: "EUR",
    hasPdf: true,
  },
];

const eligibleRental: PortalRental = {
  reference: "RNT-1042",
  customerFirstName: "Karl",
  status: "active",
  hasRental: true,
  cityName: "Tallinn",
  modelName: "rentaro Engine Pro 2.0",
  planTerm: "30 days",
  startDate: "2026-06-15",
  plannedEndDate: "2026-07-15",
  unitCode: "TLL-042",
  preferredLocale: "en",
  extensionEligibility: { eligible: true },
  extensionOptions: [
    {
      optionCode: "p30",
      termMonths: 1,
      billingPeriodCount: 1,
      amountPerPeriod: 177,
      totalCommitment: 177,
      currency: "EUR",
      proposedPlannedEndDate: "2026-08-14",
      firstServiceStartDate: "2026-07-15",
      firstServiceEndDate: "2026-08-13",
    },
    {
      optionCode: "p180",
      termMonths: 6,
      billingPeriodCount: 6,
      amountPerPeriod: 147,
      totalCommitment: 882,
      currency: "EUR",
      proposedPlannedEndDate: "2027-01-11",
      firstServiceStartDate: "2026-07-15",
      firstServiceEndDate: "2026-08-13",
    },
    {
      optionCode: "p360",
      termMonths: 12,
      billingPeriodCount: 12,
      amountPerPeriod: 117,
      totalCommitment: 1404,
      currency: "EUR",
      proposedPlannedEndDate: "2027-07-10",
      firstServiceStartDate: "2026-07-15",
      firstServiceEndDate: "2026-08-13",
    },
  ],
  currentExtension: null,
  billingSchedule: [],
  invoices: [],
};

describe("RentalExtensionCard", () => {
  it("renders only backend-priced 30-day, 6-month, and 12-month choices", () => {
    render(
      <RentalExtensionCard
        token="signed-token"
        rental={eligibleRental}
        onRentalChanged={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /^30 days\b/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /6 months/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /12 months/i })).toBeInTheDocument();
    expect(screen.getByText(/€147\.00 every 30 days/i)).toBeInTheDocument();
    expect(screen.getByText(/€882\.00 total commitment/i)).toBeInTheDocument();
  });

  it("requires recurring-billing consent and refreshes authoritative GET state", async () => {
    const pendingRental: PortalRental = {
      ...eligibleRental,
      extensionEligibility: { eligible: false, code: "extension_already_pending" },
      currentExtension: {
        id: "extension-1",
        status: "awaiting_payment",
        optionCode: "p180",
        termMonths: 6,
        billingPeriodCount: 6,
        previousPlannedEndDate: "2026-07-15",
        proposedPlannedEndDate: "2027-01-11",
        amountPerPeriod: 147,
        totalCommitment: 882,
        currency: "EUR",
        bankTransfer: {
          accountName: "rentaro OU",
          bankName: "LHV",
          iban: "EE001234567890",
          reference: "R-2026-0042",
        },
      },
      invoices,
    };
    const request = vi.fn().mockResolvedValue({
      kind: "ok",
      data: { extension: pendingRental.currentExtension!, invoice: invoices[0] },
    } satisfies { kind: "ok"; data: PortalExtensionMutation });
    const reload = vi.fn().mockResolvedValue({ kind: "ok", data: pendingRental });
    const onRentalChanged = vi.fn();

    render(
      <RentalExtensionCard
        token="signed-token"
        rental={eligibleRental}
        onRentalChanged={onRentalChanged}
        request={request}
        reload={reload}
        makeIdempotencyKey={() => "stable-key"}
      />,
    );

    const submit = screen.getByRole("button", { name: "Confirm extension" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /6 months/i }));
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /billed every 30 days/i }));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "signed-token",
        {
          optionCode: "p180",
          expectedPlannedEndDate: "2026-07-15",
          consent: true,
        },
        "stable-key",
      ),
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledWith("signed-token");
    expect(onRentalChanged).toHaveBeenCalledWith(pendingRental);
  });

  it("shows bank-transfer instructions and lets the customer cancel an unpaid request", async () => {
    const restoredRental = { ...eligibleRental };
    const pendingRental: PortalRental = {
      ...eligibleRental,
      extensionEligibility: { eligible: false, code: "extension_already_pending" },
      currentExtension: {
        id: "extension-1",
        status: "awaiting_payment",
        optionCode: "p180",
        termMonths: 6,
        billingPeriodCount: 6,
        previousPlannedEndDate: "2026-07-15",
        proposedPlannedEndDate: "2027-01-11",
        amountPerPeriod: 147,
        totalCommitment: 882,
        currency: "EUR",
        bankTransfer: {
          accountName: "rentaro OU",
          bankName: "LHV",
          iban: "EE001234567890",
          reference: "R-2026-0042",
        },
      },
      invoices,
    };
    const cancel = vi.fn().mockResolvedValue({
      kind: "ok",
      data: { ok: true, message: "Cancelled" },
    });
    const reload = vi.fn().mockResolvedValue({ kind: "ok", data: restoredRental });

    render(
      <RentalExtensionCard
        token="signed-token"
        rental={pendingRental}
        onRentalChanged={vi.fn()}
        cancel={cancel}
        reload={reload}
      />,
    );

    expect(screen.getByRole("heading", { name: "Awaiting bank transfer" })).toBeInTheDocument();
    expect(screen.getByText("EE001234567890")).toBeInTheDocument();
    expect(screen.getByText("R-2026-0042")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download invoice pdf/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/portal/invoices/invoice-1/pdf?token=signed-token"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel unpaid extension" }));

    await waitFor(() => expect(cancel).toHaveBeenCalledWith("signed-token", "extension-1"));
    expect(reload).toHaveBeenCalledWith("signed-token");
  });

  it("renders the active server schedule without calculating billing dates", () => {
    const activeRental: PortalRental = {
      ...eligibleRental,
      plannedEndDate: "2027-01-11",
      extensionEligibility: { eligible: false, code: "active_commitment" },
      currentExtension: {
        id: "extension-1",
        status: "active",
        optionCode: "p180",
        termMonths: 6,
        billingPeriodCount: 6,
        previousPlannedEndDate: "2026-07-15",
        proposedPlannedEndDate: "2027-01-11",
        amountPerPeriod: 147,
        totalCommitment: 882,
        currency: "EUR",
        nextInvoiceDate: "2026-08-11",
      },
      billingSchedule: [
        {
          id: "period-1",
          sequenceNumber: 1,
          serviceStartDate: "2026-07-15",
          serviceEndDate: "2026-08-13",
          invoiceIssueDate: "2026-07-12",
          dueDate: "2026-07-15",
          amount: 147,
          currency: "EUR",
          status: "paid",
          invoice: { ...invoices[0], status: "paid" },
        },
        {
          id: "period-2",
          sequenceNumber: 2,
          serviceStartDate: "2026-08-14",
          serviceEndDate: "2026-09-12",
          invoiceIssueDate: "2026-08-11",
          dueDate: "2026-08-14",
          amount: 147,
          currency: "EUR",
          status: "scheduled",
          invoice: null,
        },
      ],
      invoices: [{ ...invoices[0], status: "paid" }],
    };

    render(
      <RentalExtensionCard
        token="signed-token"
        rental={activeRental}
        onRentalChanged={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Extension active" })).toBeInTheDocument();
    expect(screen.getByText("Aug 14, 2026 - Sep 12, 2026")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });
});

describe("InvoiceHistoryCard", () => {
  it("keeps secure PDF access available independently of booking payment controls", () => {
    render(<InvoiceHistoryCard token="signed token" invoices={invoices} />);

    expect(screen.getByRole("heading", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.getByText("R-2026-0042")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download invoice pdf/i })).toHaveAttribute(
      "href",
      expect.stringContaining("token=signed%20token"),
    );
  });
});
