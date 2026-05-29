import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";

export function Footer() {
  return (
    <div className="wrap">
      <footer className="foot">
        <div className="foot-grid">
          <Link className="brand" href="/">
            <LogoMark size={32} />
            <span className="word">rentaro</span>
          </Link>
          <div className="foot-meta">
            <span>© 2026 rentaro</span>
            <span>Tallinn · Riga · Helsinki</span>
            <span>Independent rental service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
