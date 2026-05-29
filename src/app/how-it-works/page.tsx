import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { HowItWorks } from "@/components/sections/HowItWorks";

export const metadata: Metadata = {
  title: "How it works — start delivering on a rentaro e-bike | rentaro",
  description:
    "Choose your model and plan, sign the contract online and pay your deposit, then pick up or get local delivery. Start your first courier shift the same week.",
};

export default function HowItWorksPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Getting started</Kicker>
            <h2 className="h-section">Choose, sign, ride.</h2>
            <p className="lead">
              Getting on a rentaro e-bike is built to be fast. Pick a model and plan, handle the
              paperwork digitally from your phone and collect your bike — with service support
              included from day one so your shifts keep running.
            </p>
          </Reveal>
        </div>
      </section>
      <HowItWorks />
    </main>
  );
}
