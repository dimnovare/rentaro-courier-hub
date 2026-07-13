import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { FeedbackExperience } from "@/components/feedback/FeedbackForm";
import { isLocale, type Locale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: resolved, namespace: "feedback" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false, noarchive: true },
    referrer: "no-referrer",
  };
}

export default function FeedbackPage() {
  return (
    <main className="feedback-page">
      <div className="wrap feedback-wrap">
        <Suspense fallback={null}>
          <FeedbackExperience />
        </Suspense>
      </div>
    </main>
  );
}
