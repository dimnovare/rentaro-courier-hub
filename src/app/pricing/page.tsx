import type { Metadata } from "next";
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
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function PricingPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Plans & pricing</Kicker>
            <h2 className="h-section">One daily rate. Billed every 30 days.</h2>
            <p className="lead">
              Every rentaro e-bike rents on the same simple terms — pick a 30-day, 6 or 12-month
              plan and pay the daily rate × 30. Commit to a longer term and your daily price drops.
              The minimum rental period is 30 days.
            </p>
          </Reveal>
        </div>
      </section>
      <Pricing />
    </main>
  );
}
