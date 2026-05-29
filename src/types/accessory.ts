/** Accessory add-on types. */

export interface Accessory {
  id: string;
  name: string;
  /** Display price, e.g. "€29 / 30d". */
  price: string;
  /** Icon key (see components/ui/Icon). */
  icon: string;
  /** Optional: model ids this accessory is compatible with (admin/backend). */
  compatibleModelIds?: string[];
}
