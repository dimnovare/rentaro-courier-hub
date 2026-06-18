/** Accessory add-on types. */

import type { ColorOption } from "./bike";

export interface Accessory {
  id: string;
  name: string;
  /** Display price, e.g. "€29 / 30d". */
  price: string;
  /** Icon key (see components/ui/Icon). */
  icon: string;
  /** Optional: model ids this accessory is compatible with (admin/backend). */
  compatibleModelIds?: string[];
  /** Available colours, shown as read-only swatches (name + hex dot). */
  colors?: ColorOption[];
}
