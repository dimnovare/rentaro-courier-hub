import type { ReactElement } from "react";

type IconProps = { s?: number };

/** Geometric line icons (ported from the locked design). Pure SVG — safe in
 *  both server and client components. Use as <Ic.arrow s={16} />. */
export const Ic = {
  arrow: ({ s = 16 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13" /><path d="M9 4 L13 8 L9 12" /></svg>
  ),
  check: ({ s = 12 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 L7 12 L13 4" /></svg>
  ),
  plus: ({ s = 14 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3 V13" /><path d="M3 8 H13" /></svg>
  ),
  menu: ({ s = 18 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 8 H20" /><path d="M4 16 H20" /></svg>
  ),
  bolt: ({ s = 16 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3 L5 13 H11 L10 21 L19 10 H13 Z" /></svg>
  ),
  battery: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="16" height="10" rx="2" /><rect x="20" y="10" width="2" height="4" rx="1" fill="currentColor" /><rect x="5.5" y="9.5" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.7" /></svg>
  ),
  bag: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8 H19 L18 20 H6 Z" /><path d="M9 8 V6 a3 3 0 0 1 6 0 V8" /><path d="M9 12 H15" /></svg>
  ),
  rack: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="3" rx="1" /><path d="M6 9 V18" /><path d="M18 9 V18" /><path d="M6 14 H18" /></svg>
  ),
  phone: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="3" width="8" height="18" rx="2" /><circle cx="12" cy="18" r="0.5" fill="currentColor" /></svg>
  ),
  lock: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11 V8 a4 4 0 0 1 8 0 V11" /></svg>
  ),
  helmet: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15 a8 8 0 0 1 16 0" /><path d="M3 15 H21 V17 H3 Z" /><path d="M9 7 V11" /><path d="M15 7 V11" /></svg>
  ),
  rain: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13 a5 5 0 0 1 10 0 H19 a3 3 0 1 0 -3 -3" /><path d="M8 17 L7 19" /><path d="M12 17 L11 19" /><path d="M16 17 L15 19" /></svg>
  ),
  tire: ({ s = 22 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 4 V8" /><path d="M12 16 V20" /><path d="M4 12 H8" /><path d="M16 12 H20" /></svg>
  ),
  gauge: ({ s = 16 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16 a8 8 0 0 1 16 0" /><path d="M12 16 L16 10" /></svg>
  ),
  route: ({ s = 16 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="6" r="2.4" /><path d="M8 16 C 14 14 10 10 16 8" /></svg>
  ),
  spark: ({ s = 16 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 V20" /><path d="M4 12 H20" /><path d="M7 7 L17 17" /><path d="M17 7 L7 17" /></svg>
  ),
  shield: ({ s = 16 }: IconProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 L19 6 V11 C 19 16 12 21 12 21 C 12 21 5 16 5 11 V6 Z" /></svg>
  ),
} as const;

export type IconName = keyof typeof Ic;

/** Lookup an icon by name (falls back to bolt). */
export function getIcon(name: string): (p: IconProps) => ReactElement {
  return (Ic as Record<string, (p: IconProps) => ReactElement>)[name] ?? Ic.bolt;
}
