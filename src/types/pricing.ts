/** Pricing plan types. Term-based, uniform across every bike. */

export type PlanId = "p30" | "p180" | "p365";

export interface PricingPlan {
  id: PlanId;
  /** Display term, e.g. "30 days". */
  term: string;
  months: number;
  /** Daily rate in EUR. */
  daily: number;
  /** Price per 30-day period (daily × 30) in EUR. */
  monthly: number;
  tag: string;
  featured: boolean;
  perks: string[];
}
