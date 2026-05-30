import type { Metadata } from "next";
import { Prose } from "@/components/ui/Prose";
import { rentalRules } from "@/data/legal";

export const metadata: Metadata = {
  title: "Rental rules — rentaro",
  description:
    "How a rentaro e-bike rental works: the 30-day minimum, deposit, included maintenance, damage and theft handling, charging and returns for delivery couriers.",
};

export default function RulesPage() {
  return (
    <main>
      <div className="wrap section-pad">
        <Prose doc={rentalRules} />
      </div>
    </main>
  );
}
