"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(next: Locale) {
    if (next === activeLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
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
