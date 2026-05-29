import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import en from "../../messages/en.json";
import et from "../../messages/et.json";
import lv from "../../messages/lv.json";
import fi from "../../messages/fi.json";
import ru from "../../messages/ru.json";

/**
 * Static catalog map. Explicit imports (rather than a template-literal dynamic
 * import) keep the bundler from building a dynamic-context module, which can
 * cache stale JSON content when only the file body — not the file set —
 * changes. Each locale is a direct module reference that invalidates reliably.
 */
const catalogs: Record<Locale, Record<string, unknown>> = { en, et, lv, fi, ru };

/**
 * Resolves the active locale from the NEXT_LOCALE cookie (no i18n routing /
 * no `[locale]` segment). Falls back to the default locale when the cookie is
 * missing or holds an unsupported value, then loads the matching catalog.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: catalogs[locale],
  };
});
