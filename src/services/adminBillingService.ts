/**
 * Admin billing / money API client for the /admin/billing vertical. Calls the
 * same-origin Next BFF proxy (`/api/admin/*`), which attaches the admin JWT from
 * an httpOnly cookie server-side — so this client holds no token. A 401 surfaces
 * as a typed BillingApiError (unauthorized) so the page can prompt for a fresh
 * sign-in; a not-configured backend surfaces as BillingConfigError.
 *
 * This mirrors src/services/adminMaintenanceService.ts but is kept separate so the
 * billing slice owns its own contract types and helpers.
 *
 * Endpoints (cookie session, via the proxy):
 *   GET    /api/admin/expenses                (list — newest first)
 *   POST   /api/admin/expenses                (create)
 *   DELETE /api/admin/expenses/{id}           (delete)
 *   POST   /api/admin/expenses/{id}/invoice   (multipart upload, field `file`)
 *   GET    /api/admin/expenses/{id}/invoice   (stream the stored invoice)
 *   GET    /api/admin/billing/summary         (this-month vs all-time totals)
 *   GET    /api/admin/invoices                (list — newest first, no PDF bytes)
 *   POST   /api/admin/invoices                (create + issue; bookingId or free-form)
 *   GET    /api/admin/invoices/{id}/pdf       (stream the generated PDF)
 *   PATCH  /api/admin/invoices/{id}/status    (mark paid / back to issued)
 */

/* ── Contract types (must match the backend exactly) ───────────────────── */

/** A recorded outgoing. `hasInvoice` reflects whether a receipt/invoice was uploaded. */
export interface Expense {
  id: string;
  /** ISO date `yyyy-MM-dd`. */
  date: string;
  category: string;
  supplier: string;
  description: string;
  amountGross: number;
  currency: string;
  hasInvoice: boolean;
  invoiceFileName?: string | null;
  notes?: string | null;
  createdAt: string;
}

/** Create-expense request body. */
export interface CreateExpenseInput {
  /** ISO date `yyyy-MM-dd`. */
  date: string;
  category: string;
  supplier: string;
  description: string;
  amountGross: number;
  currency?: string;
  notes?: string;
}

/** One generated-invoice line. Totals are gross (VAT included). */
export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * A generated customer invoice. `number` is the per-year sequence ("R-2026-0001");
 * `status` is "draft" | "issued" | "paid"; VAT is INCLUDED in prices, so
 * `subtotal + vatAmount === total`. The PDF bytes are never in this DTO — stream
 * them via `invoicePdfPath(id)`.
 */
export interface Invoice {
  id: string;
  number: string;
  bookingId?: string | null;
  rentalId?: string | null;
  rentalExtensionId?: string | null;
  billingPeriodId?: string | null;
  kind: "booking" | "rentalExtension" | "recurringBilling" | "manual" | string;
  locale: string;
  customerName: string;
  customerEmail: string;
  /** ISO date `yyyy-MM-dd`. */
  issueDate: string;
  dueDate?: string | null;
  serviceStartDate?: string | null;
  serviceEndDateExclusive?: string | null;
  lines: InvoiceLine[];
  subtotal: number;
  vatRatePercent: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: string;
  paidAt?: string | null;
  voidedAt?: string | null;
  notes?: string | null;
  hasPdf: boolean;
  createdAt: string;
}

/** Free-form line-item input for manual invoice creation. */
export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Create-invoice request: EITHER `bookingId` (the backend prefills the customer
 * and line items mirroring the booking's first payment) OR the free-form
 * `customerName` / `customerEmail` / `lineItems`.
 */
export interface CreateInvoiceInput {
  bookingId?: string;
  customerName?: string;
  customerEmail?: string;
  lineItems?: InvoiceLineInput[];
  notes?: string;
  locale?: string;
  /** Whole calendar days from issue date to due date (0 means due today). */
  paymentTermDays?: number;
}

export interface ManualInvoicePaymentInput {
  amount: number;
  currency: string;
  providerReference: string;
}

export interface ManualInvoicePaymentResult {
  paymentId: string;
  invoiceId: string;
  idempotent: boolean;
  status: "paid";
}

/** This-month vs all-time incomings / outgoings / net. All money is EUR. */
export interface BillingSummary {
  monthIncomings: number;
  monthOutgoings: number;
  monthNet: number;
  allIncomings: number;
  allOutgoings: number;
  allNet: number;
  currency: string;
}

/* ── Typed errors ──────────────────────────────────────────────────────── */

export class BillingApiError extends Error {
  readonly status: number;
  /** True for HTTP 401 — the token is missing or wrong. */
  readonly unauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BillingApiError";
    this.status = status;
    this.unauthorized = status === 401;
  }
}

/** Thrown when NEXT_PUBLIC_API_BASE_URL is not configured. */
export class BillingConfigError extends Error {
  constructor() {
    super("Set NEXT_PUBLIC_API_BASE_URL to use admin");
    this.name = "BillingConfigError";
  }
}

/** Thrown when no admin JWT is present in this browser. */
export class BillingAuthError extends Error {
  constructor() {
    super("Sign in on the admin home to manage billing.");
    this.name = "BillingAuthError";
  }
}

/* ── Core fetch helper ─────────────────────────────────────────────────── */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // `body` may be a JSON string or FormData; never set Content-Type for the
  // latter — the browser adds the multipart boundary itself.
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new BillingApiError("Could not reach the admin API. Check your connection.", 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new BillingApiError("Your session has expired. Sign in again.", 401);
    // Show ONLY the server-supplied error message when present (e.g. 400/404
    // bodies), otherwise a friendly generic — never the raw "Request failed"
    // prefix. The proxy flags an unconfigured backend with { notConfigured }.
    let detail = "";
    let notConfigured = false;
    try {
      const data = (await res.json()) as { error?: string; notConfigured?: boolean };
      if (data?.notConfigured) notConfigured = true;
      if (data?.error) detail = data.error;
    } catch {
      /* non-JSON body — ignore. */
    }
    if (notConfigured) throw new BillingConfigError();
    throw new BillingApiError(
      detail || `Something went wrong (${res.status}). Try again.`,
      res.status,
    );
  }

  // 204 / empty body tolerance.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Public surface ────────────────────────────────────────────────────── */

/** Lists all expenses, newest first. */
export const listExpenses = () => request<Expense[]>("/api/admin/expenses");

/** Creates a new expense; returns the created expense. */
export const createExpense = (input: CreateExpenseInput) =>
  request<Expense>("/api/admin/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** Deletes an expense by id. */
export const deleteExpense = (id: string) =>
  request<void>(`/api/admin/expenses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

/**
 * Uploads (or replaces) an expense's invoice/receipt. Sent as multipart/form-data
 * with the file under the field name `file`. Returns the updated expense (with
 * `hasInvoice` now true), so the page can refresh the download link.
 */
export const uploadExpenseInvoice = (id: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<Expense>(`/api/admin/expenses/${encodeURIComponent(id)}/invoice`, {
    method: "POST",
    body: form,
  });
};

/**
 * Same-origin proxy path for downloading an expense's stored invoice. The proxy
 * attaches the admin JWT, so this is safe to use directly as an <a href> / to open
 * in a new tab. Only meaningful when the expense's `hasInvoice` is true.
 */
export const expenseInvoicePath = (id: string) =>
  `/api/admin/expenses/${encodeURIComponent(id)}/invoice`;

/** Fetches the billing summary (this-month vs all-time totals). */
export const getSummary = () => request<BillingSummary>("/api/admin/billing/summary");

/* ── Invoices ──────────────────────────────────────────────────────────── */

/** Lists all generated invoices, newest first (no PDF bytes). */
export const listInvoices = () => request<Invoice[]>("/api/admin/invoices");

/**
 * Creates + issues an invoice (numbered and with its PDF generated immediately).
 * Pass `{ bookingId }` for a booking-prefilled invoice, or the free-form
 * customer + line items for a manual one.
 */
export const createInvoice = (input: CreateInvoiceInput) =>
  request<Invoice>("/api/admin/invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });

/**
 * Same-origin proxy path for the invoice's generated PDF. The proxy attaches the
 * admin JWT, so this is safe to use directly as an <a href> / to open in a new
 * tab. Only meaningful when the invoice's `hasPdf` is true.
 */
export const invoicePdfPath = (id: string) =>
  `/api/admin/invoices/${encodeURIComponent(id)}/pdf`;

/** Marks an invoice as paid; returns the updated invoice. */
export const markInvoicePaid = (id: string) =>
  request<Invoice>(`/api/admin/invoices/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "paid" }),
  });

/** Confirms a bank transfer and lets the backend activate linked extension billing. */
export const confirmManualInvoicePayment = (
  id: string,
  input: ManualInvoicePaymentInput,
) =>
  request<ManualInvoicePaymentResult>(
    `/api/admin/invoices/${encodeURIComponent(id)}/payments/manual-confirmation`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

/** Deletes an invoice (e.g. a mistake or one orphaned by a deleted booking). */
export const deleteInvoice = (id: string) =>
  request<void>(`/api/admin/invoices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
