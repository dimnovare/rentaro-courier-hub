import type { Metadata } from "next";
import { defaultOgImages, defaultTwitterImages } from "@/lib/og";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { HowItWorks } from "@/components/sections/HowItWorks";

const title = "How it works — start delivering on a rentaro e-bike | rentaro";
const description =
  "Reserve free, get approved, then verify your identity, accept your contract and pay your first 30 days plus deposit in your portal — before we assign your bike and you pick up. Start your first courier shift the same week.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    type: "website",
    siteName: "rentaro",
    url: "/how-it-works",
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

export default async function HowItWorksPage() {
  const t = await getTranslations("pageHeaders.howItWorks");
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
      <HowItWorks />
    </main>
  );
}
