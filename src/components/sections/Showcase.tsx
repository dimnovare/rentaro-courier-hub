import { ShowcaseView } from "./ShowcaseView";
import { modelService } from "@/services/modelService";

export async function Showcase() {
  const models = await modelService.getModels();
  // Prefer the explicitly-flagged showcase bike, then a popular one, then the
  // first available model. With the API down this resolves to the same static
  // pick (the Engine Pro).
  const m =
    models.find((x) => x.showcase) ??
    models.find((x) => x.popular) ??
    models[0];
  if (!m) return null;
  return <ShowcaseView m={m} />;
}
