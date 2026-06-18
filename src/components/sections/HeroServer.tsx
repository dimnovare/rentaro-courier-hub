import { getLiveModelTotals } from "@/services/availabilityService";
import { cityService } from "@/services/cityService";
import { Hero } from "./Hero";

export async function HeroServer() {
  const [liveTotals, cities] = await Promise.all([
    getLiveModelTotals(),
    cityService.getCities(),
  ]);
  const liveAvailable = Array.from(liveTotals.values()).reduce((sum, n) => sum + n, 0);
  return <Hero liveAvailable={liveAvailable} cities={cities} />;
}
