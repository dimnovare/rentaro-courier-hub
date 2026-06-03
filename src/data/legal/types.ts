/**
 * Shared types for the structured legal/policy copy rendered on the
 * /rules, /privacy and /terms pages.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  /** Document title shown as the page heading. */
  title: string;
  /** Human-readable "last updated" date. */
  updated: string;
  /** Short framing paragraph shown under the title. */
  intro: string;
  /** Ordered content sections. */
  sections: LegalSection[];
}
