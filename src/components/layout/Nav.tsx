"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { LogoMark } from "@/components/ui/LogoMark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Ic } from "@/components/ui/Icon";

export function Nav() {
  const { reserve, nav, goModels } = useInteractions();
  const t = useTranslations("nav");
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
          <div className="nav-menu" onClick={() => nav("models")} role="button" aria-label={t("menu")}>
            <Ic.menu />
          </div>
        </div>
      </div>
    </nav>
  );
}
