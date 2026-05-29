import { ImageResponse } from "next/og";

/**
 * Default OpenGraph / Twitter card image (1200×630), generated at the edge.
 *
 * On-brand: near-black background, electric-lime "rentaro" wordmark + the core
 * tagline. Uses only system fonts and inline styles — no external font/asset
 * fetches — so it renders fast and never breaks a build.
 */

export const runtime = "edge";
export const alt = "rentaro — delivery-ready e-bikes by the month";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0c11";
const LIME = "#d8ff36";
const TEXT_MUTED = "#aeb6c2";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          background: BG,
          backgroundImage:
            "radial-gradient(1100px 600px at 78% -10%, rgba(111,180,255,0.16), transparent 60%), radial-gradient(900px 700px at 5% 110%, rgba(216,255,54,0.12), transparent 60%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* small lime kicker */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: LIME,
            fontSize: 26,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: LIME,
              boxShadow: `0 0 28px ${LIME}`,
            }}
          />
          for couriers
        </div>

        {/* wordmark */}
        <div
          style={{
            display: "flex",
            color: LIME,
            fontSize: 168,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginTop: 28,
          }}
        >
          rentaro
        </div>

        {/* tagline */}
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginTop: 30,
          }}
        >
          Delivery-ready e-bikes by the month.
        </div>

        <div
          style={{
            display: "flex",
            color: TEXT_MUTED,
            fontSize: 30,
            marginTop: 26,
          }}
        >
          Tallinn · Riga · Helsinki — monthly plans with service support
        </div>
      </div>
    ),
    { ...size }
  );
}
