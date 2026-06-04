import { apiGet } from "./api";
import { cities } from "@/data/cities";
import { bikeModels } from "@/data/bikeModels";

export interface AvailabilityEntry {
  cityId: string;
  modelId: string;
  available: number;
  total: number;
}

/** Derive a city-level status from live counts. */
export function cityStatus(available: number): "available" | "limited" | "soon" {
  if (available > 3) return "available";
  if (available > 0) return "limited";
  return "available"; // "soon" is set statically, not from inventory
}

/** Derive a model-level BikeStatus from live counts. */
export function modelStatus(available: number): "in" | "low" | "wait" {
  if (available > 3) return "in";
  if (available > 0) return "low";
  return "wait";
}

/** Build per-city available totals from availability entries. */
export function cityTotals(
  entries: AvailabilityEntry[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    m.set(e.cityId, (m.get(e.cityId) ?? 0) + e.available);
  }
  return m;
}

/** Build per-model available totals from availability entries. */
export function modelTotals(
  entries: AvailabilityEntry[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    m.set(e.modelId, (m.get(e.modelId) ?? 0) + e.available);
  }
  return m;
}

/** Static city fallback totals (from cities.ts). */
const staticCityTotals = new Map(cities.map((c) => [c.id, c.available]));
/** Static model fallback totals (from bikeModels.ts). */
const staticModelTotals = new Map(bikeModels.map((m) => [m.id, m.availability]));

/** Fetch live availability. Falls back to static data on error. */
export async function getAvailability(): Promise<AvailabilityEntry[]> {
  return apiGet<AvailabilityEntry[]>("/api/public/availability", []);
}

/** Get live city totals, falling back to static data when API returns empty. */
export async function getLiveCityTotals(): Promise<Map<string, number>> {
  const entries = await getAvailability();
  if (entries.length === 0) return staticCityTotals;
  return cityTotals(entries);
}

/** Get live model totals, falling back to static data when API returns empty. */
export async function getLiveModelTotals(): Promise<Map<string, number>> {
  const entries = await getAvailability();
  if (entries.length === 0) return staticModelTotals;
  return modelTotals(entries);
}
