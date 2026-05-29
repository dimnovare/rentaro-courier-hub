"use client";

import { useState } from "react";
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

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a className="brand" onClick={() => nav("top")}>
          <LogoMark size={38} />
          <span className="word">rentaro</span>
        </a>
        <div className="nav-links">
          <a onClick={() => nav("models")}>{t("models")}</a>
          <a onClick={() => nav("pricing")}>{t("pricing")}</a>
          <a onClick={() => nav("how")}>{t("howItWorks")}</a>
          <a onClick={() => nav("cities")}>{t("cities")}</a>
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
          <a onClick={() => go(() => nav("models"))}>{t("models")}</a>
          <a onClick={() => go(() => nav("pricing"))}>{t("pricing")}</a>
          <a onClick={() => go(() => nav("how"))}>{t("howItWorks")}</a>
          <a onClick={() => go(() => nav("cities"))}>{t("cities")}</a>
          <a onClick={() => go(() => goModels())}>{t("viewFleet")}</a>
          <div className="mm-locale">
            <LocaleSwitcher />
          </div>
        </div>
      )}
    </nav>
  );
}
