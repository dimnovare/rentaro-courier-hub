// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, type Locale } from "./config";
import en from "../../messages/en.json";
import et from "../../messages/et.json";
import lv from "../../messages/lv.json";
import fi from "../../messages/fi.json";
import ru from "../../messages/ru.json";

const catalogs: Record<Locale, Record<string, unknown>> = { en, et, lv, fi, ru };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;
  return {
    locale,
    messages: catalogs[locale],
  };
});
