import { pricingPlans } from "@/data/pricingPlans";
import type { Accessory, BikeModel, PlanId, PricingPlan } from "@/types";
import { apiGet } from "./api";

export const pricingService = {
  getPlans: () => apiGet<PricingPlan[]>("/api/public/pricing", pricingPlans),
};

/** The per-model override field that backs each plan tier. */
const OVERRIDE_KEY: Record<PlanId, "price30" | "price6mo" | "price12mo"> = {
  p30: "price30",
  p180: "price6mo",
  p365: "price12mo",
};

type ModelPrices = Pick<BikeModel, "price30" | "price6mo" | "price12mo">;

/**
 * The price a specific model charges on a specific plan — the SINGLE source of
 * truth for per-model pricing. Returns the model's per-tier override when set
 * (stored as the per-30-day €; daily is derived), otherwise the global tier.
 * Every price shown once a model is in context must go through here.
 */
export function resolvePlanPrice(
  model: ModelPrices,
  plan: PricingPlan,
): { monthly: number; daily: number } {
  const override = model[OVERRIDE_KEY[plan.id]];
  if (override == null) return { monthly: plan.monthly, daily: plan.daily };
  return { monthly: override, daily: Math.round((override / 30) * 100) / 100 };
}

/** Min/max resolved daily rate across all tiers — the model card's price span. */
export function modelPriceRange(
  model: ModelPrices,
  plans: PricingPlan[] = pricingPlans,
): { minDaily: number; maxDaily: number } {
  const dailies = plans.map((p) => resolvePlanPrice(model, p).daily);
  return { minDaily: Math.min(...dailies), maxDaily: Math.max(...dailies) };
}

/** The model's "from" daily rate — the cheapest tier, honouring overrides. */
export function modelFromDaily(
  model: ModelPrices,
  plans: PricingPlan[] = pricingPlans,
): number {
  return modelPriceRange(model, plans).minDaily;
}

/* ── Accessory pricing (mirrors the per-model resolver above) ───────────────
 * Accessory prices are €/30-day period, per plan tier, EXACTLY like bikes:
 * p30 → price30, p180 → price6mo, p365 → price12mo. A null tier falls back to
 * parsing the legacy display string (`price`, e.g. "€60 / 30d"), so an
 * accessory with all three tiers null behaves exactly as before. A bundle
 * charges its OWN resolved tier price — component ids are display-only and are
 * NEVER summed. resolveAccessoryPrice is the single source of truth every
 * charge/display site must go through, mirrored 1:1 by the backend
 * AccessoryPricing so shown = billed. */

/** The accessory fields the resolver reads — accepts any Accessory-shaped row. */
type AccessoryPrices = Pick<
  Accessory,
  "price" | "price30" | "price6mo" | "price12mo"
>;

/** The per-plan accessory tier that backs each plan id. */
const ACCESSORY_TIER: Record<PlanId, "price30" | "price6mo" | "price12mo"> = {
  p30: "price30",
  p180: "price6mo",
  p365: "price12mo",
};

/**
 * Parses the leading decimal amount out of an accessory display price. Ported
 * 1:1 from the backend AccessoryPricing.ParseLeadingAmount so the frontend
 * quote and the backend charge can never drift. Tolerates a leading "€"/"$"
 * and whitespace. A comma is the DECIMAL separator only when the amount has no
 * dot, a single comma, and at most two digits after it ("€12,50" → 12.50);
 * otherwise commas are THOUSANDS separators and are stripped ("€1,299" → 1299,
 * "€1,299.50" → 1299.50). Anything unparseable is 0 (charges nothing rather
 * than failing).
 */
export function parseLeadingAmount(price: string | null | undefined): number {
  if (!price || !price.trim()) return 0;
  const match = price.match(/^\s*(?:[€$]\s*)?(\d+(?:[.,]\d+)*)/);
  if (!match) return 0;
  let raw = match[1];
  if (raw.includes(".")) {
    // A dot is always the decimal separator; commas alongside are thousands.
    raw = raw.replace(/,/g, "");
  } else {
    const lastComma = raw.lastIndexOf(",");
    if (lastComma >= 0) {
      const isDecimalComma =
        raw.indexOf(",") === lastComma && raw.length - lastComma - 1 <= 2;
      raw = isDecimalComma ? raw.replace(",", ".") : raw.replace(/,/g, "");
    }
  }
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

/**
 * The €/30-day price an accessory charges on a specific plan — the SINGLE
 * source of truth for accessory pricing. Returns the accessory's per-tier
 * price when set, otherwise the parsed legacy display string. Every accessory
 * price shown once a plan is in context must go through here.
 */
export function resolveAccessoryPrice(
  acc: AccessoryPrices,
  plan: PlanId,
): number {
  const tier = acc[ACCESSORY_TIER[plan]];
  if (tier != null) return tier;
  return parseLeadingAmount(acc.price);
}

/**
 * The accessory's "from" price — the cheapest non-null tier — for the browsing
 * case where no plan is chosen yet. Falls back to the legacy parse when all
 * three tiers are null (so it matches today's single display price).
 */
export function accessoryPriceRange(acc: AccessoryPrices): { minMonthly: number } {
  const tiers = [acc.price30, acc.price6mo, acc.price12mo].filter(
    (v): v is number => v != null,
  );
  if (tiers.length > 0) return { minMonthly: Math.min(...tiers) };
  return { minMonthly: parseLeadingAmount(acc.price) };
}
