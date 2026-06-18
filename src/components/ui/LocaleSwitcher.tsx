"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { FlagIcon } from "@/components/ui/FlagIcon";

type Variant = "bar" | "menu";

/**
 * Accessible custom-dropdown language switcher.
 *
 * A native <select> can't render a per-option flag image, so this is a
 * hand-rolled button + listbox popover with full keyboard support:
 * - button: aria-haspopup="listbox", aria-expanded, opens on click / Enter /
 *   Space / ArrowDown/Up.
 * - listbox: role="listbox", options role="option" with aria-selected; arrow
 *   keys move focus, Home/End jump, Enter/Space select, Esc closes, click
 *   outside closes, and focus returns to the trigger on close.
 *
 * Selection keeps the existing logic: router.replace(pathname, { locale }),
 * which sets the NEXT_LOCALE cookie via next-intl navigation.
 *
 * variant="bar"  → compact trigger (flag + locale code, e.g. "ET") for the top bar.
 * variant="menu" → full rows (flag + own-language name) for the mobile menu.
 */
export function LocaleSwitcher({ variant = "bar" }: { variant?: Variant }) {
  const activeLocale = useLocale() as Locale;
  const t = useTranslations("localeSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, locales.indexOf(activeLocale)),
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listboxId = useId();

  function select(next: Locale) {
    setOpen(false);
    if (next !== activeLocale) {
      startTransition(() => {
        router.replace(pathname, { locale: next });
      });
    }
  }

  function openMenu() {
    setActiveIndex(Math.max(0, locales.indexOf(activeLocale)));
    setOpen(true);
  }

  function closeMenu(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  // Click / focus outside closes the popover.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Move DOM focus to the active option whenever it changes while open.
  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % locales.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + locales.length) % locales.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(locales.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        select(locales[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        closeMenu();
        break;
      case "Tab":
        // Let focus leave naturally, but close the popover.
        setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className={`locale-switcher locale-switcher--${variant}`}
      data-open={open || undefined}
    >
      <button
        ref={buttonRef}
        type="button"
        className="locale-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
        disabled={isPending}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
      >
        <FlagIcon locale={activeLocale} size={variant === "menu" ? 22 : 20} />
        <span className="locale-trigger-label">
          {variant === "menu" ? localeNames[activeLocale] : activeLocale.toUpperCase()}
        </span>
        <span className="locale-caret" aria-hidden="true">
          <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6 L8 10 L12 6" />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          className="locale-listbox"
          role="listbox"
          id={listboxId}
          aria-label={t("label")}
          aria-activedescendant={`${listboxId}-${locales[activeIndex]}`}
          onKeyDown={onListKeyDown}
        >
          {locales.map((loc, i) => {
            const selected = loc === activeLocale;
            return (
              <li
                key={loc}
                id={`${listboxId}-${loc}`}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                className="locale-option"
                data-selected={selected || undefined}
                onClick={() => select(loc)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <FlagIcon locale={loc} size={22} />
                <span className="locale-option-label">{localeNames[loc]}</span>
                {selected && (
                  <span className="locale-check" aria-hidden="true">
                    <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5 L6.5 12 L13 4" />
                    </svg>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
