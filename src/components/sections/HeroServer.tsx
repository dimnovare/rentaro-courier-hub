import { getLiveModelTotals } from "@/services/availabilityService";
import { cityService } from "@/services/cityService";
import { marqueeService } from "@/services/marqueeService";
import { modelService } from "@/services/modelService";
import { pricingService, resolvePlanPrice } from "@/services/pricingService";
import { Hero } from "./Hero";

export async function HeroServer() {
  const [liveTotals, cities, marquee, models, plans] = await Promise.all([
    getLiveModelTotals(),
    cityService.getCities(),
    marqueeService.getMarquee(),
    modelService.getModels(),
    pricingService.getPlans(),
  ]);
  const liveAvailable = Array.from(liveTotals.values()).reduce((sum, n) => sum + n, 0);
  const twelveMonthPlan =
    plans.find((plan) => plan.id === "p365") ??
    plans.find((plan) => plan.months === 12);
  const startingDailyPrice = twelveMonthPlan
    ? models.length > 0
      ? Math.min(
          ...models.map((model) => resolvePlanPrice(model, twelveMonthPlan).daily),
        )
      : twelveMonthPlan.daily
    : undefined;

  return (
    <Hero
      liveAvailable={liveAvailable}
      cities={cities}
      marquee={marquee}
      startingDailyPrice={startingDailyPrice}
    />
  );
}
