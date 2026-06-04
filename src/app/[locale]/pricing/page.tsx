import type { Metadata } from "next";
import { defaultOgImages, defaultTwitterImages } from "@/lib/og";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Pricing } from "@/components/sections/Pricing";

const title = "Pricing — monthly e-bike plans for couriers | rentaro";
const description =
  "Simple per-30-day pricing for delivery couriers: €5.90/day on the 30-day plan, €4.90/day on 6 months and €3.90/day on 12 months. Same plan pricing across every model.";

export const metadata: Metadata = {
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
