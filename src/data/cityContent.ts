/**
 * SOURCE: /api/public/cities/{id}/content — per-city marketing copy.
 *
 * Live availability, pickup areas and status come from `cities` (see data/cities.ts);
 * this module only holds the editorial copy for each city landing page.
 *
 * The user-facing strings here are the ENGLISH source-of-truth and document the
 * intended copy. At runtime the city page renders the same keys from the i18n
 * catalogs (`cityContent.{id}.*`) so the copy is localised per locale.
 *
 * Copy rules (see CLAUDE.md): courier-focused, no fixed-km range promises and no
 * delivery-platform partnership claims. Bikes are described as suitable for city
 * delivery work, never as officially tied to any platform.
 */

/** A titled paragraph block (used by the extended, city-specific sections). */
export interface CityFeature {
  title: string;
  copy: string;
}

/** A short question/answer pair for a city-specific FAQ. */
export interface CityFaq {
  q: string;
  a: string;
}

/**
 * Optional rich, city-specific sections. Only cities that have hand-written
 * local copy (currently Tallinn) set this; the city page renders these blocks
 * solely when present, so other cities keep their lean layout untouched.
 */
export interface CityExtended {
  /** "Why rent instead of buy" — framed for this city's couriers. */
  rentVsBuy: { kicker: string; heading: string; lead: string; points: CityFeature[] };
  /** Local seasonal / winter readiness block. */
  winter: { kicker: string; heading: string; lead: string; points: CityFeature[] };
  /** How pickup and handover work locally. */
  pickup: { kicker: string; heading: string; steps: CityFeature[] };
  /** City-specific FAQ. */
  faq: { kicker: string; heading: string; items: CityFaq[] };
}

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
  /** Optional rich, city-specific sections (Tallinn only for now). */
  extended?: CityExtended;
}

export const cityContent: Record<string, CityContent> = {
  tallinn: {
    headline: "Monthly e-bike rental in Tallinn.",
    intro:
      "Tallinn is where rentaro started, and it's still where most of our fleet lives. If you deliver for Bolt or Wolt around Kesklinn, weave through Telliskivi and Kalamaja, climb up into Põhja-Tallinn or run the long blocks out to Lasnamäe, you already know the city rewards a fast, dependable bike. We rent delivery-built e-bikes by the month — lock, charger and service support included — so you can pick one up this week and start earning without sinking a thousand euros into a bike of your own.",
    whyHere: [
      "Kesklinn lunch and dinner rushes pay best when you can cut between drops — an e-bike turns short, dense routes into back-to-back orders.",
      "Telliskivi, Kalamaja and Põhja-Tallinn mix cobbles, tram tracks and quiet side streets; our bikes are picked to stay sure-footed on all of it.",
      "Long runs out to Lasnamäe, Mustamäe and Kristiine stop being a problem when the motor does the climbing and an extra battery covers the distance.",
      "Estonian winters are real — dark, wet and icy. Winter tyres and service support keep you on the road through the months that pay the most.",
      "Same-week pickup in the centre means a newly-arrived courier can land in Tallinn and be delivering within days, not weeks.",
      "One monthly price covers the bike, maintenance and a replacement when something breaks — far less risk than buying a used bike off Okidoki.",
    ],
    pickupNote:
      "Collect your bike at our Telliskivi or Kesklinn pickup point — both a short ride from the busiest delivery zones — or ask about local handover. We walk you through the bike, the lock, charging and winter setup before your first shift, so nothing slows down day one.",
    neighbourhoods: [
      "Kesklinn",
      "Telliskivi",
      "Kalamaja",
      "Põhja-Tallinn",
      "Lasnamäe",
      "Mustamäe",
      "Kristiine",
    ],
    extended: {
      rentVsBuy: {
        kicker: "Rent vs buy in Tallinn",
        heading: "Why couriers here rent instead of buying.",
        lead: "A lot of Tallinn couriers are new in town or riding for a season. Tying up cash in a used bike — and owning every repair — rarely makes sense when your bike is the thing that earns.",
        points: [
          {
            title: "No big outlay to start",
            copy: "A delivery-capable e-bike costs well over a thousand euros to buy, plus a lock, charger and winter tyres. Renting is €177 for your first 30 days and you're on the road — cash stays in your pocket for rent and deposits.",
          },
          {
            title: "Repairs aren't your problem",
            copy: "Brakes, punctures and worn parts are part of the plan. A used bike off the classifieds becomes your workshop bill the moment something fails mid-shift — ours doesn't.",
          },
          {
            title: "No resale headache when you leave",
            copy: "Plenty of couriers ride Tallinn for a season. When you're done you hand the bike back — no listing it, no haggling, no selling at a loss in a soft second-hand market.",
          },
          {
            title: "Breakdowns don't cost you a shift",
            copy: "If a bike needs a longer repair we swap it where stock allows, so a mechanical fault doesn't wipe out a day's orders. Owning one bike means owning its downtime too.",
          },
        ],
      },
      winter: {
        kicker: "Built for Estonian winter",
        heading: "The cold months are when it pays to be ready.",
        lead: "Tallinn winters are dark, wet and icy, and demand often climbs right when conditions get worst. The riders who keep earning are the ones whose bikes are set up for it.",
        points: [
          {
            title: "Winter tyres on request",
            copy: "Grippier winter tyres are available as an add-on for slush, black ice and the long Estonian off-season — far steadier than summer rubber on a December morning.",
          },
          {
            title: "Battery care for the cold",
            copy: "Cold weather is hard on every e-bike battery. We show you how to store and charge it warm, and an extra battery keeps a long, cold shift from ending early.",
          },
          {
            title: "Service support through the season",
            copy: "Salt, grit and freeze-thaw wear bikes out faster. Maintenance is included year-round, so winter doesn't quietly turn into a string of repair bills.",
          },
        ],
      },
      pickup: {
        kicker: "Pickup in Tallinn",
        heading: "From reserved to riding in a few days.",
        steps: [
          {
            title: "Reserve online",
            copy: "Pick your model and plan and send the request. No payment up front — we confirm a bike is ready for you in Tallinn and send your digital contract to sign on your phone.",
          },
          {
            title: "Collect in Telliskivi or Kesklinn",
            copy: "Come to our central pickup point — minutes from the busiest delivery zones — or ask about local handover. We set up the bike, lock and charger with you.",
          },
          {
            title: "Start your first shift",
            copy: "Leave kitted out for the city: charged, locked and winter-ready if you need it. Most couriers are taking their first Bolt or Wolt orders the same week.",
          },
        ],
      },
      faq: {
        kicker: "Tallinn — good to know",
        heading: "Common questions from Tallinn couriers.",
        items: [
          {
            q: "Can I use the bike for Bolt or Wolt in Tallinn?",
            a: "Yes — the fleet is built for city delivery shifts and suits couriers on any major platform in Tallinn. We're an independent rental service and aren't officially affiliated with Bolt, Wolt or any delivery platform.",
          },
          {
            q: "Where do I pick the bike up?",
            a: "From our Telliskivi or Kesklinn pickup point, both a short ride from the busiest delivery areas, or ask about local handover. We hand the bike over in person and set it up with you.",
          },
          {
            q: "Is it ready for Tallinn winters?",
            a: "Yes. Winter tyres are available as an add-on and maintenance is included year-round. We'll also show you how to look after the battery in the cold so your range holds up.",
          },
          {
            q: "I just moved to Tallinn — can I start quickly?",
            a: "That's exactly who monthly rental suits. Reserve online, sign on your phone and collect in the centre — most couriers are delivering within the same week, with no large purchase first.",
          },
        ],
      },
    },
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
    neighbourhoods: ["Kallio", "Punavuori", "Kamppi", "Töölö", "Sörnäinen", "Lauttasaari"],
  },
};

export const getCityContent = (id: string): CityContent | undefined => cityContent[id];

/** Whether a city has rich, hand-written local sections (rent-vs-buy, winter, etc.). */
export const hasExtendedContent = (id: string): boolean => Boolean(cityContent[id]?.extended);
