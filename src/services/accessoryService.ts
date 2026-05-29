import { accessories } from "@/data/accessories";
import type { Accessory } from "@/types";
import { apiGet } from "./api";

export const accessoryService = {
  getAccessories: () =>
    apiGet<Accessory[]>("/api/public/accessories", accessories),
};
