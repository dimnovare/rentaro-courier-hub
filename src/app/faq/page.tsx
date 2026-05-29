import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Faq } from "@/components/sections/Faq";

export const metadata: Metadata = {
  title: "FAQ — monthly e-bike rental for couriers | rentaro",
  description:
    "Answers on rentaro plans, the 30-day minimum, deposits, maintenance, extra batteries, pickup locations and the digital contract for delivery couriers.",
};

export default function FaqPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>FAQ</Kicker>
            <h2 className="h-section">Everything you need to know.</h2>
            <p className="lead">
              The most common questions about renting a rentaro e-bike for delivery work — plans,
              deposits, maintenance and pickup. Need something else? Reach out and we will help.
            </p>
          </Reveal>
        </div>
      </section>
      <Faq />
    </main>
  );
}
