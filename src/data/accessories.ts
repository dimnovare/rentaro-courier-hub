import type { Accessory } from "@/types";

/** SOURCE: /api/public/accessories */
export const accessories: Accessory[] = [
  { id: "battery", name: "Extra battery", price: "€29 / 30d", icon: "battery" },
  { id: "bag", name: "Delivery bag", price: "€12 / 30d", icon: "bag" },
  { id: "rack", name: "Cargo rack", price: "€9 / 30d", icon: "rack" },
  { id: "phone", name: "Phone holder", price: "€4 / 30d", icon: "phone" },
  { id: "lock", name: "Heavy-duty lock", price: "€10 / 30d", icon: "lock" },
  { id: "helmet", name: "Helmet", price: "€8 / 30d", icon: "helmet" },
  { id: "rain", name: "Rain cover", price: "€6 / 30d", icon: "rain" },
  { id: "winter", name: "Winter tires", price: "€19 / 30d", icon: "tire" },
];
