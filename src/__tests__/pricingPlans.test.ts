import { describe, expect, it } from "vitest";
import { pricingPlans } from "@/data/pricingPlans";

/**
 * Locked business pricing (see CLAUDE.md): three term plans at
 * €5.90 / €4.90 / €3.90 per day, equal to €177 / €147 / €117 per 30 days.
 */
describe("pricingPlans", () => {
  it("has exactly three plans", () => {
    expect(pricingPlans).toHaveLength(3);
  });

  it("matches the locked daily rates", () => {
    expect(pricingPlans.map((p) => p.daily)).toEqual([5.9, 4.9, 3.9]);
  });

  it("matches the locked 30-day prices", () => {
    expect(pricingPlans.map((p) => p.monthly)).toEqual([177, 147, 117]);
  });

  it("keeps daily × 30 consistent with the displayed 30-day price", () => {
    for (const plan of pricingPlans) {
      expect(Math.round(plan.daily * 30)).toBe(plan.monthly);
    }
  });

  it("marks the 6-month plan as the featured one", () => {
    const featured = pricingPlans.filter((p) => p.featured);
    expect(featured).toHaveLength(1);
    expect(featured[0].months).toBe(6);
  });
});
