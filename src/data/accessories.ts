import type { Accessory } from "@/types";

/**
 * SOURCE: /api/public/accessories — this static fallback mirrors the PRODUCTION
 * catalogue exactly (verified against https://api.rentaro.ee/api/public/accessories
 * on 2026-07-10). Keep it in lockstep: when the API is down the booking wizard
 * offers THESE items at THESE prices, so any drift offers phantom add-ons or
 * under-quotes real ones (the old 8-item list priced the extra battery €29 vs
 * the real €60).
 */
// Tiers are null so each item falls back to parsing its legacy `price` string
// (the resolver's backward-compatible path), and no bundles are invented here —
// admin-managed tiered prices and bundles arrive from the live API.
export const accessories: Accessory[] = [
  {
    id: "battery",
    name: "Extra battery",
    nameLocalized: {},
    descriptionLocalized: {},
    price: "€60 / 30d",
    price30: null,
    price6mo: null,
    price12mo: null,
    icon: "battery",
    isBundle: false,
    componentIds: [],
  },
  {
    id: "phone",
    name: "Phone holder",
    nameLocalized: {},
    descriptionLocalized: {},
    price: "€15 / 30d",
    price30: null,
    price6mo: null,
    price12mo: null,
    icon: "phone",
    isBundle: false,
    componentIds: [],
  },
  {
    id: "lock",
    name: "Heavy-duty lock",
    nameLocalized: {},
    descriptionLocalized: {},
    price: "€15 / 30d",
    price30: null,
    price6mo: null,
    price12mo: null,
    icon: "lock",
    isBundle: false,
    componentIds: [],
  },
];
