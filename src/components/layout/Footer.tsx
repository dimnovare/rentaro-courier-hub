import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";

const columns: { heading: string; links: [string, string][] }[] = [
  {
    heading: "Product",
    links: [
      ["Models", "/models"],
      ["Pricing", "/pricing"],
      ["How it works", "/how-it-works"],
      ["Accessories", "/accessories"],
    ],
  },
  {
    heading: "Cities",
    links: [
      ["Tallinn", "/cities/tallinn"],
      ["Riga", "/cities/riga"],
      ["Helsinki", "/cities/helsinki"],
    ],
  },
  {
    heading: "Company",
    links: [
      ["FAQ", "/faq"],
      ["Rental rules", "/rules"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
  {
    heading: "Get started",
    links: [
      ["Reserve a bike", "/book"],
      ["Monthly rental", "/monthly-ebike-rental"],
      ["For couriers", "/ebike-rental-for-couriers"],
    ],
  },
];

export function Footer() {
  return (
    <div className="wrap">
      <footer className="foot">
        <nav className="foot-nav" aria-label="Footer">
          {columns.map((col) => (
            <div className="foot-col" key={col.heading}>
              <h5>{col.heading}</h5>
              {col.links.map(([label, href]) => (
                <Link key={href} href={href}>
                  {label}
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
            <span>© 2026 rentaro</span>
            <span>Tallinn · Riga · Helsinki</span>
            <span>Independent rental service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
