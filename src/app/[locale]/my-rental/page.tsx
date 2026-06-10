import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/services/settingsService";
import { ManageRental } from "./ManageRental";

export const metadata: Metadata = {
  title: "Manage your rental — rentaro",
  description:
    "View your rentaro booking, request a repair or contact support — straight from the secure link in your confirmation email.",
  robots: { index: false, follow: false },
};

export default async function MyRentalPage() {
  // Server-side fetch of admin feature flags (fail-safe defaults: all hidden).
  const settings = await getSettings();

  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <ManageRental settings={settings} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
