import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getLiveModelTotals: vi.fn(),
  getCities: vi.fn(),
  getMarquee: vi.fn(),
  getModels: vi.fn(),
  getPlans: vi.fn(),
}));

vi.mock("@/services/availabilityService", () => ({
  getLiveModelTotals: serviceMocks.getLiveModelTotals,
}));
vi.mock("@/services/cityService", () => ({
  cityService: { getCities: serviceMocks.getCities },
}));
vi.mock("@/services/marqueeService", () => ({
  marqueeService: { getMarquee: serviceMocks.getMarquee },
}));
vi.mock("@/services/modelService", () => ({
  modelService: { getModels: serviceMocks.getModels },
}));
vi.mock("@/services/pricingService", async () => {
  const actual = await vi.importActual<typeof import("@/services/pricingService")>(
    "@/services/pricingService",
  );
  return {
    ...actual,
    pricingService: { getPlans: serviceMocks.getPlans },
  };
});

import { HeroServer } from "@/components/sections/HeroServer";

describe("HeroServer pricing", () => {
  beforeEach(() => {
    serviceMocks.getLiveModelTotals.mockResolvedValue(new Map());
    serviceMocks.getCities.mockResolvedValue([]);
    serviceMocks.getMarquee.mockResolvedValue({});
    serviceMocks.getPlans.mockResolvedValue([
      {
        id: "p365",
        term: "12 months",
        months: 12,
        daily: 3.9,
        monthly: 117,
        tag: "Best price",
        featured: false,
        perks: { en: [] },
      },
    ]);
    serviceMocks.getModels.mockResolvedValue([
      { price12mo: 199 },
      { price12mo: 169 },
      { price12mo: 229 },
    ]);
  });

  it("passes the cheapest live 12-month model rate to the hero", async () => {
    const element = (await HeroServer()) as ReactElement<{
      startingDailyPrice?: number;
    }>;

    expect(element.props.startingDailyPrice).toBe(5.63);
  });
});
