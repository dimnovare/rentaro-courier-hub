import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { Gallery } from "@/components/models/Gallery";
import { SpecTable } from "@/components/models/SpecTable";
import { ReserveButton } from "@/components/models/ReserveButton";
import { bikeModels, getModelBySlug } from "@/data/bikeModels";
import { modelService } from "@/services/modelService";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return bikeModels.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const m = getModelBySlug(slug);
  if (!m) return { title: "Model not found — rentaro" };
  return {
    title: `${m.name} — rentaro`,
    description: m.blurb ?? `${m.name} — available on 30-day, 6 or 12-month rentaro plans.`,
  };
}

export default async function ModelDetail({ params }: Params) {
  const { slug } = await params;
  const m = await modelService.getModel(slug);
  if (!m) notFound();

  const avail =
    m.status === "in"
      ? { label: `${m.availability} in stock`, color: "var(--lime)" }
      : m.status === "low"
        ? { label: `${m.availability} left`, color: "var(--warn)" }
        : { label: "Waitlist", color: "var(--danger)" };
  const isWait = m.status === "wait";
  const images = [m.img, ...(m.gallery ?? [])];

  return (
    <main>
      <section className="detail">
        <div className="wrap">
          <Link className="detail-back" href="/models">
            <span className="ar">
              <Ic.arrow s={14} />
            </span>
            All models
          </Link>

          <div className="detail-grid">
            <Reveal>
              <Gallery images={images} alt={m.name} />
            </Reveal>

            <Reveal delay={80}>
              <div>
                <div className="detail-brand">
                  {m.brand} · {m.tagline}
                </div>
                <h1>{m.name}</h1>
                <span className="detail-avail">
                  <span className="dot" style={{ background: avail.color }} />
                  {avail.label}
                </span>
                {m.blurb && (
                  <p className="lead" style={{ marginTop: 18 }}>
                    {m.blurb}
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
                    FROM
                    <strong>
                      €{m.fromDay.toFixed(2)}
                      <span className="per"> / day</span>
                    </strong>
                  </div>
                  <ReserveButton
                    what={isWait ? `waitlist:${m.id}` : m.id}
                    label={isWait ? "Join the waitlist" : "Reserve this bike"}
                    lg
                  />
                </div>
                <p className="mono" style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 16 }}>
                  Available on 30-day, 6 or 12-month plans — from €3.90/day on the 12-month plan.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal style={{ marginTop: 56 }}>
            <Kicker>Full specification</Kicker>
            <SpecTable m={m} />
            {m.spec?.sku && (
              <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 14 }}>
                {m.brand} · SKU {m.spec.sku}
                {m.colors?.length ? ` · ${m.colors.join(", ")}` : ""}
              </p>
            )}
          </Reveal>
        </div>
      </section>
    </main>
  );
}
