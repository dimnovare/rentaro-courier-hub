import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";

// The wind-down notice. Shown at `/wind-down` in every locale (en unprefixed,
// et/lv/fi/ru prefixed). It reuses the standard app chrome (Nav/Footer/Background
// from the locale layout) and design tokens so it keeps the Rentaro identity.
//
// Copy lives in the `windDown` namespace of each messages bundle. NOTE: only the
// English strings are human-authored — the et/lv/fi/ru translations are
// MACHINE-TRANSLATED and should get a native-speaker review before this ships.
//
// This page is noindex (see generateMetadata) and is intentionally absent from
// the sitemap; robots also disallows the commercial routes that redirect here.
const CONTACT_EMAIL = "info@rentaro.ee";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: loc, namespace: "pageMeta.windDown" });
  return {
    title: t("title"),
    description: t("description"),
    // Temporary notice — keep it out of the index so the commercial URLs can be
    // restored cleanly after the wind-down.
    robots: { index: false },
  };
}

export default async function WindDownPage() {
  const t = await getTranslations("windDown");
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("kicker")}</Kicker>
            <h1 className="h-section">{t("heading")}</h1>
            <p className="lead">{t("body")}</p>
            <p className="lead">
              {t("contactLead")}{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            <div style={{ marginTop: 24 }}>
              <Link className="btn btn-primary btn-lg" href="/my-rental">
                {t("portalCta")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
