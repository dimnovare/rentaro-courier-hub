import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const metadata: Metadata = {
  title: "Reserve your e-bike — rentaro",
  description:
    "Reserve a delivery-ready rentaro e-bike in Tallinn or Riga. Choose your model and plan in a few steps — no payment now.",
};

export default function BookPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 48 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <BookingWizard />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
