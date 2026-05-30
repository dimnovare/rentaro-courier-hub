import { PricingView } from "./PricingView";
import { pricingService } from "@/services/pricingService";

export async function Pricing() {
  const plans = await pricingService.getPlans();
  return <PricingView plans={plans} />;
}
