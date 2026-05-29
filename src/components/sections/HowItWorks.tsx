import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { steps } from "@/data/content";

export async function HowItWorks() {
  const t = await getTranslations("howItWorks");
  return (
    <section className="section-pad" id="how">
      <div className="wrap">
        <Reveal className="section-head center">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
        </Reveal>
        <div className="steps-grid">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="step">
                <div className="num">{s.n}</div>
                <h4>{t(`steps.${s.n}.title`)}</h4>
                <p>{t(`steps.${s.n}.copy`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
