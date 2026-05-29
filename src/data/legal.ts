/**
 * SOURCE: /api/public/legal — structured legal/policy copy for the
 * /rules, /privacy and /terms pages.
 *
 * IMPORTANT: every document below is DRAFT PLACEHOLDER copy intended for
 * layout and content structure only. It has not been reviewed by a lawyer
 * and must be checked and approved by qualified legal counsel before
 * rentaro relies on it. Pricing and the 30-day minimum reflect the locked
 * business rules; no other specific legal guarantees are implied.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  /** Document title shown as the page heading. */
  title: string;
  /** Human-readable "last updated" date. */
  updated: string;
  /** Short framing paragraph shown under the title — includes the draft note. */
  intro: string;
  /** Ordered content sections. */
  sections: LegalSection[];
}

/* ============================================================
   Rental rules
   ============================================================ */
export const rentalRules: LegalDoc = {
  title: "Rental rules",
  updated: "29 May 2026",
  intro:
    "These rules explain how a rentaro e-bike rental works — from the minimum term and deposit to maintenance, damage and returns. This is a draft for layout purposes and must be reviewed and approved by legal before it is relied on.",
  sections: [
    {
      heading: "Who can rent",
      body: [
        "To rent a rentaro e-bike you must be of legal age in your country, hold valid identification and complete our identity check. We may decline or end a rental where the information provided cannot be verified.",
        "The rental is personal to you. You should not lend, sublet or transfer the bike to anyone else without our written agreement.",
      ],
    },
    {
      heading: "Rental term and pricing",
      body: [
        "The minimum rental period is 30 days. After your first month you can extend month to month or move to a longer plan with a lower daily rate.",
        "Pricing is charged per 30-day period at the daily rate of the plan you choose: €5.90 per day on the 30-day plan (€177 per 30 days), €4.90 per day on the 6-month plan (€147 per 30 days) and €3.90 per day on the 12-month plan (€117 per 30 days). The longer-term rates are the recurring 30-day price during the chosen commitment, not a one-off payment.",
      ],
    },
    {
      heading: "Deposit",
      body: [
        "A refundable security deposit is taken before pickup. The amount depends on the model and plan you select and is confirmed during booking.",
        "The deposit is returned at the end of the rental after the bike is inspected, less any amounts owed for damage beyond fair wear, missing equipment or unpaid charges.",
      ],
    },
    {
      heading: "Using the bike",
      body: [
        "rentaro e-bikes are built for city delivery shifts and everyday urban riding. Ride lawfully, follow local traffic rules and use the supplied lock whenever the bike is unattended.",
        "Do not modify the bike, its battery, motor or electronics, and do not use it for racing, off-road abuse, towing or any unlawful purpose. Keep within the carrying limits noted at pickup.",
      ],
    },
    {
      heading: "Maintenance and service",
      body: [
        "Routine service is included in every plan — brake adjustments, puncture handling and general servicing. Report faults early so we can keep your bike on the road.",
        "Where a bike needs longer repair we aim to provide a replacement while stock allows, so your shifts keep running. Do not arrange third-party repairs without contacting us first.",
      ],
    },
    {
      heading: "Damage, theft and accidents",
      body: [
        "Tell us as soon as possible about any accident, damage, loss or theft. In the event of theft or a road accident you should also report it to the police and share the reference with us.",
        "You are responsible for the bike and equipment while it is in your care. Charges for damage beyond fair wear, loss of equipment or theft may apply and will be explained before they are taken.",
      ],
    },
    {
      heading: "Charging and batteries",
      body: [
        "Charge the battery with the charger we provide and follow the safe-charging guidance given at pickup. Keep the battery and charger dry and away from heat sources.",
        "Extra batteries are available as an add-on for longer delivery days. Treat any add-on equipment with the same care as the bike itself.",
      ],
    },
    {
      heading: "Ending the rental and returns",
      body: [
        "To end or change your rental, give us notice through the channels confirmed at pickup. Return the bike with all supplied equipment — lock, charger and any accessories — at the agreed time and place.",
        "We inspect the bike on return. Once any outstanding matters are settled, the deposit is released. Bikes returned late or not returned may incur additional charges.",
      ],
    },
  ],
};

/* ============================================================
   Privacy policy
   ============================================================ */
export const privacyPolicy: LegalDoc = {
  title: "Privacy policy",
  updated: "29 May 2026",
  intro:
    "This policy explains what personal data rentaro collects, why we use it and the rights you have under EU data protection law (the GDPR). This is a draft for layout purposes and must be reviewed and approved by legal before it is relied on.",
  sections: [
    {
      heading: "Who we are",
      body: [
        "rentaro provides monthly e-bike rentals for delivery couriers in cities including Tallinn, Riga and Helsinki. For the personal data described here, rentaro acts as the data controller.",
        "If you have a question about your data or this policy, you can contact us using the details published on our website.",
      ],
    },
    {
      heading: "Data we collect",
      body: [
        "Booking and account details such as your name, email address, phone number, city and preferred start date.",
        "Verification details needed to enter a rental agreement, which may include identity-document information and date of birth, collected and handled securely.",
        "Rental and payment details such as the plan you choose, deposit and billing records, and the bike assigned to you.",
        "Technical and usage data such as device and browser information and basic analytics when you use our website.",
      ],
    },
    {
      heading: "How we use your data",
      body: [
        "To take and manage your booking, verify your identity, prepare and sign the rental contract and operate your rental.",
        "To take payments and deposits, provide service and maintenance support and communicate with you about your rental.",
        "To keep our service secure, meet our legal obligations and improve how the website and rental process work.",
      ],
    },
    {
      heading: "Legal bases",
      body: [
        "We process most data to enter into and perform your rental contract, to comply with legal obligations, and for our legitimate interests in running and securing the service.",
        "Where we rely on consent — for example certain analytics or optional messages — you can withdraw it at any time without affecting your rental.",
      ],
    },
    {
      heading: "Sharing your data",
      body: [
        "We share data with service providers who help us operate, such as payment processors, identity and digital-signing providers, hosting and communication tools. They may only use it to provide their service to us.",
        "We may share data where the law requires it, to protect our rights, or in connection with a business transfer. We do not sell your personal data.",
      ],
    },
    {
      heading: "Storage and retention",
      body: [
        "We keep personal data only for as long as needed for the purposes above and to meet legal, accounting and reporting requirements, after which it is deleted or anonymised.",
        "Sensitive verification documents are handled with particular care and are not stored in front-end systems.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "Under the GDPR you can request access to your data, correction, deletion, restriction or portability, and you can object to certain processing.",
        "To exercise these rights, contact us using the details on our website. You also have the right to complain to your local data protection authority.",
      ],
    },
  ],
};

/* ============================================================
   Terms of service
   ============================================================ */
export const termsOfService: LegalDoc = {
  title: "Terms and conditions",
  updated: "29 May 2026",
  intro:
    "These terms govern your use of the rentaro website and the booking of an e-bike rental. They sit alongside the rental agreement you sign before pickup. This is a draft for layout purposes and must be reviewed and approved by legal before it is relied on.",
  sections: [
    {
      heading: "About these terms",
      body: [
        "By using the rentaro website or submitting a booking you agree to these terms. If you do not agree, please do not use the website or book a rental.",
        "We may update these terms from time to time. The version published on the website applies to your use of it.",
      ],
    },
    {
      heading: "The rentaro service",
      body: [
        "rentaro offers monthly and longer-term e-bike rentals aimed at delivery couriers, together with accessories and service support.",
        "Our bikes are suitable for city delivery work. rentaro is an independent rental service and is not officially affiliated with or partnered with any delivery platform.",
      ],
    },
    {
      heading: "Bookings and contract",
      body: [
        "A booking submitted through the website is a request to rent. A rental becomes binding once we confirm it, complete identity verification and you sign the rental agreement.",
        "We may decline or cancel a booking — for example where verification cannot be completed, stock is unavailable or these terms are not met.",
      ],
    },
    {
      heading: "Pricing and payment",
      body: [
        "Pricing is per 30-day period at the daily rate of the plan you choose, as set out on the pricing page and in the rental rules. The minimum rental period is 30 days.",
        "A refundable deposit applies and is confirmed during booking. Payments and deposits are taken through our payment provider, and prices may change for future bookings.",
      ],
    },
    {
      heading: "Your responsibilities",
      body: [
        "You agree to provide accurate information, ride lawfully and care for the bike and equipment in line with the rental rules.",
        "You are responsible for the bike while it is in your care, including reporting damage, loss or theft promptly as described in the rental rules.",
      ],
    },
    {
      heading: "Liability",
      body: [
        "We provide the website and service with reasonable care, but to the extent permitted by law we are not liable for indirect or consequential loss, or for matters outside our reasonable control.",
        "Nothing in these terms limits liability that cannot be limited under applicable law. Detailed liability terms for the rental itself are set out in the rental agreement.",
      ],
    },
    {
      heading: "Governing law",
      body: [
        "These terms are governed by the law of the country in which your rental is provided, and disputes are subject to the courts of that jurisdiction, unless mandatory local law provides otherwise.",
        "If any part of these terms is found unenforceable, the remaining parts continue to apply.",
      ],
    },
  ],
};
