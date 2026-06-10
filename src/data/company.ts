/**
 * Single source of truth for rentaro's legal identity and contact details.
 *
 * Empty strings are intentional placeholders the founder fills in once the
 * Estonian registration is complete. Consumers (e.g. the footer) MUST omit any
 * field that is empty rather than render a dangling label — see the
 * non-empty guards in `Footer.tsx`.
 */
export interface Company {
  /** Customer-facing brand name. */
  brandName: string;
  /** Registered legal entity that operates the Rentaro brand. */
  legalName: string;
  regCode: string;
  vat: string;
  address: string;
  supportEmail: string;
  supportPhone: string;
}

// Fields are typed as `string` (not literal `""`) so consumers can guard with
// `company.x && …` without TypeScript narrowing the empty placeholder to `never`.
//
// Rentaro is the brand; the operating legal entity is Valguse Kodu OÜ. The
// footer can render this relationship as "Rentaro — operated by Valguse Kodu OÜ"
// using `brandName` + `legalName`.
export const company: Company = {
  brandName: "Rentaro",
  legalName: "Valguse Kodu OÜ",
  regCode: "14621591",
  vat: "EE102246089",
  address: "Narva mnt 128-4, 10127 Tallinn, Estonia",
  supportEmail: "info@rentaro.ee", // real + verified ops inbox
  supportPhone: "+372 5649 7933",
};
