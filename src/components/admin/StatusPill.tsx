/** Small status/priority chip, coloured by a coarse intent. Presentational. */

export type PillTone = "good" | "warn" | "bad" | "info" | "neutral";

const TONE: Record<PillTone, { fg: string; bg: string; bd: string }> = {
  good: { fg: "var(--lime)", bg: "rgba(216, 255, 54, 0.12)", bd: "rgba(216, 255, 54, 0.3)" },
  warn: { fg: "var(--warn)", bg: "rgba(255, 198, 90, 0.12)", bd: "rgba(255, 198, 90, 0.3)" },
  bad: { fg: "var(--danger)", bg: "rgba(255, 138, 120, 0.12)", bd: "rgba(255, 138, 120, 0.32)" },
  info: { fg: "var(--blue)", bg: "rgba(111, 180, 255, 0.12)", bd: "rgba(111, 180, 255, 0.32)" },
  neutral: { fg: "var(--text-2)", bg: "var(--surface)", bd: "var(--border)" },
};

/**
 * Display labels for every known wire status. The backend serializes enum
 * names lower-cased with no separators ("bikeassigned", "awaitingreview"),
 * which reads terribly in the UI; this map restores the spaces. Keys are the
 * lowercase wire values — lookups lower-case the input, so the contract
 * endpoint's PascalCase SignatureStatus ("SentForSignature") also matches.
 *
 * Sources of truth: Rentaro.Domain/Enums.cs (BookingStatus, RentalStatus,
 * BikeUnitStatus, MaintenanceStatus/Priority/IssueType, SignatureStatus,
 * PaymentStatus, InvoicePaymentStatus, RentalExtensionStatus,
 * RentalBillingPeriodStatus, SupportTicketStatus) + invoice/identity statuses
 * used by the admin/portal services.
 */
export const STATUS_LABELS: Record<string, string> = {
  // Booking (BookingStatus)
  submitted: "Submitted",
  awaitingreview: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  paymentpending: "Payment pending",
  bikeassigned: "Bike assigned",
  signaturepending: "Signature pending",
  active: "Active",
  completed: "Completed",
  // Rental (RentalStatus + legacy/plan extras seen in older data)
  endingsoon: "Ending soon",
  returnscheduled: "Return scheduled",
  extended: "Extended",
  returned: "Returned",
  closed: "Closed",
  overdue: "Overdue",
  inspectionpending: "Inspection pending",
  defaulted: "Defaulted",
  // Bike unit (BikeUnitStatus)
  incoming: "Incoming",
  available: "Available",
  reserved: "Reserved",
  assigned: "Assigned",
  rented: "Rented",
  returningsoon: "Returning soon",
  maintenance: "Maintenance",
  damaged: "Damaged",
  stolen: "Stolen",
  lost: "Lost",
  retired: "Retired",
  // Accessory condition / custody / deposit
  new: "New",
  good: "Good",
  worn: "Worn",
  handedover: "Handed over",
  missing: "Missing",
  retained: "Retained",
  notrequired: "Not required",
  due: "Due",
  collected: "Collected",
  partially_retained: "Partially retained",
  // Maintenance status / priority / issue type
  open: "Open",
  inprogress: "In progress",
  in_progress: "In progress",
  resolved: "Resolved",
  low: "Low",
  medium: "Medium",
  high: "High",
  puncture: "Puncture",
  brakes: "Brakes",
  battery: "Battery",
  motor: "Motor",
  lock: "Lock",
  charger: "Charger",
  generalservice: "General service",
  inspection: "Inspection",
  accident: "Accident",
  // Contract signature (SignatureStatus — arrives PascalCase, lower-cased here)
  notstarted: "Not started",
  generated: "Generated",
  sentforsignature: "Sent for signature",
  senttosigning: "Sent to signing",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  expired: "Expired",
  failed: "Failed",
  // Invoices / payments / billing periods / extensions
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  void: "Void",
  voided: "Voided",
  uncollectible: "Uncollectible",
  pending: "Pending",
  pendingmanual: "Pending manual",
  pending_manual: "Pending manual",
  refunded: "Refunded",
  manualreview: "Manual review",
  awaitingpayment: "Awaiting payment",
  scheduled: "Scheduled",
  invoiced: "Invoiced",
  // Identity / misc
  verified: "Verified",
  none: "None",
};

/** Display label for a wire status: mapped when known, otherwise the raw value
 *  with underscores spaced out (the pill's former fallback behaviour — the
 *  pill's CSS upper-cases it either way). Exported for non-pill uses too. */
export function statusLabel(value: string): string {
  return STATUS_LABELS[value.toLowerCase()] ?? value.replace(/_/g, " ");
}

/**
 * Map a raw status/priority string to a tone using word-bounded keyword
 * buckets. Runs on the DISPLAY label, so squashed wire values regain their
 * word boundaries ("paymentpending" → "payment pending" → warn) — and \b on
 * both sides means "inactive" no longer matches "active".
 */
export function toneFor(value: string): PillTone {
  const v = statusLabel(value).toLowerCase();
  // Checked before the good bucket, whose standalone "in" would otherwise
  // swallow "in progress".
  if (/\b(?:inprogress|in[ _]progress)\b/.test(v)) return "warn";
  if (/\b(?:active|approved|available|completed|resolved|closed|done|in|new|good|collected|refunded)\b/.test(v)) return "good";
  if (
    /\b(?:pending|awaiting|review|submitted|reserved|low|limited|scheduled|medium|returning|open|waitlist|wait|due|worn)\b/.test(
      v,
    )
  )
    return "warn";
  if (
    /\b(?:rejected|cancelled|canceled|damaged|stolen|lost|missing|retained|overdue|defaulted|failed|urgent|high|maintenance|retired)\b/.test(
      v,
    )
  )
    return "bad";
  return "neutral";
}

export function StatusPill({ value, tone }: { value: string; tone?: PillTone }) {
  const t = TONE[tone ?? toneFor(value)];
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "4px 9px",
        borderRadius: "var(--r-full)",
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {statusLabel(value)}
    </span>
  );
}
