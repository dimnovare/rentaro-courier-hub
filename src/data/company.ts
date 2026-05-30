/**
 * Single source of truth for rentaro's legal identity and contact details.
 *
 * Empty strings are intentional placeholders the founder fills in once the
 * Estonian registration is complete. Consumers (e.g. the footer) MUST omit any
 * field that is empty rather than render a dangling label — see the
 * non-empty guards in `Footer.tsx`.
 */
export interface Company {
  legalName: string;
  regCode: string;
  vat: string;
  address: string;
  supportEmail: string;
  supportPhone: string;
}

// Fields are typed as `string` (not literal `""`) so consumers can guard with
// `company.x && …` without TypeScript narrowing the empty placeholder to `never`.
export const company: Company = {
  legalName: "Rentaro OÜ",
  regCode: "", // TODO: founder to fill (Estonian registry code)
  vat: "", // TODO: VAT number
  address: "", // TODO: registered address
  supportEmail: "", // TODO: support email
  supportPhone: "", // TODO: support phone
};
