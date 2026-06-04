// Shared default OpenGraph / Twitter card image — the brand 1200×630 card in
// /public/rentaro-og.png. Resolved to an absolute URL via `metadataBase`
// (set in src/app/layout.tsx). Because Next.js replaces (does not deep-merge) a
// child segment's `openGraph`/`twitter` over its parent's, every segment that
// sets `openGraph`/`twitter` must include these images, or it emits no card
// image. Pages with a more specific image (e.g. a model photo) override this.
export const OG_IMAGE_URL = "/rentaro-og.png";
export const OG_IMAGE_ALT = "rentaro — delivery-ready e-bikes by the month";

export const defaultOgImages = [
  { url: OG_IMAGE_URL, width: 1200, height: 630, alt: OG_IMAGE_ALT },
];

export const defaultTwitterImages = [OG_IMAGE_URL];
