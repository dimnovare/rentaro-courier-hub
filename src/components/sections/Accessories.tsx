import { getTranslations, getLocale } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { getIcon } from "@/components/ui/Icon";
import { accessoryService, customerVisibleAccessories } from "@/services/accessoryService";
import { accessoryPriceRange } from "@/services/pricingService";
import type { Accessory } from "@/types";

export async function Accessories() {
  const t = await getTranslations("accessories");
  const locale = await getLocale();
  const accessories = await accessoryService.getAccessories();

  // Localized name: prefer the seeded message key, then the API per-locale map,
  // then the base name (admin-added rows have no message key). Mirrors the
  // pricing perks/marquee locale-fallback convention.
  const accName = (a: Accessory): string =>
    t.has(`names.${a.id}`) ? t(`names.${a.id}`) : a.nameLocalized?.[locale] ?? a.name;
  const nameById = (id: string): string => {
    const c = accessories.find((x) => x.id === id);
    return c ? accName(c) : id;
  };

  // Static labels awaiting messages/*.json keys — graceful English fallback.
  const bundleLabel = t.has("bundle") ? t("bundle") : "Bundle";
  const includesLabel = (items: string) =>
    t.has("includes") ? t("includes", { items }) : `Includes: ${items}`;
  const priceFromLabel = (price: number) =>
    t.has("priceFrom") ? t("priceFrom", { price }) : `from €${price} / 30d`;

  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
        </Reveal>
        <div className="acc-grid">
          {customerVisibleAccessories(accessories).map((a, i) => {
            const Glyph = getIcon(a.icon);
            const colors = a.colors ?? [];
            const desc = a.descriptionLocalized?.[locale] ?? a.description ?? undefined;
            const components = a.isBundle ? a.componentIds.map(nameById) : [];
            // Tiered accessories show a "from" price; legacy single-price rows
            // keep their display string as-is (avoids a misleading "from").
            const hasTiers =
              a.price30 != null || a.price6mo != null || a.price12mo != null;
            const priceText = hasTiers
              ? priceFromLabel(accessoryPriceRange(a).minMonthly)
              : a.price;
            return (
              <Reveal key={a.id} delay={(i % 4) * 70}>
                <div className="acc">
                  <div className="ai">
                    <Glyph s={22} />
                  </div>
                  <div>
                    <div className="an">
                      {accName(a)}
                      {a.isBundle && (
                        <span
                          className="chip accent"
                          style={{ marginLeft: 8, verticalAlign: "middle" }}
                        >
                          {bundleLabel}
                        </span>
                      )}
                    </div>
                    <div className="ap">{priceText}</div>
                    {desc && (
                      <div
                        className="acc-note"
                        style={{ marginTop: 4, fontSize: 13, opacity: 0.72 }}
                      >
                        {desc}
                      </div>
                    )}
                    {components.length > 0 && (
                      <div
                        className="acc-note"
                        style={{ marginTop: 4, fontSize: 13, opacity: 0.72 }}
                      >
                        {includesLabel(components.join(", "))}
                      </div>
                    )}
                    {colors.length > 0 && (
                      <div className="model-swatches" role="group" aria-label={t("colors")}>
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
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
