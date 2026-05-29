"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  locales,
  localeNames,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";

/**
 * Cookie-based locale switcher (no i18n routing). Writes the NEXT_LOCALE
 * cookie and refreshes the route so the server re-renders with the new
 * catalog. Styled to sit quietly in the nav (mono, subtle).
 */
export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: Locale) {
    if (next === activeLocale) return;
    // 1 year, site-wide. lax is fine — no cross-site needs.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="locale-switcher" aria-label="Language">
      <select
        value={activeLocale}
        onChange={(e) => onChange(e.target.value as Locale)}
        disabled={isPending}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
      <span className="locale-caret" aria-hidden="true">
        <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6 L8 10 L12 6" />
        </svg>
      </span>
    </label>
  );
}
