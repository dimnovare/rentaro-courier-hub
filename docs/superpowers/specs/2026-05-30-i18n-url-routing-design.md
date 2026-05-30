# Spec: Localized URL routing migration (cookie → `[locale]` segment)

**Date:** 2026-05-30
**Branch:** main
**Stack:** Next.js 16.2.6 · next-intl 4.13 · App Router

---

## Problem

The site uses cookie-based locale selection with no locale segment in URLs.  
Google only ever indexes the English version; the ET/LV/FI/RU translations (~495 keys each) are invisible to search.

## Goal

Migrate to `[locale]` sub-path routing so each language has its own independently-indexable URL. Hreflang alternates must be present so Google associates the translations correctly.

**Constraint:** This is a routing/SEO-only change. Visual design, copy, and behavior must be preserved exactly.

---

## Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Prefix mode | `as-needed` | English stays at clean URLs (`/`, `/pricing`). Other locales prefixed (`/et`, `/et/pricing`). Preserves all currently-indexed English URLs — no 301 churn, no lost ranking. |
| Private routes | Under `[locale]` | Single layout tree, uniform locale context. With `as-needed` admin still lives at `/admin` (default locale). |
| Middleware filename | `proxy.ts` | In Next.js 16 `middleware.ts` is deprecated and renamed to `proxy.ts`. AGENTS.md requires heeding deprecation notices. next-intl `createMiddleware` is wired as the handler inside `proxy.ts`. |
| Cookie retention | `localeCookie: true` | `defineRouting` sets `NEXT_LOCALE` automatically on navigation; `LocaleSwitcher` just calls `router.replace(pathname, {locale})` and the library handles the cookie write. |

---

## File changes

### New files

| File | Purpose |
|---|---|
| `src/i18n/routing.ts` | `defineRouting` config — single source of truth for locales, defaultLocale, localePrefix |
| `src/i18n/navigation.ts` | `createNavigation(routing)` — exports `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` |
| `src/proxy.ts` | Next.js 16 proxy (= former middleware). Runs `createMiddleware(routing)`. Matcher excludes `_next/*`, static assets, and metadata files. |

### Moved / restructured

```
src/app/                          src/app/
  layout.tsx             →          layout.tsx          (root shell: only sets <html> charset; delegates to [locale] layout)
  page.tsx               →        [locale]/
  models/                →          layout.tsx          (locale shell: lang attr, NextIntlClientProvider, Nav/Footer, metadata w/ hreflang)
  models/[slug]/         →          page.tsx
  pricing/               →          models/
  how-it-works/          →          models/[slug]/
  accessories/           →          pricing/
  faq/                   →          how-it-works/
  rules/                 →          accessories/
  privacy/               →          faq/
  terms/                 →          rules/
  book/                  →          privacy/
  booking/               →          terms/
  booking/success/       →          book/
  booking/status/        →          booking/
  my-rental/             →          booking/success/
  cities/                →          booking/status/
  cities/[city]/         →          my-rental/
  admin/                 →          cities/
  delivery-ebike-rental/ →          cities/[city]/
  ebike-rental-for-couriers/ →      admin/
  monthly-ebike-rental/  →          delivery-ebike-rental/
  ebike-rental-for-couriers/
  monthly-ebike-rental/
```

**Stays at `src/app/` root** (Next.js resolves these at the root only):
- `sitemap.ts`
- `robots.ts`
- `manifest.ts`
- `opengraph-image.tsx`
- `favicon.ico`
- `globals.css`

### `src/app/layout.tsx` (root, after migration)

Minimal shell — only sets `<html>` and `<body>` with no locale context (locale is determined inside `[locale]/layout.tsx`):

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

All font variables, metadata, and providers move to `[locale]/layout.tsx`.

### `src/app/[locale]/layout.tsx`

Responsibilities:
- `generateStaticParams()` → `routing.locales.map(locale => ({ locale }))` 
- `isLocale(locale)` guard (from `src/i18n/config.ts`) → `notFound()` for invalid segments
- `setRequestLocale(locale)` for static rendering support
- `<html lang={locale}>` with font variables
- `NextIntlClientProvider` + `InteractionProvider` + `Background`, `Nav`, `Footer`, `CookieConsent`, `Analytics`, `JsonLd`
- `generateMetadata` with hreflang alternates (see SEO section)

### `src/i18n/request.ts`

Switch from cookie-read to `requestLocale`-based resolution:

```ts
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;
  return { locale, messages: catalogs[locale] };
});
```

Uses the existing `isLocale` type guard from `src/i18n/config.ts` (next-intl 4.13 does not export a `hasLocale` type guard). The cookie is still written by the proxy/navigation layer; `request.ts` no longer reads it directly.

---

## Navigation refactor

### New `src/i18n/navigation.ts`

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

### Import swap matrix

| Component / file | Currently imports | After migration |
|---|---|---|
| `Nav.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `Footer.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `ModelCard.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `CookieConsent.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `AdminSidebar.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `booking/success/page.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `models/[slug]/page.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `cities/[city]/page.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `delivery-ebike-rental/page.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `ebike-rental-for-couriers/page.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `monthly-ebike-rental/page.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `admin/page.tsx` | `Link` from `next/link` | `Link` from `@/i18n/navigation` |
| `Interactions.tsx` | `useRouter` from `next/navigation` | `useRouter` from `@/i18n/navigation` |
| `CommandPalette.tsx` | `useRouter` from `next/navigation` | `useRouter` from `@/i18n/navigation` |
| `AdminTopbar.tsx` | `usePathname` from `next/navigation` | `usePathname` from `@/i18n/navigation` |
| `AdminShell.tsx` | `usePathname` from `next/navigation` | `usePathname` from `@/i18n/navigation` |
| `BookingWizard.tsx` | `useRouter` from `next/navigation` | `useRouter` from `@/i18n/navigation` |
| `LocaleSwitcher.tsx` | `useRouter` from `next/navigation` | `useRouter` from `@/i18n/navigation` |

**Keep from `next/navigation`** (next-intl does not wrap these):
- `useSearchParams` — `BookingWizard.tsx`, `ManageRental.tsx`, `BookingStatusLookup.tsx`
- `notFound` — `models/[slug]/page.tsx`, `cities/[city]/page.tsx`

### `LocaleSwitcher.tsx` behavioral change

Before: writes `NEXT_LOCALE` cookie manually, calls `router.refresh()`.  
After: `router.replace(pathname, { locale: next })` — next-intl navigates to the localized URL and writes the cookie automatically via the routing config.  
The select UI, classNames, and label are unchanged.

---

## SEO

### `[locale]/layout.tsx` — `generateMetadata`

```ts
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const canonical = getPathname({ locale, href: "/" });
  return {
    alternates: {
      canonical,
      languages: buildLanguagesMap("/"),
    },
    openGraph: { locale },
    // ... rest of metadata unchanged
  };
}
```

`buildLanguagesMap(pathname)` is a shared helper:

```ts
function buildLanguagesMap(pathname: string) {
  return Object.fromEntries([
    ...routing.locales.map(loc => [loc, getPathname({ locale: loc, href: pathname })]),
    ["x-default", getPathname({ locale: "en", href: pathname })],
  ]);
}
```

Dynamic pages (`models/[slug]/page.tsx`, `cities/[city]/page.tsx`) call `buildLanguagesMap` with their own pathname.

### `sitemap.ts`

Each URL entry includes `alternates.languages` mapping all locale variants — Google's recommended sitemap hreflang form:

```ts
return routes.map(path => ({
  url: `${base}${path || "/"}`,
  lastModified: now,
  alternates: {
    languages: Object.fromEntries(
      routing.locales.map(locale => [
        locale,
        `${base}${getPathname({ locale, href: path || "/" })}`,
      ])
    ),
  },
}));
```

### `robots.ts`

Disallow rules extended to cover locale-prefixed variants of private paths:

```ts
disallow: [
  "/admin", "/et/admin", "/lv/admin", "/fi/admin", "/ru/admin",
  "/my-rental", "/et/my-rental", "/lv/my-rental", "/fi/my-rental", "/ru/my-rental",
  "/booking/success", "/et/booking/success", /* … */
]
```

---

## `proxy.ts` (Next.js 16 name for middleware)

```ts
// This file uses the Next.js 16 proxy convention (formerly middleware.ts).
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\..*).*)",
  ],
};
```

---

## Vitest setup

`vitest.setup.tsx` currently mocks `next/link` and `next/navigation`. Add matching mocks for `@/i18n/navigation` that delegate to the same stubs, so existing tests continue to pass without changes to test files.

---

## Verification checklist

1. `npm run build` succeeds — all localized routes render at their expected paths
2. `npm run lint` — zero errors
3. `npm run test` — all vitest tests pass
4. Rendered HTML for `/` contains `<link rel="alternate" hreflang="et" href="…/et">` etc.
5. Rendered HTML for `/et/pricing` contains correct canonical and hreflang tags
6. Language switcher navigates to the correct locale URL and the NEXT_LOCALE cookie is updated
7. `sitemap.xml` contains per-locale `xhtml:link` alternate entries
8. `/et/admin` is disallowed in `robots.txt`
9. Build output shows routes for each of the 5 locales

---

## Out of scope

- Content/copy changes
- Visual/CSS changes
- Backend changes
- Path-specific localized slugs (e.g. `/et/mudeli/slug`) — pathnames stay the same across locales
- Domain-based routing
