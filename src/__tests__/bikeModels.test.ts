import { describe, expect, it } from "vitest";
import { bikeModels } from "@/data/bikeModels";

/**
 * Catalogue invariants (see CLAUDE.md):
 *  - four active models (matches the production fleet: engine-pro + 3 engwe-*);
 *  - per-model pricing is internally consistent — the headline fromDay/from30
 *    must equal the model's own cheapest tier (overrides included), so the
 *    fallback can never show a "from" price its own tiers don't back up;
 *  - NO fixed-km range promise in marketing pills (the range rule). Range may
 *    only live in the detailed spec block / spec tables, never a card pill.
 */
describe("bikeModels", () => {
  it("has four models", () => {
    expect(bikeModels).toHaveLength(4);
  });

  it("keeps each model's headline prices consistent with its own tiers", () => {
    // Mirrors the backend derivation: from30 is the model's 30-DAY-plan price
    // and fromDay the cheapest tier's daily rate (prod payload semantics).
    for (const model of bikeModels) {
      const tiers = [
        model.price30 ?? 177,
        model.price6mo ?? 147,
        model.price12mo ?? 117,
      ];
      expect(model.from30, model.id).toBe(tiers[0]);
      expect(model.fromDay, model.id).toBeCloseTo(
        Math.round((Math.min(...tiers) / 30) * 100) / 100,
        2,
      );
    }
  });

  it("never advertises a km range in marketing pills", () => {
    for (const model of bikeModels) {
      for (const pill of model.pills) {
        expect(pill.toLowerCase()).not.toContain("km");
      }
    }
  });

  it("has a unique slug per model", () => {
    const slugs = bikeModels.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
