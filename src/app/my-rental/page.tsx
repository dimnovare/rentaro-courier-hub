import type { Metadata } from "next";
import { Suspense } from "react";
import { ManageRental } from "./ManageRental";

export const metadata: Metadata = {
  title: "Manage your rental — rentaro",
  description:
    "View your rentaro booking, request a repair or contact support — straight from the secure link in your confirmation email.",
  robots: { index: false, follow: false },
};

export default function MyRentalPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <ManageRental />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
