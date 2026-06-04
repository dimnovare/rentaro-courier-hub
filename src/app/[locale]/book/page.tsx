import type { Metadata } from "next";
import { defaultOgImages, defaultTwitterImages } from "@/lib/og";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/BookingWizard";

const title = "Reserve your e-bike — rentaro";
const description =
  "Reserve a delivery-ready rentaro e-bike in Tallinn or Riga. Choose your model and plan in a few steps — no payment now.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/book" },
  openGraph: {
    type: "website",
    siteName: "rentaro",
    url: "/book",
    title,
    description,
    images: defaultOgImages,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: defaultTwitterImages,
  },
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
