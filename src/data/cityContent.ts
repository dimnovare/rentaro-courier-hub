/**
 * SOURCE: /api/public/cities/{id}/content — per-city marketing copy.
 *
 * Live availability, pickup areas and status come from `cities` (see data/cities.ts);
 * this module only holds the editorial copy for each city landing page.
 *
 * Copy rules (see CLAUDE.md): courier-focused, no fixed-km range promises and no
 * delivery-platform partnership claims. Bikes are described as suitable for city
 * delivery work, never as officially tied to any platform.
 */

export interface CityContent {
  /** Short SEO-friendly headline shown under the kicker. */
  headline: string;
  /** Lead paragraph introducing e-bike rental in this city. */
  intro: string;
  /** Reasons couriers ride here — rendered as a checked list. */
  whyHere: string[];
  /** A practical note about pickup / local handover in this city. */
  pickupNote: string;
  /** Neighbourhoods / areas couriers tend to work, for local relevance. */
  neighbourhoods: string[];
}

export const cityContent: Record<string, CityContent> = {
  tallinn: {
    headline: "Monthly e-bike rental in Tallinn.",
    intro:
      "Tallinn is where rentaro started. Whether you ride Kesklinn lunch rushes or longer runs out to Lasnamäe and Mustamäe, you get a delivery-built e-bike on a simple monthly plan — with the lock, charger and service support that keep you earning every shift.",
    whyHere: [
      "Compact Old Town and Kesklinn streets reward a quick, agile e-bike between drops.",
      "Cobbles, tram tracks and winter slush — our bikes are picked for real Tallinn conditions.",
      "Same-week pickup in the centre, plus extra-battery options for back-to-back shifts.",
      "Service support across the city, so a flat tyre never costs you a full day.",
    ],
    pickupNote:
      "Collect your bike at our Telliskivi or Kesklinn pickup point, or ask about local handover. We walk you through the bike, the lock and charging before your first shift.",
    neighbourhoods: ["Kesklinn", "Telliskivi", "Kalamaja", "Lasnamäe", "Mustamäe", "Kristiine"],
  },
  riga: {
    headline: "Monthly e-bike rental in Riga.",
    intro:
      "Riga couriers cover serious ground — from Centrs and Vecrīga across the river to Āgenskalns and Pārdaugava. A monthly rentaro e-bike keeps that mileage cheap and predictable, with service support and extra-battery options built around long delivery days.",
    whyHere: [
      "Wide boulevards and long cross-river routes — an e-bike turns big distances into easy ones.",
      "One simple monthly price instead of fuel, parking and the cost of an unreliable bike.",
      "Extra batteries available for couriers stitching together full days across the city.",
      "Local service support so small issues get fixed fast and you stay on the road.",
    ],
    pickupNote:
      "Pick up in Centrs or Āgenskalns, or arrange local handover. We set the bike up with you, check the lock and show you how charging works before you ride.",
    neighbourhoods: ["Centrs", "Vecrīga", "Āgenskalns", "Pārdaugava", "Teika", "Purvciems"],
  },
  helsinki: {
    headline: "Monthly e-bike rental in Helsinki — coming soon.",
    intro:
      "Helsinki is next on the rentaro map. We are lining up a delivery-ready fleet for couriers working Kallio, Punavuori and the wider city — same monthly plans, same service support, same focus on keeping your bike moving. Join the waitlist and we will let you know the moment bikes land.",
    whyHere: [
      "Strong cycling infrastructure makes Helsinki a natural fit for delivery e-bikes.",
      "Year-round riders need bikes ready for cold, wet and dark winter shifts — that is what we build for.",
      "Monthly plans give full-time couriers a predictable cost, with extra-battery options for long days.",
      "Service support is part of the plan from the day we go live.",
    ],
    pickupNote:
      "Helsinki pickup points around Kallio and Punavuori are being finalised. Join the waitlist and we will share collection details and a launch date as soon as the fleet is ready.",
    neighbourhoods: ["Kallio", "Punavuori", "Kamppi", "Töölö", "Sörnäinen", "Kallio"],
  },
};

export const getCityContent = (id: string): CityContent | undefined => cityContent[id];
