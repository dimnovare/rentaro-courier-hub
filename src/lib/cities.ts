import type { City } from "@/types";

/**
 * Split a list of cities into the operating ("live") set and the "soon" set,
 * mapping each to a display name via `nameFn`. A city counts as OPERATING once
 * its status is no longer "soon" (i.e. "available" or "limited").
 *
 * Shared by every "we operate in…" surface (Hero, CitiesView, booking wizard,
 * Service, FAQ) so the copy can never claim more markets than are actually open
 * and the name lists stay localized + in lockstep.
 *
 * `nameFn` receives the city id and returns its localized display name (e.g.
 * `(id) => t(`names.${id}`)`), keeping all copy in the `cities.names.*` space.
 */
export function operatingCityNames(
  cities: City[],
  nameFn: (id: string) => string,
): { live: string[]; soon: string[]; liveCount: number; soonCount: number } {
  const live = cities.filter((c) => c.status !== "soon").map((c) => nameFn(c.id));
  const soon = cities.filter((c) => c.status === "soon").map((c) => nameFn(c.id));
  return { live, soon, liveCount: live.length, soonCount: soon.length };
}
