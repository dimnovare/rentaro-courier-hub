import { pricingPlans } from "@/data/pricingPlans";
import type { BikeModel, PlanId, PricingPlan } from "@/types";
import { apiGet } from "./api";

export const pricingService = {
  getPlans: () => apiGet<PricingPlan[]>("/api/public/pricing", pricingPlans),
};

/** The per-model override field that backs each plan tier. */
const OVERRIDE_KEY: Record<PlanId, "price30" | "price6mo" | "price12mo"> = {
  p30: "price30",
  p180: "price6mo",
  p365: "price12mo",
};

type ModelPrices = Pick<BikeModel, "price30" | "price6mo" | "price12mo">;

/**
 * The price a specific model charges on a specific plan — the SINGLE source of
 * truth for per-model pricing. Returns the model's per-tier override when set
 * (stored as the per-30-day €; daily is derived), otherwise the global tier.
 * Every price shown once a model is in context must go through here.
 */
export function resolvePlanPrice(
  model: ModelPrices,
  plan: PricingPlan,
): { monthly: number; daily: number } {
  const override = model[OVERRIDE_KEY[plan.id]];
  if (override == null) return { monthly: plan.monthly, daily: plan.daily };
  return { monthly: override, daily: Math.round((override / 30) * 100) / 100 };
}

/** Min/max resolved daily rate across all tiers — the model card's price span. */
export function modelPriceRange(
  model: ModelPrices,
  plans: PricingPlan[] = pricingPlans,
): { minDaily: number; maxDaily: number } {
  const dailies = plans.map((p) => resolvePlanPrice(model, p).daily);
  return { minDaily: Math.min(...dailies), maxDaily: Math.max(...dailies) };
}

/** The model's "from" daily rate — the cheapest tier, honouring overrides. */
export function modelFromDaily(
  model: ModelPrices,
  plans: PricingPlan[] = pricingPlans,
): number {
  return modelPriceRange(model, plans).minDaily;
}
