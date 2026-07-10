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

  // The bike selector only appears once at least one model has custom pricing —
  // until then the section is byte-for-byte the standard tiers, and the extra
  // chrome never clutters the locked design.
  //
  // No isActive filter: the public /api/public/models endpoint never sends
  // isActive (inactive models are filtered server-side), and every static
  // fallback entry in bikeModels.ts carries isActive: true — so the old
  // `m.isActive !== false` filter was a no-op on both paths and was removed.
  const pricedModels = models.some(hasOverride) ? models : undefined;

  return <PricingView plans={plans} models={pricedModels} />;
}
