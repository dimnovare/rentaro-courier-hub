import { PopularModelsView } from "./PopularModelsView";
import { modelService } from "@/services/modelService";

export async function PopularModels() {
  // /api/public/models?popular=true already embeds live-derived availability/
  // status server-side — no re-patch from /api/public/availability. The old
  // second fetch had its own 20s cache window and could contradict the
  // embedded values within the same render.
  const models = await modelService.getPopular();
  return <PopularModelsView models={models} />;
}
