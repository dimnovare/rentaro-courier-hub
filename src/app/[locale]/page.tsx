import type { Metadata } from "next";
import { defaultOgImages } from "@/lib/og";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { HeroServer } from "@/components/sections/HeroServer";
import { PopularModels } from "@/components/sections/PopularModels";
import { Showcase } from "@/components/sections/Showcase";
import { Pricing } from "@/components/sections/Pricing";
import { Fleet } from "@/components/sections/Fleet";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Cities } from "@/components/sections/Cities";
import { Accessories } from "@/components/sections/Accessories";
import { Service } from "@/components/sections/Service";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";
import { getSettings } from "@/services/settingsService";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  // Localized <title>/<meta description> — ET/RU queries drive most traffic
  // (GSC), and without this every locale inherited the English root title.
  const t = await getTranslations({ locale: loc, namespace: "pageMeta.home" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: buildAlternates(loc, "/"),
    openGraph: { locale: loc, title, description, images: defaultOgImages },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Home() {
  const settings = await getSettings();
  return (
    <main>
      <HeroServer />
      <PopularModels />
      <Showcase />
      <Pricing />
      <Fleet />
      <HowItWorks />
      <Cities />
      {settings.showAccessories && <Accessories compact />}
      <Service />
      <Faq />
      <FinalCta />
    </main>
  );
}
