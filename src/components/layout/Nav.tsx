"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { LogoMark } from "@/components/ui/LogoMark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Ic } from "@/components/ui/Icon";

export function Nav() {
  const { reserve, nav, goModels } = useInteractions();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  // Run a nav action and close the mobile menu in one go.
  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  // In-page scroll links carry a real `/#id` href (for a11y, SEO and
  // open-in-new-tab), but on the landing page we intercept the click and
  // smooth-scroll instead of doing a hard navigation.
  const onNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    nav(id);
  };

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a className="brand" onClick={() => nav("top")}>
          <LogoMark size={38} />
          <span className="word">rentaro</span>
        </a>
        <div className="nav-links">
          <Link href="/#models" onClick={(e) => onNavClick(e, "models")}>{t("models")}</Link>
          <Link href="/#pricing" onClick={(e) => onNavClick(e, "pricing")}>{t("pricing")}</Link>
          <Link href="/#how" onClick={(e) => onNavClick(e, "how")}>{t("howItWorks")}</Link>
          <Link href="/#cities" onClick={(e) => onNavClick(e, "cities")}>{t("cities")}</Link>
        </div>
        <div className="nav-cta">
          <LocaleSwitcher />
          <button className="btn btn-ghost" onClick={() => goModels()}>{t("viewFleet")}</button>
          <button className="btn btn-primary" onClick={() => reserve()}>
            {t("reserve")}<span className="arrow"><Ic.arrow /></span>
          </button>
          <div
            className="nav-menu"
            onClick={() => setOpen((o) => !o)}
            role="button"
            tabIndex={0}
            aria-label={t("menu")}
            aria-expanded={open}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((o) => !o)}
          >
            <Ic.menu />
          </div>
        </div>
      </div>

      {/* Mobile menu: reveals the links + language picker that are hidden in the
          top bar at small widths (the bar keeps only the brand + Reserve CTA). */}
      {open && (
        <div className="mobile-menu">
          <Link href="/#models" onClick={(e) => { e.preventDefault(); go(() => nav("models")); }}>{t("models")}</Link>
          <Link href="/#pricing" onClick={(e) => { e.preventDefault(); go(() => nav("pricing")); }}>{t("pricing")}</Link>
          <Link href="/#how" onClick={(e) => { e.preventDefault(); go(() => nav("how")); }}>{t("howItWorks")}</Link>
          <Link href="/#cities" onClick={(e) => { e.preventDefault(); go(() => nav("cities")); }}>{t("cities")}</Link>
          <a onClick={() => go(() => goModels())}>{t("viewFleet")}</a>
          <div className="mm-locale">
            <LocaleSwitcher />
          </div>
        </div>
      )}
    </nav>
  );
}
