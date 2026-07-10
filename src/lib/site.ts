export const PRODUCTION_SITE_URL = "https://rentaro.ee";

export const SITE_TITLE = "rentaro — Delivery-ready e-bikes by the month";

export const SITE_DESCRIPTION =
  "Rent a delivery-built e-bike by the month in Tallinn, Riga and Helsinki. 30-day, 6 and 12-month plans with service support and charger included; paid add-ons are available for courier work.";

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || PRODUCTION_SITE_URL).replace(/\/$/, "");
}
