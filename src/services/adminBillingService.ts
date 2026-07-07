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
    // Surface a server-supplied error message when present (e.g. 400/404 bodies);
    // the proxy flags an unconfigured backend with { notConfigured: true }.
    let detail = "";
    let notConfigured = false;
    try {
      const data = (await res.json()) as { error?: string; notConfigured?: boolean };
      if (data?.notConfigured) notConfigured = true;
      if (data?.error) detail = `: ${data.error}`;
    } catch {
      /* non-JSON body — ignore. */
    }
    if (notConfigured) throw new BillingConfigError();
    throw new BillingApiError(`Request failed (${res.status})${detail}`, res.status);
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
