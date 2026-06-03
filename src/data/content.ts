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

/**
 * How it works — the canonical 7-step rental flow. Reserving is free; the only
 * payment moment is step 05, in the rental portal, after approval and after the
 * contract is accepted. Copy lives in the `howItWorks.steps` catalog namespace,
 * keyed by `n`; only `n` is load-bearing here.
 */
export const steps: Step[] = [
  { n: "01", title: "Reserve your bike", copy: "" },
  { n: "02", title: "We approve your booking", copy: "" },
  { n: "03", title: "Verify your identity", copy: "" },
  { n: "04", title: "Review & accept your contract", copy: "" },
  { n: "05", title: "Pay your first 30 days + deposit", copy: "" },
  { n: "06", title: "We assign your bike", copy: "" },
  { n: "07", title: "Pick up and start delivering", copy: "" },
];
