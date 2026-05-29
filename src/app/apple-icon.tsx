import { ImageResponse } from "next/og";

/**
 * Apple touch icon (180×180), served by Next at /apple-icon. Same on-brand
 * logo mark as icon.tsx, scaled up with the lime/blue radial glow used on the
 * OG image. Fills the tile edge-to-edge — iOS applies its own rounded mask.
 * Inline styles + system font only, so no asset fetches.
 */
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BG = "#0a0c11";
const LIME = "#d8ff36";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          backgroundImage:
            "radial-gradient(150px 120px at 80% 0%, rgba(111,180,255,0.20), transparent 60%), radial-gradient(150px 150px at 0% 110%, rgba(216,255,54,0.18), transparent 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            color: LIME,
            fontSize: 132,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            marginTop: -8,
          }}
        >
          r
        </div>
      </div>
    ),
    { ...size }
  );
}
