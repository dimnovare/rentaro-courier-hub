"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Ic } from "@/components/ui/Icon";
import { resolveImg } from "@/services/modelService";
import { track } from "@/services/analytics";
import type { BikeModel } from "@/types";

export function ModelCard({ m, compact = false }: { m: BikeModel; compact?: boolean }) {
  const { reserve } = useInteractions();
  const t = useTranslations("modelsPage");
  const tm = useTranslations("modelItems");
  const avail =
    m.status === "in"
      ? { label: t("avail.inStock", { count: m.availability }), cls: "in" }
      : m.status === "low"
        ? { label: t("avail.left", { count: m.availability }), cls: "low" }
        : { label: t("avail.waitlist"), cls: "wait" };
  const pills = compact ? m.pills.slice(0, 2) : m.pills;
  const isWait = m.status === "wait";

  return (
    <article className={`card model-card ${m.popular && !compact ? "feat" : ""}`}>
      <Link
        className="model-pic"
        href={`/models/${m.slug}`}
        aria-label={m.name}
        onClick={() => track("cta_view_details", { model: m.id, source: "model-card-image" })}
      >
        <span className={`model-badge ${m.badge.variant}`}>{m.badge.text}</span>
        <span className={`model-avail ${avail.cls}`}>
          <span className="dot" />
          {avail.label}
        </span>
        <img src={resolveImg(m.img)} alt={m.name} loading="lazy" />
      </Link>
      <div className="model-body">
        <h3>
          <Link
            href={`/models/${m.slug}`}
            style={{ color: "inherit", textDecoration: "none" }}
            onClick={() => track("cta_view_details", { model: m.id, source: "model-card-title" })}
          >
            {m.name}
          </Link>
        </h3>
        <div className="model-tagline">
          {m.brand} · {tm(`${m.id}.tagline`)}
        </div>
        <div className="spec-row">
          {pills.map((p) => (
            <span className="spec-pill" key={p}>
              <Ic.bolt s={11} />
              {p}
            </span>
          ))}
        </div>
        <div className="model-foot">
          <div className="from">
            {t("from")}
            <strong>
              €{m.fromDay.toFixed(2)}
              <span className="per"> {t("perDay")}</span>
            </strong>
          </div>
          <button
            className={`reserve-btn ${isWait ? "wait" : ""}`}
            onClick={() => reserve(isWait ? `waitlist:${m.id}` : m.id, "model-card")}
          >
            {isWait ? t("joinWaitlist") : t("reserve")}
            {!isWait && <Ic.arrow s={13} />}
          </button>
        </div>
      </div>
    </article>
  );
}
