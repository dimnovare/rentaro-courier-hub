import type { Locale } from "@/i18n/config";

/**
 * Tiny inline SVG flags keyed by UI locale. We hand-roll the SVGs (no deps, and
 * emoji flags render as bare letter codes on Windows). Each flag is drawn into a
 * 20×14 (≈4:3) rounded rect and clipped, so callers only set the rendered size.
 *
 * `en` deliberately uses the UK/GB flag: English is the neutral default locale.
 */

type FlagProps = {
  locale: Locale;
  /** Rendered width in px (height follows the 20:14 ratio). Default 20. */
  size?: number;
};

// Stable per-locale clip id so multiple flags on a page don't collide.
function FlagFrame({ locale, size = 20, children }: FlagProps & { children: React.ReactNode }) {
  const height = (size * 14) / 20;
  const clipId = `flag-clip-${locale}`;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 20 14"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", borderRadius: 2.5, flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="20" height="14" rx="2.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{children}</g>
      {/* Subtle border so light flags read on a dark background. */}
      <rect x="0.4" y="0.4" width="19.2" height="13.2" rx="2.2" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
    </svg>
  );
}

function UnionJack() {
  // GB flag — blue field, white + red diagonals, white + red upright cross.
  return (
    <>
      <rect width="20" height="14" fill="#012169" />
      {/* White diagonals */}
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#FFFFFF" strokeWidth="2.8" />
      {/* Red diagonals (offset to give the heraldic counterchange) */}
      <path d="M0 0 L20 14" stroke="#C8102E" strokeWidth="1.4" clipPath="url(#uj-right)" />
      <path d="M20 0 L0 14" stroke="#C8102E" strokeWidth="1.4" clipPath="url(#uj-left)" />
      <clipPath id="uj-right">
        <polygon points="0,0 10,7 20,0 20,14 10,7 0,14" />
      </clipPath>
      <clipPath id="uj-left">
        <polygon points="0,0 10,7 0,14 20,14 10,7 20,0" />
      </clipPath>
      {/* White upright cross */}
      <rect x="8" y="0" width="4" height="14" fill="#FFFFFF" />
      <rect x="0" y="5" width="20" height="4" fill="#FFFFFF" />
      {/* Red upright cross */}
      <rect x="8.8" y="0" width="2.4" height="14" fill="#C8102E" />
      <rect x="0" y="5.8" width="20" height="2.4" fill="#C8102E" />
    </>
  );
}

function FlagEE() {
  // Estonia — horizontal blue / black / white.
  return (
    <>
      <rect width="20" height="4.667" y="0" fill="#0072CE" />
      <rect width="20" height="4.667" y="4.667" fill="#000000" />
      <rect width="20" height="4.666" y="9.334" fill="#FFFFFF" />
    </>
  );
}

function FlagLV() {
  // Latvia — carmine-red field with a narrow white middle stripe (2:1:2).
  return (
    <>
      <rect width="20" height="14" fill="#9E3039" />
      <rect width="20" height="2.8" y="5.6" fill="#FFFFFF" />
    </>
  );
}

function FlagFI() {
  // Finland — white field with an off-centre blue Nordic cross.
  return (
    <>
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect x="0" y="5.4" width="20" height="3.2" fill="#003580" />
      <rect x="5.6" y="0" width="3.2" height="14" fill="#003580" />
    </>
  );
}

function FlagRU() {
  // Russia — horizontal white / blue / red.
  return (
    <>
      <rect width="20" height="4.667" y="0" fill="#FFFFFF" />
      <rect width="20" height="4.667" y="4.667" fill="#0039A6" />
      <rect width="20" height="4.666" y="9.334" fill="#D52B1E" />
    </>
  );
}

const FLAGS: Record<Locale, () => React.ReactNode> = {
  en: UnionJack,
  et: FlagEE,
  lv: FlagLV,
  fi: FlagFI,
  ru: FlagRU,
};

export function FlagIcon({ locale, size = 20 }: FlagProps) {
  const Flag = FLAGS[locale] ?? UnionJack;
  return (
    <FlagFrame locale={locale} size={size}>
      <Flag />
    </FlagFrame>
  );
}
