import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/config";
import { getSettings } from "@/services/settingsService";
import { ManageRental } from "./ManageRental";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: resolved, namespace: "portal" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false, noarchive: true },
    referrer: "no-referrer",
  };
}

export default async function MyRentalPage() {
  // Server-side fetch of admin feature flags (fail-safe defaults: all hidden).
  const settings = await getSettings();

  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <ManageRental settings={settings} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
