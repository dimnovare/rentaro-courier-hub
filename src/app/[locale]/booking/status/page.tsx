import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BookingStatusLookup } from "./BookingStatusLookup";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pageMeta.bookingStatus" });
  return {
    title: t("title"),
    description: t("description"),
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
