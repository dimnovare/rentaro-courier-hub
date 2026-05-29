import { pricingPlans } from "@/data/pricingPlans";
import type { PricingPlan } from "@/types";
import { apiGet } from "./api";

export const pricingService = {
  getPlans: () => apiGet<PricingPlan[]>("/api/public/pricing", pricingPlans),
};
