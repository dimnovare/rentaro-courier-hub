import { PopularModelsView } from "./PopularModelsView";
import { modelService } from "@/services/modelService";
import { getLiveModelTotals, modelStatus } from "@/services/availabilityService";

export async function PopularModels() {
  const [models, liveTotals] = await Promise.all([
    modelService.getPopular(),
    getLiveModelTotals(),
  ]);
  const patched = models.map((m) => {
    const avail = liveTotals.get(m.id);
    if (avail === undefined) return m;
    return { ...m, availability: avail, status: modelStatus(avail) };
  });
  return <PopularModelsView models={patched} />;
}
