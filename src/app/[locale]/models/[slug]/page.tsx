import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { Gallery } from "@/components/models/Gallery";
import { SpecTable } from "@/components/models/SpecTable";
import { ReserveButton } from "@/components/models/ReserveButton";
import { bikeModels, getModelBySlug } from "@/data/bikeModels";
import { pricingPlans } from "@/data/pricingPlans";
import { modelService, resolveImg } from "@/services/modelService";
import { modelFromDaily, resolvePlanPrice } from "@/services/pricingService";
import { JsonLd, buildProductSchema } from "@/components/seo/JsonLd";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";

type Params = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return bikeModels.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const m = getModelBySlug(slug);
  if (!m) return { title: "Model not found — rentaro" };
  const title = `${m.name} — rentaro`;
  const description =
    m.blurb ?? `${m.name} — available on 30-day, 6 or 12-month rentaro plans.`;
  const path = `/models/${m.slug}`;
  const ogImage = resolveImg(m.img);
  return {
    title,
    description,
    alternates: buildAlternates(loc, path),
    openGraph: {
      type: "website",
      siteName: "rentaro",
      title,
      description,
      url: path,
      locale: loc,
      images: [{ url: ogImage, alt: m.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ModelDetail({ params }: Params) {
  const { slug } = await params;
  const m = await modelService.getModel(slug);
  if (!m) notFound();

  const t = await getTranslations("modelsPage");
  const tm = await getTranslations("modelItems");

  const colors = m.colors ?? [];

  const avail =
    m.status === "in"
      ? { label: t("avail.inStock", { count: m.availability }), color: "var(--lime)" }
      : m.status === "low"
        ? { label: t("avail.left", { count: m.availability }), color: "var(--warn)" }
        : { label: t("avail.waitlist"), color: "var(--danger)" };
  const isWait = m.status === "wait";
  const images = [m.img, ...(m.gallery ?? [])].map(resolveImg);

  // The 12-month daily rate for THIS model (honours per-model overrides), so
  // the plan note below never contradicts the override-aware headline price.
  const plan12 = pricingPlans.find((pl) => pl.id === "p365") ?? pricingPlans[pricingPlans.length - 1];
  const daily12 = resolvePlanPrice(m, plan12).daily.toFixed(2);

  return (
    <main>
      <JsonLd data={buildProductSchema(m)} />
      <section className="detail">
        <div className="wrap">
          <Link className="detail-back" href="/models">
            <span className="ar">
              <Ic.arrow s={14} />
            </span>
            {t("allModels")}
          </Link>

          <div className="detail-grid">
            <Reveal>
              <Gallery images={images} alt={m.name} />
            </Reveal>

            <Reveal delay={80}>
              <div>
                <div className="detail-brand">
                  {m.brand} · {tm.has(`${m.id}.tagline`) ? tm(`${m.id}.tagline`) : m.tagline}
                </div>
                <h1>{m.name}</h1>
                <span className="detail-avail">
                  <span className="dot" style={{ background: avail.color }} />
                  {avail.label}
                </span>

                {/* Read-only colour swatches: this model's own available colours
                    as small hex dots, each labelled with its colour name. */}
                {colors.length > 0 && (
                  <div className="model-swatches" role="group" aria-label={t("colors.available")} style={{ marginTop: 18 }}>
                    {colors.map((c) => (
                      <span
                        key={c.name}
                        className="model-swatch"
                        style={{ background: c.hex }}
                        title={c.name}
                        aria-label={c.name}
                      />
                    ))}
                  </div>
                )}

                {m.blurb && (
                  <p className="lead" style={{ marginTop: 18 }}>
                    {tm.has(`${m.id}.blurb`) ? tm(`${m.id}.blurb`) : m.blurb}
                  </p>
                )}
                <div className="spec-row" style={{ margin: "20px 0 0" }}>
                  {m.pills.map((p) => (
                    <span className="spec-pill" key={p}>
                      <Ic.bolt s={11} />
                      {p}
                    </span>
                  ))}
                </div>
                <div className="detail-foot">
                  <div className="from">
                    {t("from")}
                    <strong>
                      €{modelFromDaily(m).toFixed(2)}
                      <span className="per"> {t("perDay")}</span>
                    </strong>
                  </div>
                  <ReserveButton
                    what={isWait ? `waitlist:${m.id}` : m.id}
                    label={isWait ? t("joinWaitlistLong") : t("reserveThisBike")}
                    lg
                  />
                </div>
                <p className="mono" style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 16 }}>
                  {t("planNote", { daily: daily12 })}
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal style={{ marginTop: 56 }}>
            <Kicker>{t("fullSpec")}</Kicker>
            <SpecTable m={m} />
            {m.spec?.sku && (
              <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 14 }}>
                {/* Available colours are shown as the labelled swatch row above. */}
                {m.brand} · SKU {m.spec.sku}
              </p>
            )}
          </Reveal>
        </div>
      </section>
    </main>
  );
}
