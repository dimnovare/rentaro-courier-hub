import type { Metadata } from "next";
import { defaultOgImages, defaultTwitterImages } from "@/lib/og";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Pricing } from "@/components/sections/Pricing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pageMeta.pricing" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: { canonical: "/pricing" },
    openGraph: {
      type: "website",
      siteName: "rentaro",
      url: "/pricing",
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

export default async function PricingPage() {
  const t = await getTranslations("pageHeaders.pricing");
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("kicker")}</Kicker>
            <h2 className="h-section">{t("heading")}</h2>
            <p className="lead">
              {t("lead")}
            </p>
          </Reveal>
        </div>
      </section>
      <Pricing />
    </main>
  );
}
