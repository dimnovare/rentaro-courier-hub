import { PricingView } from "./PricingView";
import { pricingService } from "@/services/pricingService";
import { modelService } from "@/services/modelService";
import type { BikeModel } from "@/types";

/** True when the model carries any per-tier price override (differs from the tier). */
function hasOverride(m: BikeModel): boolean {
  return m.price30 != null || m.price6mo != null || m.price12mo != null;
}

export async function Pricing() {
  const [plans, models] = await Promise.all([
    pricingService.getPlans(),
    modelService.getModels(),
  ]);

  // The bike selector only appears once at least one active model has custom
  // pricing — until then the section is byte-for-byte the standard tiers, and
  // the extra chrome never clutters the locked design. Pass a slim, active-only
  // list so the client bundle carries just what the selector needs.
  const active = models.filter((m) => m.isActive !== false);
  const pricedModels = active.some(hasOverride) ? active : undefined;

  return <PricingView plans={plans} models={pricedModels} />;
}
