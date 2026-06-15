import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { Prose } from "@/components/ui/Prose";
import { getLegalDocs } from "@/data/legal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: loc, namespace: "pageMeta.terms" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates(loc, "/terms"),
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
