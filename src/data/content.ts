import type { Step } from "@/types";

/** SOURCE: /api/public/trust — the scrolling marquee items. */
export const trust: string[] = [
  "Minimum 30 days",
  "Service support included",
  "Charger in every plan",
  "Extra battery available",
  "Digital contract — sign on your phone",
  "Built for delivery shifts",
  "Pickup or local delivery",
];

/**
 * How it works — the canonical 4-step rental flow. Reserving is free; the only
 * payment moment is step 03, in the rental portal, after approval and after the
 * contract is signed. Copy lives in the `howItWorks.steps` catalog namespace,
 * keyed by `n`; only `n` is load-bearing here.
 */
export const steps: Step[] = [
  { n: "01", title: "", copy: "" },
  { n: "02", title: "", copy: "" },
  { n: "03", title: "", copy: "" },
  { n: "04", title: "", copy: "" },
];
