import type { Step } from "@/types";

/** SOURCE: /api/public/trust — the scrolling marquee items. */
export const trust: string[] = [
  "Minimum 30 days",
  "Service support included",
  "Lock + charger in every plan",
  "Extra battery available",
  "Digital contract — sign on your phone",
  "Built for delivery shifts",
  "Pickup or local delivery",
];

/** How it works — 3 steps. */
export const steps: Step[] = [
  {
    n: "01",
    title: "Choose your model and plan",
    copy: "Pick the bike that fits your shifts and a 30-day, 6 or 12-month plan. The longer the term, the lower the daily price.",
  },
  {
    n: "02",
    title: "Sign online & pay deposit",
    copy: "Complete identity check, sign the digital contract and pay the refundable deposit — all from your phone.",
  },
  {
    n: "03",
    title: "Pick up and start delivering",
    copy: "Collect at a city pickup point or request local delivery, then start your first shift the same week.",
  },
];
