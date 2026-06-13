import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Prose } from "@/components/ui/Prose";
import { getLegalDocs } from "@/data/legal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pageMeta.terms" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

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
