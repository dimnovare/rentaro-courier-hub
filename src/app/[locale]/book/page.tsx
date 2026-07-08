import type { Metadata } from "next";
import { defaultOgImages, defaultTwitterImages } from "@/lib/og";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getSettings } from "@/services/settingsService";
import { modelService } from "@/services/modelService";
import { cityService } from "@/services/cityService";
import { accessoryService } from "@/services/accessoryService";

const title = "Reserve your e-bike — rentaro";
const description =
  "Reserve a delivery-ready rentaro e-bike in Tallinn or Riga. Choose your model and plan in a few steps — no payment now.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  return {
    title,
    description,
    alternates: buildAlternates(loc, "/book"),
    openGraph: {
      type: "website",
      siteName: "rentaro",
      url: "/book",
      title,
      description,
      images: defaultOgImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: defaultTwitterImages,
    },
  };
}

export default async function BookPage() {
  const [settings, models, cities, accessories] = await Promise.all([
    getSettings(),
    modelService.getModels(),
    cityService.getCities(),
    accessoryService.getAccessories(),
  ]);
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 48 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <BookingWizard settings={settings} models={models} cities={cities} accessories={accessories} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
