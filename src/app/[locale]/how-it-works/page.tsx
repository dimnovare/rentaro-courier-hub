import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { HowItWorks } from "@/components/sections/HowItWorks";

const title = "How it works — start delivering on a rentaro e-bike | rentaro";
const description =
  "Choose your model and plan, sign the contract online and pay your deposit, then pick up or get local delivery. Start your first courier shift the same week.";

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
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
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
