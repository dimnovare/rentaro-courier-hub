import { PopularModelsView } from "./PopularModelsView";
import { modelService } from "@/services/modelService";

export async function PopularModels() {
  const models = await modelService.getPopular();
  return <PopularModelsView models={models} />;
}
