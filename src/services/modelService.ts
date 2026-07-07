import type { SyntheticEvent } from "react";
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

/**
 * On-brand slate shown when a model photo is missing or fails to load (e.g. a
 * newly-added model whose real photo hasn't been dropped in yet). Bundled, so
 * it always resolves — no broken-image icon ever reaches the public site.
 */
export const MODEL_IMAGE_FALLBACK = "/assets/models/_placeholder.svg";

/**
 * `<img onError>` handler for every model photo. Swaps a failed image to the
 * bundled placeholder once (a `data-fallback` guard prevents an infinite error
 * loop if the placeholder itself were ever unavailable).
 */
export function handleModelImgError(
  e: SyntheticEvent<HTMLImageElement>,
): void {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.src = MODEL_IMAGE_FALLBACK;
}

export const modelService = {
  getModels: () => apiGet<BikeModel[]>("/api/public/models", bikeModels),
  getPopular: () =>
    apiGet<BikeModel[]>("/api/public/models?popular=true", popularModels),
  getModel: (slug: string) =>
    apiGet<BikeModel | undefined>(`/api/public/models/${slug}`, getModelBySlug(slug)),
};
