import type { PricingPlan } from "@/types";

/** SOURCE: /api/public/pricing — admin edits daily price + perks per term. */
export const pricingPlans: PricingPlan[] = [
  {
    id: "p30",
    term: "30 days",
    months: 1,
    daily: 5.9,
    monthly: 177,
    tag: "Flexible",
    featured: false,
    perks: [
      "Service support included",
      "Lock + charger included",
      "Extend or switch anytime",
    ],
  },
  {
    id: "p180",
    term: "6 months",
    months: 6,
    daily: 4.9,
    monthly: 147,
    tag: "Most popular",
    featured: true,
    perks: [
      "Everything in 30 days",
      "Lower daily rate",
      "Priority maintenance",
      "Free model swap once",
    ],
  },
  {
    id: "p365",
    term: "12 months",
    months: 12,
    daily: 3.9,
    monthly: 117,
    tag: "Best price",
    featured: false,
    perks: [
      "Everything in 6 months",
      "Lowest daily rate",
      "Free accessory bundle",
    ],
  },
];

export const getPlanById = (id: string) =>
  pricingPlans.find((p) => p.id === id);
