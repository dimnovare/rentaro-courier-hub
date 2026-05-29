"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { LogoMark } from "@/components/ui/LogoMark";
import { Ic } from "@/components/ui/Icon";

export function Nav() {
  const { reserve, nav, goModels } = useInteractions();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <a className="brand" onClick={() => nav("top")}>
          <LogoMark size={38} />
          <span className="word">rentaro</span>
        </a>
        <div className="nav-links">
          <a onClick={() => nav("models")}>Models</a>
          <a onClick={() => nav("pricing")}>Pricing</a>
          <a onClick={() => nav("how")}>How it works</a>
          <a onClick={() => nav("cities")}>Cities</a>
        </div>
        <div className="nav-cta">
          <button className="btn btn-ghost" onClick={() => goModels()}>View fleet</button>
          <button className="btn btn-primary" onClick={() => reserve()}>
            Reserve<span className="arrow"><Ic.arrow /></span>
          </button>
          <div className="nav-menu" onClick={() => nav("models")} role="button" aria-label="Menu">
            <Ic.menu />
          </div>
        </div>
      </div>
    </nav>
  );
}
