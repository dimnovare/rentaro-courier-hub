import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/ui/LogoMark";

/** Footer link tree. Hrefs are stable; labels are resolved from the
 *  `footer.links` namespace so copy lives in the catalog. */
const columns: {
  headingKey: string;
  links: { labelKey: string; href: string }[];
}[] = [
  {
    headingKey: "product",
    links: [
      { labelKey: "models", href: "/models" },
      { labelKey: "pricing", href: "/pricing" },
      { labelKey: "howItWorks", href: "/how-it-works" },
      { labelKey: "accessories", href: "/accessories" },
    ],
  },
  {
    headingKey: "cities",
    links: [
      { labelKey: "tallinn", href: "/cities/tallinn" },
      { labelKey: "riga", href: "/cities/riga" },
      { labelKey: "helsinki", href: "/cities/helsinki" },
    ],
  },
  {
    headingKey: "company",
    links: [
      { labelKey: "faq", href: "/faq" },
      { labelKey: "rules", href: "/rules" },
      { labelKey: "privacy", href: "/privacy" },
      { labelKey: "terms", href: "/terms" },
    ],
  },
  {
    headingKey: "getStarted",
    links: [
      { labelKey: "reserveBike", href: "/book" },
      { labelKey: "monthlyRental", href: "/monthly-ebike-rental" },
      { labelKey: "forCouriers", href: "/ebike-rental-for-couriers" },
    ],
  },
];

export async function Footer() {
  const t = await getTranslations("footer");
  return (
    <div className="wrap">
      <footer className="foot">
        <nav className="foot-nav" aria-label="Footer">
          {columns.map((col) => (
            <div className="foot-col" key={col.headingKey}>
              <h5>{t(`columns.${col.headingKey}`)}</h5>
              {col.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {t(`links.${link.labelKey}`)}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="foot-grid">
          <Link className="brand" href="/">
            <LogoMark size={32} />
            <span className="word">rentaro</span>
          </Link>
          <div className="foot-meta">
            <span>{t("copyright")}</span>
            <span>{t("cityLine")}</span>
            <span>{t("independent")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
