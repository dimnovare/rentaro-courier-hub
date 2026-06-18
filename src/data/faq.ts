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
    a: "Pricing is per 30-day period. The 30-day plan is €5.90/day, the 6-month plan €4.90/day, and the 12-month plan €3.90/day. The same plan pricing applies across every model.",
  },
  {
    q: "Is maintenance included?",
    a: "Yes. Brake adjustments, puncture handling and general service are included in every plan. If a bike needs longer repair we replace it where stock allows, so your shifts keep running.",
  },
  {
    q: "Can I rent an extra battery?",
    a: "Yes. An extra battery is available as an add-on for long delivery days. The Engine Pro 2.0 carries an 832 Wh pack and the Air One Pro supports a dual-battery mode for extra range on demanding days.",
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
