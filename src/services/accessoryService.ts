import { accessories } from "@/data/accessories";
import type { Accessory } from "@/types";
import { apiGet } from "./api";

export const accessoryService = {
  getAccessories: () =>
    apiGet<Accessory[]>("/api/public/accessories", accessories),
};

/**
 * Customer-facing accessory list rule: an accessory that is a COMPONENT of any
 * bundle is absorbed into that bundle — it stays in the catalogue (admin still
 * edits it, bundles resolve its name/price from the full array, historical
 * bookings keep charging it) but is hidden from the selectable lists the
 * customer sees (wizard add-gear, homepage accessories). Owner decision
 * 2026-07-17: showing both the kit and its parts reads as double-selling.
 */
export function customerVisibleAccessories(all: Accessory[]): Accessory[] {
  const bundled = new Set(all.filter((a) => a.isBundle).flatMap((a) => a.componentIds));
  return all.filter((a) => !bundled.has(a.id));
}
