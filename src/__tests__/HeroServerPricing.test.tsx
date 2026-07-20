import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getLiveModelTotals: vi.fn(),
  getCities: vi.fn(),
  getMarquee: vi.fn(),
  getModelsFromApi: vi.fn(),
  getPlansFromApi: vi.fn(),
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
  modelService: { getModelsFromApi: serviceMocks.getModelsFromApi },
}));
vi.mock("@/services/pricingService", async () => {
  const actual = await vi.importActual<typeof import("@/services/pricingService")>(
    "@/services/pricingService",
  );
  return {
    ...actual,
    pricingService: { getPlansFromApi: serviceMocks.getPlansFromApi },
  };
});

import { HeroServer } from "@/components/sections/HeroServer";

describe("HeroServer pricing", () => {
  beforeEach(() => {
    serviceMocks.getLiveModelTotals.mockResolvedValue(new Map());
    serviceMocks.getCities.mockResolvedValue([]);
    serviceMocks.getMarquee.mockResolvedValue({});
    serviceMocks.getPlansFromApi.mockResolvedValue([
      {
        id: "p30",
        term: "30 days",
        months: 1,
        daily: 5.9,
        monthly: 177,
        tag: "Flexible",
        featured: false,
        perks: { en: [] },
      },
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
    serviceMocks.getModelsFromApi.mockResolvedValue([
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

  it("uses the live plan rate when a model has no 12-month override", async () => {
    serviceMocks.getModelsFromApi.mockResolvedValue([{}]);

    const element = (await HeroServer()) as ReactElement<{
      startingDailyPrice?: number;
    }>;

    expect(element.props.startingDailyPrice).toBe(3.9);
  });

  it.each([
    ["models are unavailable", undefined, undefined],
    ["the model list is empty", [], undefined],
  ])("omits the price when %s", async (_case, models, expected) => {
    serviceMocks.getModelsFromApi.mockResolvedValue(models);

    const element = (await HeroServer()) as ReactElement<{
      startingDailyPrice?: number;
    }>;

    expect(element.props.startingDailyPrice).toBe(expected);
  });

  it.each([
    ["plans are unavailable", undefined],
    ["the plan list is empty", []],
    [
      "the p365 plan is missing",
      [
        {
          id: "p30",
          term: "30 days",
          months: 1,
          daily: 5.9,
          monthly: 177,
          tag: "Flexible",
          featured: false,
          perks: { en: [] },
        },
      ],
    ],
  ])("omits the price when %s", async (_case, plans) => {
    serviceMocks.getPlansFromApi.mockResolvedValue(plans);

    const element = (await HeroServer()) as ReactElement<{
      startingDailyPrice?: number;
    }>;

    expect(element.props.startingDailyPrice).toBeUndefined();
  });
});
