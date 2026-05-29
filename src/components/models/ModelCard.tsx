"use client";

import Link from "next/link";
import { useInteractions } from "@/components/providers/Interactions";
import { Ic } from "@/components/ui/Icon";
import type { BikeModel } from "@/types";

export function ModelCard({ m, compact = false }: { m: BikeModel; compact?: boolean }) {
  const { reserve } = useInteractions();
  const avail =
    m.status === "in"
      ? { label: `${m.availability} in stock`, cls: "in" }
      : m.status === "low"
        ? { label: `${m.availability} left`, cls: "low" }
        : { label: "Waitlist", cls: "wait" };
  const pills = compact ? m.pills.slice(0, 2) : m.pills;
  const isWait = m.status === "wait";

  return (
    <article className={`card model-card ${m.popular && !compact ? "feat" : ""}`}>
      <Link className="model-pic" href={`/models/${m.slug}`} aria-label={m.name}>
        <span className={`model-badge ${m.badge.variant}`}>{m.badge.text}</span>
        <span className={`model-avail ${avail.cls}`}>
          <span className="dot" />
          {avail.label}
        </span>
        <img src={m.img} alt={m.name} loading="lazy" />
      </Link>
      <div className="model-body">
        <h3>
          <Link href={`/models/${m.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
            {m.name}
          </Link>
        </h3>
        <div className="model-tagline">
          {m.brand} · {m.tagline}
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
            FROM
            <strong>
              €{m.fromDay.toFixed(2)}
              <span className="per"> / day</span>
            </strong>
          </div>
          <button
            className={`reserve-btn ${isWait ? "wait" : ""}`}
            onClick={() => reserve(isWait ? `waitlist:${m.id}` : m.id)}
          >
            {isWait ? "Join waitlist" : "Reserve"}
            {!isWait && <Ic.arrow s={13} />}
          </button>
        </div>
      </div>
    </article>
  );
}
