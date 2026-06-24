import type { LocalizedStrings } from "@/types";
import { apiGet } from "./api";

/** SOURCE: /api/public/marquee — admin edits the hero trust-marquee items per language. */
const staticMarquee: LocalizedStrings = {
  en: [
    "Minimum 30 days",
    "Service support included",
    "Extra battery available",
    "Clear rental contract",
    "Built for delivery shifts",
    "Pickup or local delivery",
  ],
  et: [
    "Minimaalselt 30 päeva",
    "Teenindustugi sees",
    "Lisaaku saadaval",
    "Selge üürileping",
    "Ehitatud tarnevahetusteks",
    "Järeletulek või kohale toomine",
  ],
  lv: [
    "Minimums 30 dienas",
    "Servisa atbalsts iekļauts",
    "Pieejams papildu akumulators",
    "Skaidrs nomas līgums",
    "Būvēti piegādes maiņām",
    "Saņemšana vai vietējā piegāde",
  ],
  fi: [
    "Vähintään 30 päivää",
    "Huoltotuki sisältyy",
    "Lisäakku saatavilla",
    "Selkeä vuokrasopimus",
    "Rakennettu lähettivuoroihin",
    "Nouto tai paikallinen toimitus",
  ],
  ru: [
    "Минимум 30 дней",
    "Сервис включён",
    "Доступна запасная батарея",
    "Понятный договор аренды",
    "Создан для смен доставки",
    "Самовывоз или доставка по городу",
  ],
};

export const marqueeService = {
  getMarquee: () => apiGet<LocalizedStrings>("/api/public/marquee", staticMarquee),
};
