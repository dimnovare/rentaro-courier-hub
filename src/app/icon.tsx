import { ImageResponse } from "next/og";

/**
 * Generated favicon (48×48), served by Next at /icon. On-brand logo mark:
 * a lowercase lime "r" on a near-black rounded panel with a faint lime glow,
 * echoing the nav brand logo. Inline styles + system font only — no asset
 * fetches, so it renders fast and never breaks a build.
 */
export const runtime = "edge";
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

const BG = "#0a0c11";
const LIME = "#d8ff36";

export default function Icon() {
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
          borderRadius: 11,
          boxShadow: "inset 0 0 0 1px rgba(216,255,54,0.22)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            color: LIME,
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            // optical nudge so the round "r" sits centred in the tile
            marginTop: -2,
          }}
        >
          r
        </div>
      </div>
    ),
    { ...size }
  );
}
