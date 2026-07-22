/** Public, server-authoritative accessory package quote contracts. */

export interface AccessoryOfferComponent {
  code: string;
  name: string;
}

export interface AccessoryOfferQuote {
  /** Null identifies the explicit Bike Only choice. */
  code: string | null;
  name: string;
  benefit: string;
  components: AccessoryOfferComponent[];
  /** Recurring amount per 30-day billing period for the requested plan. */
  recurringPrice: number;
  savingAmount: number;
  recommended: boolean;
  placement: "primary" | "secondary";
  available: boolean;
  unavailableComponent: string | null;
  /** One-time refundable deposit; null when the admin toggle is disabled. */
  extraBatteryDeposit: number | null;
}

export interface AccessoryOfferQuery {
  planId: string;
  cityId: string;
  locale: string;
}
