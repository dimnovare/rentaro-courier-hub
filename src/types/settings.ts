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
  bankIban: string;
  bankAccountName: string;
  bankName: string;
  bankReference: string;
}
