import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Accessories } from "@/components/sections/Accessories";

export const metadata: Metadata = {
  title: "Accessories & add-ons for delivery couriers | rentaro",
  description:
    "Kit out your shift with rentaro add-ons — extra batteries, delivery bags, phone holders, heavy-duty locks and more. Built for couriers, available with any plan.",
};

export default async function AccessoriesPage() {
  const t = await getTranslations("pageHeaders.accessories");
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
      <Accessories />
    </main>
  );
}
