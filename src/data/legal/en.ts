/**
 * SOURCE: /api/public/legal — structured legal/policy copy for the
 * /rules, /privacy and /terms pages.
 *
 * rentaro is operated by Valguse Kodu OÜ, an Estonian private limited company
 * renting delivery e-bikes by the month to couriers in Estonia (Tallinn) and
 * Latvia (Riga). Pricing, the 30-day minimum and the deposit (equal to the
 * selected plan's 30-day price) reflect the locked business rules.
 *
 * Company-specific details (registration code, registered address, VAT number,
 * support email and phone) are taken from the signed contract template. Brand
 * prose uses lowercase "rentaro"; the operating legal entity is
 * "Valguse Kodu OÜ", which operates the Rentaro brand.
 */

import type { LegalDoc } from "./types";

/** Shared "last updated" date for every legal document. */
const LAST_UPDATED = "30 May 2026";

/* ============================================================
   Rental rules — /rules
   ============================================================ */
export const rentalRules: LegalDoc = {
  title: "Rental rules",
  updated: LAST_UPDATED,
  intro:
    "These rules explain how a rentaro e-bike rental works in practice — who can rent, the 30-day minimum and plan terms, your deposit, what is included, how to use and care for the bike, and what happens with maintenance, damage, theft and returns. They form part of the rental agreement you sign with Valguse Kodu OÜ before pickup. If anything here conflicts with your signed rental agreement, the signed agreement applies.",
  sections: [
    {
      heading: "Who can rent",
      body: [
        "To rent a rentaro e-bike you must be at least 18 years old, hold a valid government-issued identity document and complete our identity verification. You must provide accurate, current information and be legally able to enter into a rental contract in Estonia or Latvia.",
        "The rental is personal to you, the named renter. You are responsible for the bike at all times while it is in your care. You must not lend, sublet, hand over or transfer the bike, battery, charger, lock or accessories to anyone else, and you must not let anyone else ride it, unless we have agreed this with you in writing.",
        "We may decline a booking, or pause or end an active rental, where identity cannot be verified, where the information provided turns out to be inaccurate, where payment or the deposit cannot be taken, or where these rules or the rental agreement are not followed.",
      ],
    },
    {
      heading: "Rental term and plans",
      body: [
        "The minimum rental period is 30 days. You choose your plan at booking: a flexible 30-day plan, a 6-month plan or a 12-month plan. The longer plans carry a lower daily rate in exchange for a longer commitment.",
        "Pricing is charged per 30-day period at the daily rate of the plan you choose: €5.90 per day on the 30-day plan (€177 per 30 days), €4.90 per day on the 6-month plan (€147 per 30 days) and €3.90 per day on the 12-month plan (€117 per 30 days). The 6-month and 12-month rates are the recurring 30-day price for the duration of the commitment you select — they are not a single one-off payment for the whole period.",
        "Payments run per 30-day period. Your first payment — due after approval, once you have accepted the rental agreement — covers the first 30 days, any add-on accessories and, if you chose delivery, a one-time delivery fee; the refundable deposit is collected alongside it. Before each following 30-day period we send an invoice for that period (bike plus your add-ons), payable by bank transfer. The delivery fee is never charged again.",
        "After your first 30 days you can extend month to month, switch to a longer plan, or arrange a return. To extend, change or end your rental, give us notice through the contact channels confirmed at pickup, in good time before your current period ends. Ending a longer commitment early may affect the deposit and any agreed early-termination terms set out in your rental agreement.",
      ],
    },
    {
      heading: "Deposit",
      body: [
        "A refundable security deposit is required before pickup. The deposit equals the 30-day price of the plan you select: €177 on the 30-day plan, €147 on the 6-month plan and €117 on the 12-month plan. The exact amount is confirmed during booking before you pay.",
        "The deposit secures your obligations under the rental. We may apply it towards, or deduct from it, amounts you owe us — for example damage beyond fair wear and tear, missing or damaged equipment (lock, charger, battery or accessories), unpaid rental charges, cleaning where the bike is returned excessively dirty, or charges arising from late or non-return.",
        "After the bike is returned and inspected, and once any amounts owed are settled, we refund the remaining deposit to the payment method used, normally within 14 days of return. Where we need to deduct from the deposit, we will explain the reason and amount before completing the refund.",
      ],
    },
    {
      heading: "What is included",
      body: [
        "Every plan includes the e-bike, a battery and a charger, together with routine service support — brake and gear adjustments, puncture handling, general maintenance and wear-related repairs that are not caused by misuse.",
        "Optional accessories such as an extra battery, delivery bag, phone holder, helmet, heavy-duty lock or winter tyres can be added to your rental for an additional charge and are confirmed at booking. Any add-on equipment is part of the rental and must be returned with the bike.",
      ],
    },
    {
      heading: "Permitted and prohibited use",
      body: [
        "rentaro e-bikes are built for city delivery shifts and everyday urban riding in the cities where we operate. Ride within the bike's stated load and rider-weight limits, keep it in a roadworthy condition, and use it only on surfaces and in conditions it is designed for.",
        "You must not: modify, tamper with or attempt to repair the bike, battery, motor, controller, lock or electronics; remove or defeat any tracking, locking or speed-limiting equipment; use the bike for racing, stunts, off-road abuse, towing, or to carry passengers it is not built for; sublet or commercially re-rent the bike; or use it for any unlawful purpose or while under the influence of alcohol or drugs.",
        "You must not take the bike outside Estonia and Latvia, or outside any service area we tell you about, without our prior written agreement.",
      ],
    },
    {
      heading: "Traffic rules and safe riding",
      body: [
        "You are responsible for riding lawfully and safely. Follow the road-traffic and light-electric-vehicle rules that apply in Estonia or Latvia, including rules on where you may ride, speed, right of way and giving way to pedestrians. Use lights in the dark or in poor visibility and signal your intentions to other road users.",
        "We strongly recommend wearing a helmet on every ride; in some situations and for some riders it is required by law. Do not use a phone in your hand while riding — use a phone holder. You are responsible for any fines, penalties or charges arising from how you ride or where you park or leave the bike.",
      ],
    },
    {
      heading: "Charging and battery care",
      body: [
        "Charge the battery only with the charger we provide and follow the safe-charging guidance given at pickup. Charge in a dry, ventilated indoor space away from heat sources and flammable materials, do not leave a charging battery unattended for long periods, and do not charge a battery that is visibly damaged, swollen or wet — contact us instead.",
        "Keep the battery and charger dry and protect them from impacts and extreme temperatures. If you rent an extra battery for longer delivery days, treat it with the same care as the bike. You are responsible for loss of or damage to the battery and charger while they are in your care.",
      ],
    },
    {
      heading: "Locking and security",
      body: [
        "Whenever the bike is unattended, even briefly, lock it with the supplied lock to a fixed, solid object and secure it as instructed at pickup. Never leave the bike unlocked, never leave the battery or charger unattended in public, and do not leave the keys with the bike.",
        "Failing to lock or secure the bike properly may make you responsible for the cost of loss, theft or damage that results. If extra security equipment is included with your model, use it as directed.",
      ],
    },
    {
      heading: "Maintenance and reporting faults",
      body: [
        "Keep the bike reasonably clean and check before each shift that the brakes, tyres, lights and battery are working. Report any fault, warning, unusual noise or damage to us as soon as you notice it, and stop riding if the bike is unsafe.",
        "Routine and wear-related servicing is included. Do not arrange third-party repairs or modifications without contacting us first — unauthorised repairs may be charged to you. Where a bike needs longer repair we aim to provide a replacement while stock allows so your shifts keep running, but a replacement cannot be guaranteed at all times.",
      ],
    },
    {
      heading: "Damage, theft and accidents",
      body: [
        "Tell us as soon as possible — and at the latest within 24 hours — about any accident, damage, loss or theft involving the bike or its equipment. In the event of theft, vandalism or a road accident, you must also report it to the police, obtain a reference number and share it with us. Do not admit fault or settle with third parties on our behalf.",
        "If the bike is stolen, do not stop looking for it on our instruction, return the key and any remaining equipment to us, and provide the police reference. You remain responsible for the bike until it is recovered or the matter is closed with us.",
        "You are responsible for damage beyond fair wear and tear, for missing or damaged equipment, and for loss or theft that results from your failure to lock, secure or care for the bike as required. Where you are responsible, we may charge the repair or replacement cost, up to the value of the bike and equipment, and may apply the deposit towards it. We will explain any charge before it is taken.",
      ],
    },
    {
      heading: "Winter and seasonal use",
      body: [
        "rentaro bikes can be ridden year-round, but winter conditions need extra care. Reduce speed, allow longer stopping distances, and take particular care on ice, snow and wet leaves. Cold weather can also reduce how long a battery lasts between charges.",
        "Winter tyres are available as an accessory for colder months. Keep the battery and charger warm and dry where you can, as very low temperatures can affect battery performance and charging.",
      ],
    },
    {
      heading: "Returns and handover",
      body: [
        "At the end of your rental, return the bike at the agreed time and place with all supplied equipment — battery, charger, lock, keys and any accessories — in clean, working condition allowing for fair wear and tear.",
        "We inspect the bike at handover and note its condition. Once any outstanding charges are settled, we release the remaining deposit as described above. Bikes returned late, returned incomplete, or not returned at all may incur additional daily charges, replacement costs and deductions from the deposit, and we may treat a bike that is not returned as a loss and recover its value.",
      ],
    },
  ],
};

/* ============================================================
   Terms and conditions — /terms
   ============================================================ */
export const termsOfService: LegalDoc = {
  title: "Terms and conditions",
  updated: LAST_UPDATED,
  intro:
    "These terms govern your use of the rentaro website and your booking of an e-bike rental. rentaro is operated by Valguse Kodu OÜ. The terms sit alongside the rental rules and the rental agreement you sign before pickup; the signed rental agreement governs the rental itself. Please read these terms carefully before booking.",
  sections: [
    {
      heading: "Who we are and how to reach us",
      body: [
        "The rentaro service is operated by Valguse Kodu OÜ (operating as Rentaro), a private limited company registered in Estonia (registration code 14621591, registered address Narva mnt 128-4, Tallinn 10127, Estonia, VAT number EE102246089). In these terms \"rentaro\", \"we\", \"us\" and \"our\" mean Valguse Kodu OÜ (operating as Rentaro), and \"you\" means the customer.",
        "You can contact us by email at info@rentaro.ee or by phone at +372 5649 7933. These terms are written in English; the rental agreement and any required statutory information are provided to you before you commit.",
      ],
    },
    {
      heading: "About these terms",
      body: [
        "By using the rentaro website or submitting a booking you agree to these terms. If you do not agree, please do not use the website or book a rental.",
        "We may update these terms from time to time, for example to reflect changes to our service, pricing structure or the law. The version published on the website applies to your use of it, and the terms in force when your rental is confirmed apply to that rental. We will give reasonable notice of material changes that affect an active rental.",
      ],
    },
    {
      heading: "The rentaro service",
      body: [
        "rentaro offers monthly and longer-term e-bike rentals aimed at delivery couriers, together with accessories and service support, in Estonia (Tallinn) and Latvia (Riga). Our bikes are suitable for city delivery work.",
        "rentaro is an independent rental service. We are not officially affiliated with, partnered with, or endorsed by Bolt, Wolt or any other delivery platform. Any mention of delivery work describes what the bikes are suitable for and does not imply a partnership.",
      ],
    },
    {
      heading: "Bookings and forming the contract",
      body: [
        "A booking submitted through the website is a request to rent; it does not by itself create a binding rental. A binding rental is formed only once we confirm your booking, you complete identity verification, you pay the first period and deposit, and you sign the rental agreement.",
        "We may decline or cancel a booking before it becomes binding — for example where identity cannot be verified, where a suitable bike is not available, where payment or the deposit cannot be taken, or where these terms or the rental rules are not met. If we cancel before the rental starts, we refund any amounts you have paid for that booking.",
      ],
    },
    {
      heading: "Identity verification and signing",
      body: [
        "Before a rental starts we verify your identity and have you sign the rental agreement. Identity documents and any required personal details are collected and handled securely as described in our privacy policy.",
        "The rental agreement is signed in person at pickup, or — where we send you the agreement in advance — you may sign it yourself and return the signed copy through your rental portal, on paper or digitally (for example with DigiDoc / Smart-ID). A rental cannot start, and a bike will not be handed over, until verification is complete and the agreement is signed.",
      ],
    },
    {
      heading: "Fees, billing and payment",
      body: [
        "Pricing is per 30-day period at the daily rate of the plan you choose, calculated as the daily rate multiplied by 30: €5.90/day = €177 per 30 days (30-day plan), €4.90/day = €147 per 30 days (6-month plan) and €3.90/day = €117 per 30 days (12-month plan). The minimum rental period is 30 days. Prices include VAT where applicable.",
        "Your first payment is due after your booking is approved and you have accepted the rental agreement. It covers the first 30-day period, any add-on accessories you selected and, where you chose delivery instead of free pickup, a one-time delivery fee; the refundable deposit is collected alongside it. For each subsequent 30-day period of your plan we issue an invoice before the period begins — covering the bike and your add-on accessories for that period — payable by bank transfer. The delivery fee is charged only once and is never part of the recurring 30-day price.",
        "Payments are made by bank transfer to the account stated on the invoice, or in cash where agreed at handover. Charges for damage, missing equipment or late or non-return are invoiced as set out in the rental rules. If a payment is not made when due, we may pause the rental until it is resolved. Prices may change for future bookings or for renewals after your committed period, with reasonable notice.",
      ],
    },
    {
      heading: "Deposit and your liability",
      body: [
        "A refundable security deposit equal to the 30-day price of your plan (€177, €147 or €117) is taken before pickup and handled as described in the rental rules. We may apply it towards amounts you owe, and refund the balance after the bike is returned and inspected.",
        "You are responsible for the bike and equipment while they are in your care. Where you are responsible for damage beyond fair wear and tear, missing equipment, or loss or theft caused by your failure to secure the bike, your liability may exceed the deposit, up to the repair or replacement value of the bike and equipment. We are not liable for your loss of earnings or other indirect losses arising from a bike being unavailable, except where the law does not allow this to be excluded.",
      ],
    },
    {
      heading: "Delivery, pickup and your obligations",
      body: [
        "We will agree a pickup or delivery time and place with you. You must be available, bring valid identification, and complete handover. At handover you confirm the bike's condition and receive the equipment that is part of your rental.",
        "Throughout the rental you agree to provide accurate information, keep your contact and payment details current, ride lawfully, care for the bike and equipment, and follow the rental rules — including charging, locking, maintenance, reporting faults, and the damage, theft and accident procedure.",
      ],
    },
    {
      heading: "Our service and support",
      body: [
        "We provide the website and rental service with reasonable skill and care. Routine and wear-related servicing is included in every plan, and we aim to keep your bike on the road and to offer a replacement where a repair takes longer, while stock allows.",
        "We may need to carry out maintenance, recalls or safety checks during your rental and will arrange these with you. We do not guarantee uninterrupted availability of the website or that a specific bike, model or accessory will always be available.",
      ],
    },
    {
      heading: "Suspension and termination",
      body: [
        "We may suspend or end a rental, with notice where reasonably possible, if you break these terms, the rental rules or the rental agreement; if payment or the deposit cannot be taken; if identity or information cannot be verified; if the bike is used unlawfully or unsafely; or if required by law. On termination you must return the bike and all equipment promptly.",
        "You may end your rental in line with your plan and the rental rules — at the end of the 30-day minimum on the flexible plan, or as agreed for a longer commitment. Ending a committed plan early may involve the early-termination terms set out in your rental agreement.",
      ],
    },
    {
      heading: "Cancellation and right of withdrawal",
      body: [
        "If you are a consumer in the EU, you generally have the right to withdraw from a distance contract within 14 days of entering into it, without giving a reason. To withdraw, tell us clearly within that period using the contact details above; you do not have to use a particular form.",
        "Because a rental is a service, you can ask us to start it during the 14-day withdrawal period. If you ask us to start (for example, by taking the bike) and you then withdraw, you must pay a proportionate amount for the part of the service already provided up to the point you tell us you are withdrawing. If the service is fully performed during the 14 days with your express prior consent and your acknowledgement that you lose the right of withdrawal once it is fully performed, the right of withdrawal no longer applies.",
        "Nothing in this section limits the cancellation and refund rights described under Bookings and forming the contract, or any rights you have under Estonian or EU consumer law.",
      ],
    },
    {
      heading: "Insurance",
      body: [
        "Unless we expressly tell you in writing that specific insurance cover is included with your rental, you should not assume the bike, you as the rider, or third parties are covered by insurance through rentaro. Any insurance cover that is included will be described in your rental agreement, along with what it covers and any excess that applies.",
        "We recommend you consider your own suitable insurance for delivery work and personal injury. You remain responsible for the bike and equipment, and for third-party claims arising from your riding, as set out in the rental rules and the rental agreement.",
      ],
    },
    {
      heading: "Limitation of liability",
      body: [
        "We provide the website and service with reasonable care, but to the extent permitted by law we are not liable for indirect, incidental or consequential loss, or for loss of profit, income or earnings, arising from the website, a rental, downtime or the unavailability of a bike, model or accessory.",
        "Nothing in these terms excludes or limits our liability where it would be unlawful to do so — including liability for death or personal injury caused by our negligence, for fraud, or for any rights you have as a consumer that cannot be excluded. Detailed liability terms for the rental itself are set out in the rental rules and the rental agreement.",
      ],
    },
    {
      heading: "Force majeure",
      body: [
        "We are not responsible for failing to perform, or for delay in performing, our obligations where this is caused by events outside our reasonable control — including extreme weather, natural disasters, fire, flood, epidemic or pandemic, strikes, failure of utilities, transport or communications networks, theft or vandalism beyond our control, or acts of government or public authorities.",
        "If such an event affects your rental, we will let you know and work with you on a fair solution, which may include rescheduling, providing a replacement where possible, or adjusting the affected period.",
      ],
    },
    {
      heading: "Complaints and dispute resolution",
      body: [
        "If something goes wrong, please contact us first using the details above so we can try to put it right. We aim to acknowledge complaints promptly and resolve them fairly.",
        "If we cannot resolve a dispute, you as a consumer may refer it to the Consumer Disputes Committee (Tarbijavaidluste komisjon) operating at the Estonian Consumer Protection and Technical Regulatory Authority (Tarbijakaitse ja Tehnilise Järelevalve Amet), Endla 10a, 10122 Tallinn. You may also use the European Commission's Online Dispute Resolution platform at ec.europa.eu/odr. These routes are in addition to your right to go to court.",
      ],
    },
    {
      heading: "Governing law and jurisdiction",
      body: [
        "These terms, and any rental booked through the website, are governed by the law of Estonia. If you are a consumer, you also benefit from any mandatory protections of the law of the country where you live, and nothing here removes those protections.",
        "Disputes are subject to the courts of Estonia, unless mandatory consumer law gives you the right to bring proceedings in the courts where you live. If any part of these terms is found unenforceable, the remaining parts continue to apply.",
      ],
    },
  ],
};

/* ============================================================
   Cookie policy — embedded in the privacy policy and exported
   separately for reuse (e.g. a future /cookies page).
   ============================================================ */
export const cookiePolicy: LegalDoc = {
  title: "Cookie policy",
  updated: LAST_UPDATED,
  intro:
    "This cookie policy explains the cookies and similar technologies the rentaro website uses, what they do and how long they last. It forms part of our privacy policy. You control optional cookies through the consent banner shown on your first visit, and you can change your choice at any time.",
  sections: [
    {
      heading: "How we use cookies",
      body: [
        "A cookie is a small text file stored on your device by your browser. We use a small number of cookies to make the site work, to remember your choices, and — only with your consent — to understand how the site is used so we can improve it.",
        "We group cookies as strictly necessary or functional cookies, which are always on because the site needs them, and analytics cookies, which load only after you accept them. We do not use advertising or cross-site tracking cookies.",
      ],
    },
    {
      heading: "Functional cookies",
      body: [
        "NEXT_LOCALE — remembers the language you selected so the site shows in your chosen language on your next visit. Functional; stored for up to 12 months.",
        "rentaro_consent — records your cookie choice (\"granted\" or \"denied\") so we do not ask again on every visit and so analytics stays off unless you have agreed. Strictly necessary for consent management; stored for up to 12 months.",
      ],
    },
    {
      heading: "Analytics cookies (consent-based)",
      body: [
        "Google Analytics — helps us understand aggregate, anonymised website usage such as which pages are visited and how visitors move through the booking flow. Set by Google only after you accept analytics; cookies typically last from the end of your session up to about 24 months.",
        "PostHog — provides privacy-conscious product analytics about how the site and booking flow are used, hosted in the EU. Set only after you accept analytics; cookies typically last up to about 12 months.",
        "If you decline or choose necessary-only, these analytics tools are not loaded and their cookies are not set.",
      ],
    },
    {
      heading: "Managing your choices",
      body: [
        "When you first visit, the consent banner lets you accept analytics, decline, or allow necessary cookies only. Your choice is saved in the rentaro_consent cookie, and analytics only loads if you accept.",
        "You can change your mind at any time by clearing the rentaro_consent cookie in your browser, which makes the banner appear again, and by adjusting cookie settings in your browser. Blocking strictly necessary or functional cookies may affect how the site works, such as remembering your language.",
      ],
    },
  ],
};

/* ============================================================
   Privacy policy — /privacy
   ============================================================ */
export const privacyPolicy: LegalDoc = {
  title: "Privacy policy",
  updated: LAST_UPDATED,
  intro:
    "This policy explains what personal data rentaro collects, why and on what legal basis we use it, who we share it with, how long we keep it, and the rights you have under the EU General Data Protection Regulation (GDPR). rentaro is operated by Valguse Kodu OÜ, which is the controller of your personal data. It also includes our cookie policy.",
  sections: [
    {
      heading: "Who we are (data controller)",
      body: [
        "rentaro is operated by Valguse Kodu OÜ (operating as Rentaro), a private limited company registered in Estonia, which is the controller responsible for your personal data. Registered address: Narva mnt 128-4, Tallinn 10127, Estonia. Registration code: 14621591.",
        "For any privacy question, or to exercise your rights, contact us at info@rentaro.ee. We have not appointed a statutory Data Protection Officer where one is not legally required; if that changes, this contact will be updated.",
      ],
    },
    {
      heading: "The data we collect",
      body: [
        "Booking and contact details: your first and last name, email address, phone number, city and preferred start date, and any notes you send us.",
        "Identity and contract details: to enter into the rental agreement we collect identity-document information and your personal identification code or date of birth. These are collected and handled securely, are used only for verification and the contract, and are not stored in our website front-end.",
        "Rental, payment and deposit details: the plan and accessories you choose, the bike assigned to you, billing and deposit records, and payment confirmations. Card details are entered with and held by our payment provider; we do not store full card numbers.",
        "Signing and communications: records of the rental agreement and its signing, and the emails and messages we exchange with you about your booking and rental.",
        "Technical and usage data: device, browser and similar information, and — only where you have consented — analytics about how you use the website. See the cookie policy below.",
      ],
    },
    {
      heading: "Why we use your data and our legal bases",
      body: [
        "To take and manage your booking, verify your identity, prepare and sign the rental agreement, hand over and operate your rental, and provide service and maintenance support — legal basis: performance of a contract with you (and steps at your request before entering it).",
        "To take payments and the deposit, manage renewals, and recover amounts owed for damage, missing equipment or late or non-return — legal basis: performance of a contract, and our legitimate interest in being paid and protecting our property.",
        "To meet legal obligations, such as accounting, tax and consumer-law record-keeping, and to respond to lawful requests — legal basis: compliance with a legal obligation.",
        "To keep our service and website secure, prevent fraud and misuse, handle complaints and defend legal claims — legal basis: our legitimate interests in running and protecting the service. Where we rely on legitimate interests, we balance them against your rights.",
        "To understand and improve how the website and booking flow are used through analytics — legal basis: your consent, which you can withdraw at any time without affecting your rental.",
      ],
    },
    {
      heading: "Who we share your data with (processors)",
      body: [
        "We use trusted service providers who process personal data on our behalf as processors, under data processing agreements and only on our instructions. We do not sell your personal data.",
        "Resend — sends transactional and service emails about your booking and rental.",
        "Montonio — processes payments and the security deposit.",
        "Dokobit — handles identity-supported electronic signing of the rental agreement.",
        "Vercel — hosts and serves the rentaro website.",
        "Railway — hosts our application backend and database, in the EU.",
        "Google Analytics and PostHog — provide website and product analytics, and run only where you have consented; PostHog is hosted in the EU.",
        "We may also disclose data where the law requires it, to protect our rights or safety, or in connection with a business sale or reorganisation, in which case it remains protected under this policy.",
      ],
    },
    {
      heading: "International transfers",
      body: [
        "We aim to keep personal data within the European Economic Area (EEA). Our hosting (Vercel, Railway) and EU-hosted analytics (PostHog) are configured to keep data in the EU/EEA where possible.",
        "Some providers, such as Google Analytics, may process limited data outside the EEA. Where that happens, we rely on appropriate safeguards — such as the European Commission's standard contractual clauses or an adequacy decision — so your data stays protected to EU standards.",
      ],
    },
    {
      heading: "How long we keep your data",
      body: [
        "We keep personal data only for as long as needed for the purposes above, then delete or anonymise it.",
        "Booking and rental records, and accounting and tax records, are kept for the periods required by Estonian law (accounting records are generally retained for seven years).",
        "Identity-verification documents and your personal identification code are kept only as long as needed to enter and support the rental contract and to meet legal obligations, and are then deleted. Analytics data is retained for a limited period in line with the tools' settings, and consent records are kept for as long as needed to evidence your choice. Marketing or optional-message consents are kept until you withdraw them.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "Under the GDPR you have the right to access your personal data; to have inaccurate data corrected; to have data erased; to restrict or object to certain processing; to data portability; and, where we rely on consent, to withdraw it at any time without affecting processing already carried out.",
        "To exercise any of these rights, contact us using the details above. We will respond within the time limits set by law. You also have the right to lodge a complaint with a supervisory authority — in Estonia, the Data Protection Inspectorate (Andmekaitse Inspektsioon) — or with the authority in the EU country where you live or work.",
      ],
    },
    {
      heading: "Automated decision-making",
      body: [
        "We do not make decisions about you based solely on automated processing that produce legal or similarly significant effects. Identity verification and rental approval involve human review.",
      ],
    },
    /* Cookie policy folded into the privacy policy so the consent banner
       and footer (which both link to /privacy) reach it. The cookiePolicy
       export above reuses the same content for any future /cookies page. */
    ...cookiePolicy.sections,
  ],
};
