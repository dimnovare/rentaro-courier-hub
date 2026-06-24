import { getLiveModelTotals } from "@/services/availabilityService";
import { cityService } from "@/services/cityService";
import { marqueeService } from "@/services/marqueeService";
import { Hero } from "./Hero";

export async function HeroServer() {
  const [liveTotals, cities, marquee] = await Promise.all([
    getLiveModelTotals(),
    cityService.getCities(),
    marqueeService.getMarquee(),
  ]);
  const liveAvailable = Array.from(liveTotals.values()).reduce((sum, n) => sum + n, 0);
  return <Hero liveAvailable={liveAvailable} cities={cities} marquee={marquee} />;
}
