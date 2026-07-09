/**
 * Admin-controlled feature flags + bank requisites. One canonical definition,
 * re-exported by both the public read client (settingsService) and the admin
 * read/write client (adminSettingsService) so the shape can never drift.
 *
 * Matches the backend settings DTO (GET/PUT under /api/.../settings) exactly,
 * camelCase.
 */
export interface SiteSettings {
  showAccessories: boolean;
  showReferralCode: boolean;
  showAddGear: boolean;
  showReferAcourier: boolean;
  showPayConfirm: boolean;
  showOnlineSigning: boolean;
  /** Auto-send return reminders from the background scanner (default ON). */
  autoSendReturnReminders: boolean;
  /**
   * Flat one-time fee (EUR) added to the customer's first payment when they choose
   * delivery instead of free pickup at booking time. 0 (default) = delivery is free.
   */
  deliveryFee: number;
  bankIban: string;
  bankAccountName: string;
  bankName: string;
  bankReference: string;
  /**
   * Company requisites printed on generated invoices. ADMIN-ONLY on the wire: the
   * public GET omits them, so the public client falls back to the safe defaults.
   */
  companyName: string;
  companyRegCode: string;
  companyVatNumber: string;
  companyAddress: string;
  /** VAT rate (%) applied to invoices. Prices are gross — VAT is included. */
  vatRatePercent: number;
  /** Auto-create + issue an invoice when a payment is confirmed (default OFF). */
  autoCreateInvoices: boolean;
}
