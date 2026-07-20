import { getLiveModelTotals } from "@/services/availabilityService";
import { cityService } from "@/services/cityService";
import { marqueeService } from "@/services/marqueeService";
import { modelService } from "@/services/modelService";
import { pricingService, resolvePlanPrice } from "@/services/pricingService";
import type { BikeModel, PricingPlan } from "@/types";
import { Hero } from "./Hero";

export function getStartingDailyPrice(
  models: BikeModel[] | undefined,
  plans: PricingPlan[] | undefined,
): number | undefined {
  const twelveMonthPlan = plans?.find((plan) => plan.id === "p365");
  if (!twelveMonthPlan || !models?.length) return undefined;

  const prices = models
    .map((model) => resolvePlanPrice(model, twelveMonthPlan).daily)
    .filter((price) => Number.isFinite(price) && price > 0);

  return prices.length > 0 ? Math.min(...prices) : undefined;
}

export async function HeroServer() {
  const [liveTotals, cities, marquee, models, plans] = await Promise.all([
    getLiveModelTotals(),
    cityService.getCities(),
    marqueeService.getMarquee(),
    modelService.getModelsFromApi(),
    pricingService.getPlansFromApi(),
  ]);
  const liveAvailable = Array.from(liveTotals.values()).reduce((sum, n) => sum + n, 0);
  const startingDailyPrice = getStartingDailyPrice(models, plans);

  return (
    <Hero
      liveAvailable={liveAvailable}
      cities={cities}
      marquee={marquee}
      startingDailyPrice={startingDailyPrice}
    />
  );
}
