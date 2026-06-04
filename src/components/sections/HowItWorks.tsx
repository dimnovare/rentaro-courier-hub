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
        <Reveal className="center">
          <div className="eid-trust" role="note">
            <span className="eid-trust-ico" aria-hidden>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.5 4 6v5.5c0 4.7 3.3 8.1 8 10 4.7-1.9 8-5.3 8-10V6l-8-3.5Z" />
                <path d="m9 12 2.2 2.2L15.5 10" />
              </svg>
            </span>
            <span className="eid-trust-kicker">{t("trust.kicker")}</span>
            <span className="eid-trust-copy">{t("trust.copy")}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
