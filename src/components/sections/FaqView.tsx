"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";

/** FAQ item keys, in display order — mirrors `@/data/faq`. Copy lives in
 *  the `faq.items` namespace. */
const faqKeys = [
  "delivery",
  "minPeriod",
  "pricing",
  "maintenance",
  "extraBattery",
  "deposit",
  "pickup",
  "contract",
] as const;

export function FaqView({
  count,
  defaultOpen,
  liveCityIds = [],
  soonCityIds = [],
}: {
  count: number;
  defaultOpen: number;
  liveCityIds?: string[];
  soonCityIds?: string[];
}) {
  const t = useTranslations("faq");
  const tc = useTranslations("cities");
  const [open, setOpen] = useState(defaultOpen);
  const half = Math.ceil(count / 2);
  const cols = [faqKeys.slice(0, half), faqKeys.slice(half)];

  // The "Where can I pick up the bike?" answer names the live/soon markets, so
  // it derives from real city status with LOCALIZED names (cities.names.*). The
  // ICU message uses {live} / {soon} placeholders; all other answers take none.
  const liveCityNames = liveCityIds.map((id) => tc(`names.${id}`)).join(" + ");
  const soonCityNames = soonCityIds.map((id) => tc(`names.${id}`)).join(", ");
  // `soonState` drives an ICU select so the "…coming soon" clause is dropped
  // entirely when no market is pending — keeping the sentence natural.
  const answerVars = (key: string): Record<string, string> =>
    key === "pickup"
      ? { live: liveCityNames, soon: soonCityNames, soonState: soonCityNames ? "some" : "none" }
      : {};

  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal className="section-head center">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
        </Reveal>
        <div className="faq-grid">
          {cols.map((col, ci) => (
            <div key={ci} className="faq-col">
              {col.map((key, j) => {
                const idx = ci === 0 ? j : half + j;
                const isOpen = open === idx;
                const panelId = `faq-a-${key}`;
                const btnId = `faq-q-${key}`;
                return (
                  <div key={idx} className={`faq-item ${isOpen ? "open" : ""}`}>
                    <button
                      id={btnId}
                      className="faq-q"
                      onClick={() => setOpen(isOpen ? -1 : idx)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                    >
                      <span>{t(`items.${key}.q`)}</span>
                      <span className="ic">
                        <Ic.plus s={12} />
                      </span>
                    </button>
                    <div
                      id={panelId}
                      className="faq-a"
                      role="region"
                      aria-labelledby={btnId}
                      hidden={!isOpen}
                    >
                      <div className="faq-a-in">{t(`items.${key}.a`, answerVars(key))}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
