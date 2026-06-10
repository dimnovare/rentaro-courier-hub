import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/ui/LogoMark";
import { company } from "@/data/company";
import { cities } from "@/data/cities";

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

  // Derive the meta city line from data so it never implies a "soon" market is
  // already live. Live cities first, then each "soon" city tagged as such.
  const live = cities.filter((c) => c.status !== "soon").map((c) => c.name);
  const soon = cities.filter((c) => c.status === "soon").map((c) => c.name);
  const cityLine = [
    ...live,
    ...soon.map((name) => t("citySoonSuffix", { city: name })),
  ].join(" · ");
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
        {/* Legal identity + contact. Literal values come from company.ts;
            only the labels are translated. Each row is omitted when its
            underlying value is empty, so no dangling "VAT:" ever renders. */}
        <div className="foot-legal">
          {/* Standard operating-entity line: brand is a product operated by the
              legal entity, with registry code + registered address. */}
          <span className="foot-legal-name">
            {company.brandName} is a product operated by {company.legalName}, registry
            code {company.regCode}, registered at {company.address}.
          </span>
          {company.vat && (
            <span>
              {t("legal.vat")} {company.vat}
            </span>
          )}
          {company.supportEmail && (
            <a href={`mailto:${company.supportEmail}`}>{company.supportEmail}</a>
          )}
          {company.supportPhone && (
            <a href={`tel:${company.supportPhone.replace(/\s+/g, "")}`}>
              {company.supportPhone}
            </a>
          )}
        </div>
        <div className="foot-grid">
          <Link className="brand" href="/">
            <LogoMark size={32} />
            <span className="word">rentaro</span>
          </Link>
          <div className="foot-meta">
            <span>
              © {new Date().getFullYear()} {company.legalName} · {company.brandName}
            </span>
            <span>{cityLine}</span>
            <span>{t("independent")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
