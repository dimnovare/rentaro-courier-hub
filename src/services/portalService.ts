import { API_BASE } from "./api";
import type { IdentityStatus } from "./identityService";

/**
 * Customer self-service portal ("Manage your rental"). Access is via a signed
 * magic-link token emailed to the customer — there are no accounts. All calls
 * hit the token-gated .NET endpoints under `/api/portal/*`.
 */

/** The customer's booking + (once a bike is assigned) rental, for the portal card. */
export interface PortalRental {
  reference: string;
  customerFirstName: string;
  status: string;
  hasRental: boolean;
  cityName: string;
  modelName: string;
  planTerm: string;
  startDate?: string | null;
  plannedEndDate?: string | null;
  unitCode?: string | null;
  pickup?: string | null;
  /**
   * Where this booking sits in the (post-approval) payment flow:
   * - `paid` — the first 30-day period + deposit are settled
   * - `pending` / `pending_manual` — payment is due (online or arranged at pickup)
   * - `null` — not payable yet (e.g. not approved / no contract accepted)
   */
  paymentStatus?: "paid" | "pending" | "pending_manual" | null;
  /** The booking id, used to start a payment via `POST /api/payments/booking/{id}`. */
  bookingId?: string | null;
  /**
   * Identity verification status included by the backend in the portal rental
   * response. Used to determine the initial state of the IdentityCard.
   * - `none` — no attempt yet
   * - `pending` — a session was started but not yet resolved
   * - `verified` — identity confirmed
   * - `failed` — last attempt failed; customer should retry
   */
  identityStatus?: IdentityStatus | null;
  /** Full name as returned by the identity provider (present when identityStatus === "verified"). */
  identityVerifiedName?: string | null;
  planMonths?: number | null;
  monthly?: number | null;
  preferredLocale?: string;
  extensionEligibility?: PortalExtensionEligibility;
  extensionOptions?: PortalExtensionOption[];
  currentExtension?: PortalExtensionSummary | null;
  billingSchedule?: PortalBillingPeriodSummary[];
  invoices?: PortalInvoiceSummary[];
  accessoryPackage?: PortalAccessoryPackage | null;
  accessories?: PortalAccessoryUnit[];
}

export interface PortalAccessoryPackage {
  code: string;
  name: string;
  recurringPrice: number;
  refundableDeposit: number;
  depositEnabled: boolean;
}

/** Customer-safe assigned-equipment details; internal notes and cost are absent. */
export interface PortalAccessoryUnit {
  componentCode: string;
  name: string;
  assetCode: string;
  serialNumber: string | null;
  condition: string;
  depositStatus: string;
}

export interface PortalExtensionEligibility {
  eligible: boolean;
  code?: string | null;
  message?: string | null;
}

/** Customer-facing shape adapted from the backend's authoritative quote. */
export interface PortalExtensionOption {
  optionCode: string;
  termMonths: number;
  termLabel?: string;
  billingPeriodCount: number;
  dailyPrice?: number;
  baseAmountPerPeriod?: number;
  accessoryAmountPerPeriod?: number;
  amountPerPeriod: number;
  totalCommitment: number;
  currency: string;
  proposedPlannedEndDate: string;
  firstServiceStartDate: string;
  firstServiceEndDate: string;
}

export interface PortalBankTransfer {
  accountName: string;
  bankName: string;
  iban: string;
  reference: string;
}

export interface PortalExtensionSummary {
  id: string;
  status: string;
  optionCode: string;
  termMonths: number;
  billingPeriodCount: number;
  previousPlannedEndDate: string;
  proposedPlannedEndDate: string;
  amountPerPeriod: number;
  totalCommitment: number;
  currency: string;
  locale?: string;
  source?: string;
  requestedAt?: string;
  activatedAt?: string | null;
  cancelledAt?: string | null;
  nextInvoiceDate?: string;
  bankTransfer?: PortalBankTransfer;
}

export interface PortalInvoiceLineSummary {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PortalInvoiceSummary {
  id: string;
  number: string;
  kind?: string;
  rentalExtensionId?: string | null;
  status: string;
  locale: string;
  issueDate: string;
  dueDate?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  serviceEndDateExclusive?: string | null;
  lines?: PortalInvoiceLineSummary[];
  subtotal?: number;
  vatRatePercent?: number;
  vatAmount?: number;
  total: number;
  currency: string;
  hasPdf: boolean;
  bankIban?: string;
  bankAccountName?: string;
  bankName?: string;
  paymentReference?: string;
  createdAt?: string;
}

export interface PortalBillingPeriodSummary {
  id: string;
  sequenceNumber: number;
  serviceStartDate: string;
  serviceEndDate: string;
  serviceEndDateExclusive?: string;
  invoiceIssueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: string;
  invoice: PortalInvoiceSummary | null;
}

export interface PortalExtensionState {
  preferredLocale: string;
  extensionEligibility: PortalExtensionEligibility;
  extensionOptions: PortalExtensionOption[];
  currentExtension: PortalExtensionSummary | null;
  billingSchedule: PortalBillingPeriodSummary[];
  invoices: PortalInvoiceSummary[];
}

export type PortalExtensionMutation = PortalExtensionState | {
  extension: PortalExtensionSummary | null;
  invoice: PortalInvoiceSummary | null;
};

/** Acknowledgement returned by the portal write endpoints. */
export interface PortalAck {
  ok: boolean;
  message: string;
}

export type PortalResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "invalid" } // bad/expired token (401) — or no token at all
  | { kind: "no_api" } // API base not configured (preview)
  | { kind: "error" }; // network / unexpected failure

export type PortalMutationResult<T> = PortalResult<T> | {
  kind: "conflict";
  code: string;
  message: string;
};

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/**
 * Abort a portal fetch after this long. Without it a cold/stalled API (e.g. a
 * Railway cold start) leaves the request pending forever, stranding the portal
 * on its "loading" state with no error and no recovery. On timeout the fetch
 * rejects, we return `{ kind: "error" }`, and the caller can retry.
 */
const PORTAL_TIMEOUT_MS = 12_000;

/** Fetch the rental tied to a magic-link token. */
export async function getRental(token: string): Promise<PortalResult<PortalRental>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/rental?token=${encodeURIComponent(token)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
      },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) throw new Error(`portal rental → ${res.status}`);
    return { kind: "ok", data: normalizeRental(await res.json()) };
  } catch (err) {
    console.error("[rentaro] portal getRental failed.", err);
    return { kind: "error" };
  }
}

/** A referral reward earned by or for this customer. */
export interface PortalReward {
  id: string;
  role: "referrer" | "referred";
  rewardType: string;
  daysAwarded?: number | null;
  monetaryAmount?: number | null;
  description?: string | null;
  status: "pending" | "applied" | "waived";
  appliedAt?: string | null;
  createdAt: string;
}

/** Fetch all referral rewards tied to the customer's portal token. */
export async function getRewards(token: string): Promise<PortalResult<PortalReward[]>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/rewards?token=${encodeURIComponent(token)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
      },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) throw new Error(`portal rewards → ${res.status}`);
    return { kind: "ok", data: (await res.json()) as PortalReward[] };
  } catch (err) {
    console.error("[rentaro] portal getRewards failed.", err);
    return { kind: "error" };
  }
}

/** Raise a repair request against the customer's bike. */
export async function requestRepair(
  token: string,
  body: { issueType: string; description: string },
): Promise<PortalResult<PortalAck>> {
  return post(token, "/api/portal/repair", body);
}

/** Send a free-text support message to the rentaro team. */
export async function contactSupport(
  token: string,
  message: string,
): Promise<PortalResult<PortalAck>> {
  return post(token, "/api/portal/support", { message });
}

export async function requestExtension(
  token: string,
  body: { optionCode: string; expectedPlannedEndDate: string; consent: boolean },
  idempotencyKey: string,
): Promise<PortalMutationResult<PortalExtensionMutation>> {
  return extensionMutation(token, "/api/portal/rental/extensions", {
    body,
    idempotencyKey,
  });
}

export async function cancelExtension(
  token: string,
  extensionId: string,
): Promise<PortalMutationResult<PortalExtensionMutation>> {
  return extensionMutation(
    token,
    `/api/portal/rental/extensions/${encodeURIComponent(extensionId)}/cancel`,
  );
}

export async function listInvoices(
  token: string,
): Promise<PortalResult<PortalInvoiceSummary[]>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(
      `${API_BASE}/api/portal/invoices?token=${encodeURIComponent(token)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
      },
    );
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) throw new Error(`portal invoices -> ${res.status}`);
    const data = await res.json() as unknown[];
    return { kind: "ok", data: data.map(normalizeInvoice) };
  } catch (err) {
    console.error("[rentaro] portal listInvoices failed.", err);
    return { kind: "error" };
  }
}

/** Same-origin proxy keeps the signed token out of cross-origin download flows. */
export function portalInvoicePdfUrl(invoiceId: string, token: string): string {
  return `/api/portal/invoices/${encodeURIComponent(invoiceId)}/pdf?token=${encodeURIComponent(token)}`;
}

async function extensionMutation(
  token: string,
  path: string,
  options: { body?: unknown; idempotencyKey?: string } = {},
): Promise<PortalMutationResult<PortalExtensionMutation>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  try {
    const res = await fetch(`${API_BASE}${path}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
    });
    if (res.status === 401) return { kind: "invalid" };
    if (res.status === 409) {
      const problem = await readProblem(res);
      return { kind: "conflict", code: problem.code, message: problem.message };
    }
    if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
    return { kind: "ok", data: normalizeExtensionState(await res.json()) };
  } catch (err) {
    console.error(`[rentaro] portal POST ${path} failed.`, err);
    return { kind: "error" };
  }
}

async function readProblem(res: Response): Promise<{ code: string; message: string }> {
  try {
    const body = await res.json() as { code?: string; error?: string };
    return {
      code: body.code ?? "extension_conflict",
      message: body.error ?? "The rental changed. Reload and try again.",
    };
  } catch {
    return { code: "extension_conflict", message: "The rental changed. Reload and try again." };
  }
}

type RawRecord = Record<string, unknown>;

function normalizeRental(value: unknown): PortalRental {
  const raw = value as PortalRental & RawRecord;
  const state = normalizeExtensionState(raw);
  const packageRaw = isRecord(raw.accessoryPackage) ? raw.accessoryPackage : null;
  const accessoryPackage = packageRaw
    ? {
        code: String(packageRaw.code ?? ""),
        name: String(packageRaw.name ?? ""),
        recurringPrice: numberValue(packageRaw.recurringPrice),
        refundableDeposit: numberValue(packageRaw.refundableDeposit),
        depositEnabled: packageRaw.depositEnabled === true,
      }
    : null;
  const accessories = Array.isArray(raw.accessories)
    ? raw.accessories.filter(isRecord).map((item) => ({
        componentCode: String(item.componentCode ?? ""),
        name: String(item.name ?? ""),
        assetCode: String(item.assetCode ?? ""),
        serialNumber: stringOrNull(item.serialNumber),
        condition: String(item.condition ?? ""),
        depositStatus: String(item.depositStatus ?? ""),
      }))
    : [];
  return { ...raw, accessoryPackage, accessories, ...state };
}

function normalizeExtensionState(value: unknown): PortalExtensionState {
  const raw = value as RawRecord;
  const rawInvoices = Array.isArray(raw.invoices) ? raw.invoices : [];
  const invoices = rawInvoices.map(normalizeInvoice);
  const rawOptions = Array.isArray(raw.extensionOptions) ? raw.extensionOptions : [];
  const extensionOptions = rawOptions.map(normalizeExtensionOption);
  const currentRaw = isRecord(raw.currentExtension) ? raw.currentExtension : null;
  const currentOption = currentRaw
    ? extensionOptions.find((option) => option.optionCode === String(currentRaw.optionCode ?? ""))
    : undefined;
  const openInvoice = currentRaw
    ? invoices.find((invoice) =>
        invoice.rentalExtensionId === String(currentRaw.id ?? "") &&
        invoice.kind === "rentalExtension" &&
        !["paid", "void", "voided", "cancelled"].includes(invoice.status),
      )
    : undefined;
  const rawSchedule = Array.isArray(raw.billingSchedule) ? raw.billingSchedule : [];
  const billingSchedule = rawSchedule.map((entry) => normalizeBillingPeriod(entry, invoices));
  const nextPeriod = billingSchedule.find((period) => period.status === "scheduled");

  return {
    preferredLocale: typeof raw.preferredLocale === "string" ? raw.preferredLocale : "en",
    extensionEligibility: isRecord(raw.extensionEligibility)
      ? {
          eligible: raw.extensionEligibility.eligible === true,
          code: stringOrNull(raw.extensionEligibility.code),
          message: stringOrNull(raw.extensionEligibility.message),
        }
      : { eligible: false },
    extensionOptions,
    currentExtension: currentRaw
      ? {
          id: String(currentRaw.id ?? ""),
          status: String(currentRaw.status ?? ""),
          optionCode: String(currentRaw.optionCode ?? ""),
          termMonths: currentOption?.termMonths ?? numberValue(currentRaw.billingPeriodCount),
          billingPeriodCount: numberValue(currentRaw.billingPeriodCount),
          previousPlannedEndDate: String(currentRaw.previousPlannedEndDate ?? ""),
          proposedPlannedEndDate: String(currentRaw.proposedPlannedEndDate ?? ""),
          amountPerPeriod: numberValue(currentRaw.totalAmountPerPeriod),
          totalCommitment: numberValue(currentRaw.totalCommitmentAmount),
          currency: String(currentRaw.currency ?? "EUR"),
          locale: stringOrUndefined(currentRaw.locale),
          source: stringOrUndefined(currentRaw.source),
          requestedAt: stringOrUndefined(currentRaw.requestedAt),
          activatedAt: stringOrNull(currentRaw.activatedAt),
          cancelledAt: stringOrNull(currentRaw.cancelledAt),
          nextInvoiceDate: nextPeriod?.invoiceIssueDate,
          bankTransfer: openInvoice ? invoiceBankTransfer(openInvoice) : undefined,
        }
      : null,
    billingSchedule,
    invoices,
  };
}

function normalizeExtensionOption(value: unknown): PortalExtensionOption {
  const raw = value as RawRecord;
  return {
    optionCode: String(raw.optionCode ?? ""),
    termMonths: numberValue(raw.commitmentMonths ?? raw.termMonths),
    termLabel: stringOrUndefined(raw.term),
    billingPeriodCount: numberValue(raw.billingPeriodCount),
    dailyPrice: numberOrUndefined(raw.dailyPrice),
    baseAmountPerPeriod: numberOrUndefined(raw.baseAmountPerPeriod),
    accessoryAmountPerPeriod: numberOrUndefined(raw.accessoryAmountPerPeriod),
    amountPerPeriod: numberValue(raw.totalAmountPerPeriod ?? raw.amountPerPeriod),
    totalCommitment: numberValue(raw.totalCommitmentAmount ?? raw.totalCommitment),
    currency: String(raw.currency ?? "EUR"),
    proposedPlannedEndDate: String(raw.proposedPlannedEndDate ?? ""),
    firstServiceStartDate: String(raw.serviceStartDate ?? raw.firstServiceStartDate ?? ""),
    firstServiceEndDate: String(raw.serviceEndDateInclusive ?? raw.firstServiceEndDate ?? ""),
  };
}

function normalizeInvoice(value: unknown): PortalInvoiceSummary {
  const raw = value as RawRecord;
  return {
    id: String(raw.id ?? ""),
    number: String(raw.number ?? ""),
    kind: stringOrUndefined(raw.kind),
    rentalExtensionId: stringOrNull(raw.rentalExtensionId),
    status: String(raw.status ?? ""),
    locale: String(raw.locale ?? "en"),
    issueDate: String(raw.issueDate ?? ""),
    dueDate: stringOrNull(raw.dueDate),
    serviceStartDate: stringOrNull(raw.serviceStartDate),
    serviceEndDate: stringOrNull(raw.serviceEndDate),
    serviceEndDateExclusive: stringOrNull(raw.serviceEndDateExclusive),
    lines: Array.isArray(raw.lines)
      ? raw.lines.map((line) => {
          const item = line as RawRecord;
          return {
            description: String(item.description ?? ""),
            quantity: numberValue(item.quantity),
            unitPrice: numberValue(item.unitPrice),
            total: numberValue(item.total),
          };
        })
      : undefined,
    subtotal: numberOrUndefined(raw.subtotal),
    vatRatePercent: numberOrUndefined(raw.vatRatePercent),
    vatAmount: numberOrUndefined(raw.vatAmount),
    total: numberValue(raw.total),
    currency: String(raw.currency ?? "EUR"),
    hasPdf: raw.hasPdf === true,
    bankIban: stringOrUndefined(raw.bankIban),
    bankAccountName: stringOrUndefined(raw.bankAccountName),
    bankName: stringOrUndefined(raw.bankName),
    paymentReference: stringOrUndefined(raw.paymentReference),
    createdAt: stringOrUndefined(raw.createdAt),
  };
}

function normalizeBillingPeriod(
  value: unknown,
  invoices: PortalInvoiceSummary[],
): PortalBillingPeriodSummary {
  const raw = value as RawRecord;
  const invoiceId = stringOrUndefined(raw.invoiceId);
  return {
    id: String(raw.id ?? ""),
    sequenceNumber: numberValue(raw.sequenceNumber),
    serviceStartDate: String(raw.serviceStartDate ?? ""),
    serviceEndDate: String(raw.serviceEndDateInclusive ?? raw.serviceEndDate ?? ""),
    serviceEndDateExclusive: stringOrUndefined(raw.serviceEndDateExclusive),
    invoiceIssueDate: String(raw.invoiceIssueOn ?? raw.invoiceIssueDate ?? ""),
    dueDate: String(raw.dueDate ?? ""),
    amount: numberValue(raw.total ?? raw.amount),
    currency: String(raw.currency ?? "EUR"),
    status: String(raw.status ?? ""),
    invoice: invoiceId ? invoices.find((invoice) => invoice.id === invoiceId) ?? null : null,
  };
}

function invoiceBankTransfer(invoice: PortalInvoiceSummary): PortalBankTransfer | undefined {
  if (!invoice.bankIban || !invoice.paymentReference) return undefined;
  return {
    accountName: invoice.bankAccountName ?? "rentaro",
    bankName: invoice.bankName ?? "",
    iban: invoice.bankIban,
    reference: invoice.paymentReference,
  };
}

function isRecord(value: unknown): value is RawRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function numberOrUndefined(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : numberValue(value);
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function post<T>(
  token: string,
  path: string,
  body: unknown,
): Promise<PortalResult<T>> {
  if (!API_BASE) return { kind: "no_api" };
  if (!token.trim()) return { kind: "invalid" };

  try {
    const res = await fetch(`${API_BASE}${path}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
    });
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return { kind: "ok", data: (await res.json()) as T };
  } catch (err) {
    console.error(`[rentaro] portal POST ${path} failed.`, err);
    return { kind: "error" };
  }
}
