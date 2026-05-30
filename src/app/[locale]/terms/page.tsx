import type { Metadata } from "next";
import { Prose } from "@/components/ui/Prose";
import { termsOfService } from "@/data/legal";

export const metadata: Metadata = {
  title: "Terms and conditions — rentaro",
  description:
    "The terms governing use of the rentaro website and booking an e-bike rental, including bookings, pricing, responsibilities and liability for delivery couriers.",
};

export default function TermsPage() {
  return (
    <main>
      <div className="wrap section-pad">
        <Prose doc={termsOfService} />
      </div>
    </main>
  );
}
