import type { Accessory } from "@/types";

/**
 * SOURCE: /api/public/accessories — this static fallback mirrors the PRODUCTION
 * catalogue exactly (verified against https://api.rentaro.ee/api/public/accessories
 * on 2026-07-10). Keep it in lockstep: when the API is down the booking wizard
 * offers THESE items at THESE prices, so any drift offers phantom add-ons or
 * under-quotes real ones (the old 8-item list priced the extra battery €29 vs
 * the real €60).
 */
export const accessories: Accessory[] = [
  { id: "battery", name: "Extra battery", price: "€60 / 30d", icon: "battery" },
  { id: "phone", name: "Phone holder", price: "€15 / 30d", icon: "phone" },
  { id: "lock", name: "Heavy-duty lock", price: "€15 / 30d", icon: "lock" },
];
