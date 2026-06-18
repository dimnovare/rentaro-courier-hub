import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { getIcon } from "@/components/ui/Icon";
import { accessoryService } from "@/services/accessoryService";

export async function Accessories() {
  const t = await getTranslations("accessories");
  const accessories = await accessoryService.getAccessories();
  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
        </Reveal>
        <div className="acc-grid">
          {accessories.map((a, i) => {
            const Glyph = getIcon(a.icon);
            const colors = a.colors ?? [];
            return (
              <Reveal key={a.id} delay={(i % 4) * 70}>
                <div className="acc">
                  <div className="ai">
                    <Glyph s={22} />
                  </div>
                  <div>
                    <div className="an">{t(`names.${a.id}`)}</div>
                    <div className="ap">{a.price}</div>
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
