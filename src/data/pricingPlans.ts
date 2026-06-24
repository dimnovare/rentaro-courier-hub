import type { PricingPlan } from "@/types";

/** SOURCE: /api/public/pricing — admin edits daily price + perks per term. */
export const pricingPlans: PricingPlan[] = [
  {
    id: "p30",
    term: "30 days",
    months: 1,
    daily: 5.9,
    monthly: 177,
    tag: "Flexible",
    featured: false,
    perks: {
      en: ["Service support included", "Extend or switch anytime"],
      et: ["Teenindustugi sees", "Pikenda või vaheta igal ajal"],
      lv: ["Servisa atbalsts iekļauts", "Pagarini vai maini jebkurā brīdī"],
      fi: ["Huoltotuki sisältyy", "Jatka tai vaihda milloin tahansa"],
      ru: ["Сервис включён", "Продление или смена в любой момент"],
    },
  },
  {
    id: "p180",
    term: "6 months",
    months: 6,
    daily: 4.9,
    monthly: 147,
    tag: "Most popular",
    featured: true,
    perks: {
      en: [
        "Everything in 30 days",
        "Lower daily rate",
        "Priority maintenance",
        "Free model swap once",
      ],
      et: [
        "Kõik, mis 30 päeva paketis",
        "Madalam päevatasu",
        "Eelishooldus",
        "Tasuta mudelivahetus üks kord",
      ],
      lv: [
        "Viss, kas 30 dienu plānā",
        "Zemāka dienas likme",
        "Prioritārā apkope",
        "Bezmaksas modeļa maiņa vienreiz",
      ],
      fi: [
        "Kaikki 30 päivän suunnitelmasta",
        "Edullisempi päivähinta",
        "Etusijahuolto",
        "Maksuton mallinvaihto kerran",
      ],
      ru: [
        "Всё, что в 30 днях",
        "Ниже дневная ставка",
        "Приоритетное обслуживание",
        "Одна бесплатная смена модели",
      ],
    },
  },
  {
    id: "p365",
    term: "12 months",
    months: 12,
    daily: 3.9,
    monthly: 117,
    tag: "Best price",
    featured: false,
    perks: {
      en: [
        "Everything in 6 months",
        "Lowest daily rate",
        "Free accessory bundle",
      ],
      et: [
        "Kõik, mis 6 kuu paketis",
        "Madalaim päevatasu",
        "Tasuta lisavarustuse komplekt",
      ],
      lv: [
        "Viss, kas 6 mēnešu plānā",
        "Zemākā dienas likme",
        "Bezmaksas piederumu komplekts",
      ],
      fi: [
        "Kaikki 6 kuukauden suunnitelmasta",
        "Edullisin päivähinta",
        "Maksuton lisävarustepaketti",
      ],
      ru: [
        "Всё, что в 6 месяцах",
        "Самая низкая дневная ставка",
        "Бесплатный набор аксессуаров",
      ],
    },
  },
];

export const getPlanById = (id: string) =>
  pricingPlans.find((p) => p.id === id);
