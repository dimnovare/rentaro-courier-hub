import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingStatusLookup } from "./BookingStatusLookup";

export const metadata: Metadata = {
  title: "Track your booking — rentaro",
  description:
    "Check the status of your rentaro e-bike reservation. Enter the booking reference from your confirmation to see your model, plan, city and start date.",
};

export default function BookingStatusPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <BookingStatusLookup />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
