import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { steps } from "@/data/content";

export function HowItWorks() {
  return (
    <section className="section-pad" id="how">
      <div className="wrap">
        <Reveal className="section-head center">
          <Kicker>How it works</Kicker>
          <h2 className="h-section">From signup to delivery in three steps.</h2>
        </Reveal>
        <div className="steps-grid">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="step">
                <div className="num">{s.n}</div>
                <h4>{s.title}</h4>
                <p>{s.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
