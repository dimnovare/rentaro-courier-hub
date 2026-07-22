import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { AccessoryPackages } from "@/components/accessories/AccessoryPackages";
import { cityService } from "@/services/cityService";

export async function Accessories({ compact = false, showHeading = true }: {
  compact?: boolean;
  showHeading?: boolean;
}) {
  const t = await getTranslations("accessories");
  const tc = await getTranslations("cities.names");
  const cities = (await cityService.getCities())
    .filter((city) => city.status !== "soon")
    .map((city) => ({
      id: city.id,
      name: tc.has(city.id) ? tc(city.id) : city.name,
    }));

  return (
    <section className="section-pad">
      <div className="wrap">
        {showHeading && (
          <Reveal className="section-head">
            <Kicker>{t("kicker")}</Kicker>
            <h2 className="h-section">{t("heading")}</h2>
          </Reveal>
        )}
        <AccessoryPackages cities={cities} compact={compact} />
      </div>
    </section>
  );
}
