import { cities } from "@/data/cities";
import type { City } from "@/types";
import { apiGet } from "./api";

export const cityService = {
  getCities: () => apiGet<City[]>("/api/public/cities", cities),
};
