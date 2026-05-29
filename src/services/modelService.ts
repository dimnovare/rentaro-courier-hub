import { bikeModels, popularModels, getModelBySlug } from "@/data/bikeModels";
import type { BikeModel } from "@/types";
import { apiGet } from "./api";

export const modelService = {
  getModels: () => apiGet<BikeModel[]>("/api/public/models", bikeModels),
  getPopular: () =>
    apiGet<BikeModel[]>("/api/public/models?popular=true", popularModels),
  getModel: (slug: string) =>
    apiGet<BikeModel | undefined>(`/api/public/models/${slug}`, getModelBySlug(slug)),
};
