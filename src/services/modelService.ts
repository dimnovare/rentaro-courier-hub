import { bikeModels, popularModels, getModelBySlug } from "@/data/bikeModels";
import type { BikeModel } from "@/types";
import { API_BASE, apiGet } from "./api";

/**
 * Resolve a model image `src` for use in `<img>`.
 *
 * Admin-uploaded photos come back from the API as a host-relative path on the
 * API host, e.g. `"/api/public/models/{code}/image"`. Those must be prefixed
 * with `API_BASE` so the browser loads them from the API host, not the site
 * host. Static bundled assets (`/assets/...`) and absolute URLs are returned
 * untouched.
 */
export function resolveImg(src: string | undefined | null): string {
  if (!src) return "";
  if (src.startsWith("/api/")) return `${API_BASE}${src}`;
  return src;
}

export const modelService = {
  getModels: () => apiGet<BikeModel[]>("/api/public/models", bikeModels),
  getPopular: () =>
    apiGet<BikeModel[]>("/api/public/models?popular=true", popularModels),
  getModel: (slug: string) =>
    apiGet<BikeModel | undefined>(`/api/public/models/${slug}`, getModelBySlug(slug)),
};
