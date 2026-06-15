import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { Suspense } from "react";
import { BookingStatusLookup } from "./BookingStatusLookup";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: loc, namespace: "pageMeta.bookingStatus" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates(loc, "/booking/status"),
  };
}

export default function BookingStatusPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <BookingStatusLookup />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
