import type { Metadata } from "next";
import { Prose } from "@/components/ui/Prose";
import { getLegalDocs } from "@/data/legal";

export const metadata: Metadata = {
  title: "Terms and conditions — rentaro",
  description:
    "The terms governing use of the rentaro website and booking an e-bike rental, including bookings, pricing, responsibilities and liability for delivery couriers.",
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { termsOfService } = getLegalDocs(locale);
  return (
    <main>
      <div className="wrap section-pad">
        <Prose doc={termsOfService} />
      </div>
    </main>
  );
}
