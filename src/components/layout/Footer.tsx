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

/** Social profiles rendered as icon links in the footer bar. Hrefs come from
 *  company.ts; any empty one is filtered out so no dead icon renders. Icons use
 *  currentColor so they inherit the link colour + hover state. */
const socials = [
  {
    name: "Instagram",
    href: company.social.instagram,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: company.social.linkedin,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 17.34V10.5H6.06v6.84h2.28zM7.2 9.5a1.32 1.32 0 1 0 0-2.64 1.32 1.32 0 0 0 0 2.64zM18 17.34v-3.77c0-2.02-1.08-2.96-2.52-2.96-1.16 0-1.68.64-1.97 1.09v-.93h-2.28c.03.64 0 6.84 0 6.84h2.28v-3.82c0-.2.01-.41.07-.56.17-.41.54-.84 1.18-.84.83 0 1.16.63 1.16 1.56v3.66H18z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: company.social.facebook,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
].filter((s) => s.href);

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
        <nav className="foot-nav" aria-label={t("navAriaLabel")}>
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
            {t("legal.operatedBy", {
              brand: company.brandName,
              legal: company.legalName,
              regCode: company.regCode,
              address: company.address,
            })}
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
          <div className="foot-left">
            <Link className="brand" href="/">
              <LogoMark size={32} />
              <span className="word">rentaro</span>
            </Link>
            {socials.length > 0 && (
              <div className="foot-social">
                {socials.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`rentaro on ${s.name}`}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
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
