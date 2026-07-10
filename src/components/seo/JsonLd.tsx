import { resolveImg } from "@/services/modelService";
import { modelFromDaily } from "@/services/pricingService";
import { getSiteUrl } from "@/lib/site";
import type { BikeModel } from "@/types";

/**
 * SEO structured data (schema.org / JSON-LD).
 *
 * <JsonLd> renders a single application/ld+json script. The helper builders
 * keep the markup data-driven and on-brand: rentaro stays lowercase and we
 * never assert a fixed-km range (range depends on battery, weather, load,
 * rider — business rule), so Product schema describes the bike + offer only.
 */

type JsonLdProps = {
  /** A schema.org object (already shaped). Serialised verbatim. */
  data: Record<string, unknown>;
};

/**
 * Serialise a schema object for safe inline embedding.
 *
 * The data is our own (no user input), but we still escape the only character
 * that could break out of a <script> context — `<` — so a value can never
 * close the tag early or inject markup. This is the recommended hardening for
 * inline JSON-LD and keeps the output XSS-safe.
 */
function serialize(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Renders one JSON-LD <script>. Server component — no client JS shipped. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
    >
      {serialize(data)}
    </script>
  );
}

/** Organization schema for the brand (rendered once, in the root layout). */
export function buildOrganizationSchema(): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "rentaro",
    url: siteUrl,
    logo: `${siteUrl}/assets/logo-r.png`,
    description:
      "Monthly e-bike rental for delivery couriers in Tallinn, Riga and Helsinki.",
    areaServed: [
      { "@type": "City", name: "Tallinn" },
      { "@type": "City", name: "Riga" },
      { "@type": "City", name: "Helsinki" },
    ],
  };
}

/** Maps an internal bike status to a schema.org availability URL. */
function availabilityFor(status: BikeModel["status"]): string {
  switch (status) {
    case "in":
      return "https://schema.org/InStock";
    case "low":
      return "https://schema.org/LimitedAvailability";
    default:
      // "wait" — not currently rentable; couriers join the waitlist.
      return "https://schema.org/PreOrder";
  }
}

/**
 * Product schema for a single bike model.
 *
 * Describes the bike and its lowest daily rental price as an Offer. No range /
 * km claims are emitted — only the spec-agnostic marketing fields. The image is
 * absolutised so crawlers resolve it: admin-uploaded photos (`/api/...`) resolve
 * to the API host via resolveImg, while bundled `/assets/...` shots are
 * absolutised against the site URL.
 */
/** BreadcrumbList for detail pages (Home → Models → <bike>) — helps Google
 *  render the SERP path; Product snippets already convert well for us. */
export function buildBreadcrumbSchema(
  crumbs: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${base}${c.path}`,
    })),
  };
}

export function buildProductSchema(m: BikeModel): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const resolved = resolveImg(m.img);
  const image = resolved.startsWith("http") ? resolved : `${siteUrl}${resolved}`;
  // Lowest daily across tiers, honouring any per-model overrides (single source).
  const fromDay = modelFromDaily(m);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: m.name,
    brand: { "@type": "Brand", name: m.brand },
    image,
    description:
      m.blurb ??
      `${m.name} — available on 30-day, 6 or 12-month rentaro plans with service support.`,
    category: "Electric bike rental",
    url: `${siteUrl}/models/${m.slug}`,
    offers: {
      "@type": "Offer",
      price: fromDay.toFixed(2),
      priceCurrency: "EUR",
      // Daily rate on the entry (30-day) plan; the per-day price drops on
      // longer commitments. unitText documents the billing unit for clarity.
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: fromDay.toFixed(2),
        priceCurrency: "EUR",
        unitText: "DAY",
      },
      availability: availabilityFor(m.status),
      url: `${siteUrl}/models/${m.slug}`,
    },
  };
}
