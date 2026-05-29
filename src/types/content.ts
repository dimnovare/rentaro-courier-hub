/** Misc content types: FAQ, how-it-works steps. */

export interface Faq {
  q: string;
  a: string;
}

export interface Step {
  /** Step number label, e.g. "01". */
  n: string;
  title: string;
  copy: string;
}
