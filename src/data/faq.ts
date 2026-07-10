import type { Faq } from "@/types";

/** SOURCE: /api/public/faq — no item is open by default (see defaultOpenFaq). */
export const faqs: Faq[] = [
  {
    q: "Can I use the bike for delivery work?",
    a: "Yes. The rentaro fleet is built for city delivery shifts and suits couriers on any major platform. We are an independent rental service and are not officially affiliated with any delivery platform.",
  },
  {
    q: "What is the minimum rental period?",
    a: "30 days. After your first month you can extend month-to-month or switch to a longer plan with a lower daily rate.",
  },
  {
    q: "How does the pricing work?",
    a: "Pricing is per 30-day period. Your first payment covers the first 30 days, the refundable deposit and any optional paid add-ons you selected. Charger and service support are included with the bike; extra batteries, bags, locks and other gear are separate add-ons.",
  },
  {
    q: "Is maintenance included?",
    a: "Yes. Brake adjustments, puncture handling and routine service support are included in every plan. Damage, theft or misuse follows the rental rules; if a bike needs longer service, we replace it where stock allows.",
  },
  {
    q: "Is an extra battery included?",
    a: "No. The bike comes with its normal battery and charger. An extra battery is available as an optional paid add-on for long delivery days.",
  },
  {
    q: "What deposit is required?",
    a: "A refundable security deposit is taken at pickup. The amount depends on the model and term, and is returned at the end of the rental minus any damage beyond fair wear.",
  },
  {
    q: "Where can I pick up the bike?",
    a: "Collect at a city pickup point or request local delivery where we operate.",
  },
  {
    q: "Do I sign a contract online?",
    a: "Yes — the full rental agreement is digital and signed on your phone before pickup. No paperwork at the depot.",
  },
];

/** Index of the FAQ open by default. -1 means no item is open on load. */
export const defaultOpenFaq = -1;
