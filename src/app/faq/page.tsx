import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Faq } from "@/components/sections/Faq";

export const metadata: Metadata = {
  title: "FAQ — monthly e-bike rental for couriers | rentaro",
  description:
    "Answers on rentaro plans, the 30-day minimum, deposits, maintenance, extra batteries, pickup locations and the digital contract for delivery couriers.",
};

export default async function FaqPage() {
  const t = await getTranslations("pageHeaders.faq");
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
      <Faq />
    </main>
  );
}
