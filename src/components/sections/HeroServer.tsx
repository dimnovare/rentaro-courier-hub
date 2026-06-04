import { getLiveModelTotals } from "@/services/availabilityService";
import { Hero } from "./Hero";

export async function HeroServer() {
  const liveTotals = await getLiveModelTotals();
  const liveAvailable = Array.from(liveTotals.values()).reduce((sum, n) => sum + n, 0);
  return <Hero liveAvailable={liveAvailable} />;
}
