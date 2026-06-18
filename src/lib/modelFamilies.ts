/**
 * Group colour variants of the same bike into one card.
 *
 * Product decision: each colour is its OWN model record. Variants of the same
 * physical bike share a non-empty `family` key and should render as colour
 * swatches on a single card. Models without a family are singletons, rendered
 * exactly as before.
 *
 * `groupByFamily` is pure (no I/O, no mutation of its input) so it can run on
 * the server (list pages) or the client (booking wizard) interchangeably.
 */
import type { BikeModel } from "@/types";

/** A card's worth of models: either one singleton or several colour variants. */
export interface ModelGroup {
  /** The shared family key, or null for a singleton group. */
  family: string | null;
  /** Variants in input order (callers should pre-sort by sortOrder). */
  variants: BikeModel[];
}

/** A family key counts as "set" only when it's a non-empty, non-blank string. */
function familyKey(m: BikeModel): string | null {
  const f = m.family;
  if (typeof f !== "string") return null;
  const trimmed = f.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Collapse colour variants into groups while preserving overall ordering.
 *
 * - Models sharing a non-empty `family` are gathered into one group, in the
 *   order they appear in `models` (so callers control variant order by ordering
 *   the array, e.g. by sortOrder).
 * - Each grouped family appears once, at the position of its FIRST variant — so
 *   the surrounding singletons keep their relative order.
 * - Models with a null/empty `family` are each their own singleton group.
 *
 * With all-null families (the current data), every model becomes its own
 * singleton group → the list surfaces render exactly as before.
 */
export function groupByFamily(models: BikeModel[]): ModelGroup[] {
  const groups: ModelGroup[] = [];
  // family key → index into `groups`, so later variants append to the group
  // anchored at the first variant's position.
  const indexByFamily = new Map<string, number>();

  for (const m of models) {
    const key = familyKey(m);
    if (key === null) {
      groups.push({ family: null, variants: [m] });
      continue;
    }
    const existing = indexByFamily.get(key);
    if (existing === undefined) {
      indexByFamily.set(key, groups.length);
      groups.push({ family: key, variants: [m] });
    } else {
      groups[existing].variants.push(m);
    }
  }

  return groups;
}
