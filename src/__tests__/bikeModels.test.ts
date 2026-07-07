import { describe, expect, it } from "vitest";
import { bikeModels } from "@/data/bikeModels";

/**
 * Catalogue invariants (see CLAUDE.md):
 *  - four active models (matches the production fleet: engine-pro + 3 engwe-*);
 *  - uniform term pricing — every bike starts at €5.90 / day;
 *  - NO fixed-km range promise in marketing pills (the range rule). Range may
 *    only live in the detailed spec block / spec tables, never a card pill.
 */
describe("bikeModels", () => {
  it("has four models", () => {
    expect(bikeModels).toHaveLength(4);
  });

  it("starts every model at €5.90 / day", () => {
    for (const model of bikeModels) {
      expect(model.fromDay).toBe(5.9);
      expect(model.from30).toBe(177);
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
