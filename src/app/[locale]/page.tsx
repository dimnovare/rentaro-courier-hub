import type { Metadata } from "next";
import { defaultOgImages } from "@/lib/og";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  return {
    alternates: buildAlternates(loc, "/"),
    openGraph: { locale: loc, images: defaultOgImages },
  };
}

export default function Home() {
  return (
    <main>
      <HeroServer />
      <PopularModels />
      <Showcase />
      <Pricing />
      <Fleet />
      <HowItWorks />
      <Cities />
      <Accessories />
      <Service />
      <Faq />
      <FinalCta />
    </main>
  );
}
