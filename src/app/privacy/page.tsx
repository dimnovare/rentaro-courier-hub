import type { Metadata } from "next";
import { Prose } from "@/components/ui/Prose";
import { privacyPolicy } from "@/data/legal";

export const metadata: Metadata = {
  title: "Privacy policy — rentaro",
  description:
    "How rentaro collects, uses and protects your personal data, and your rights under EU data protection law (GDPR) as a delivery-courier rental customer.",
};

export default function PrivacyPage() {
  return (
    <main>
      <div className="wrap section-pad">
        <Prose doc={privacyPolicy} />
      </div>
    </main>
  );
}
