import type { City } from "@/types";

/** Local no-API fallback. Production city data comes from /api/public/cities. */
export const cities: City[] = [
  { id: "tallinn", name: "Tallinn", country: "Estonia", available: 12, pickup: "Telliskivi · Kesklinn", status: "available" },
  { id: "riga", name: "Riga", country: "Latvia", available: 6, pickup: "Centrs · Āgenskalns", status: "limited" },
  { id: "helsinki", name: "Helsinki", country: "Finland", available: 0, pickup: "Kallio · Punavuori", status: "soon" },
];

export const getCityById = (id: string) => cities.find((c) => c.id === id);
