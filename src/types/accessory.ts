/** Accessory add-on types. Mirrors the backend AccessoryDto (camelCase). */

import type { ColorOption } from "./bike";

export interface Accessory {
  id: string;
  /** Base/EN-fallback name. Prefer nameLocalized[locale] ?? name for display. */
  name: string;
  /** Per-locale names (locale → name). May be {} — falls back to `name`. */
  nameLocalized: Record<string, string>;
  /** Base/EN-fallback description (optional). */
  description?: string | null;
  /** Per-locale descriptions (locale → description). May be {}. */
  descriptionLocalized: Record<string, string>;
  /**
   * Legacy display price, e.g. "€60 / 30d". Kept as the fallback the price
   * resolver parses when a plan tier below is null (backward-compatible).
   */
  price: string;
  /** €/30-day period on the p30 (30-day) plan; null = fall back to `price`. */
  price30: number | null;
  /** €/30-day period on the p180 (6-month) plan; null = fall back to `price`. */
  price6mo: number | null;
  /** €/30-day period on the p365 (12-month) plan; null = fall back to `price`. */
  price12mo: number | null;
  /** Icon key (see components/ui/Icon). */
  icon: string;
  /** True when this row is a display-only bundle of `componentIds`. */
  isBundle: boolean;
  /**
   * Accessory ids this bundle groups (display-only — NEVER summed; a bundle
   * charges its OWN resolved tier price). Empty for non-bundles.
   */
  componentIds: string[];
  /** Optional: model ids this accessory is compatible with (admin/backend). */
  compatibleModelIds?: string[];
  /** Available colours, shown as read-only swatches (name + hex dot). */
  colors?: ColorOption[];
  /** Optional display order (admin/backend). */
  sortOrder?: number;
}
