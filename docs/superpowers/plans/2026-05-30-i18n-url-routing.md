# i18n URL Routing Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from cookie-only locale selection to `[locale]` sub-path routing so each language (EN/ET/LV/FI/RU) is independently indexable by search engines.

**Architecture:** Introduce `src/i18n/routing.ts` (defineRouting, `as-needed` prefix, `en` unprefixed) + `src/i18n/navigation.ts` (createNavigation wrappers) + `src/proxy.ts` (Next.js 16 proxy wrapping next-intl middleware). Move all routes under `src/app/[locale]/`. Swap all `next/link`/`next/navigation` imports to `@/i18n/navigation` equivalents. Add per-page hreflang via a `buildAlternates` helper.

**Tech Stack:** Next.js 16.2.6 App Router, next-intl 4.13, TypeScript, Vitest

---

## File map

| Action | Path |
|---|---|
| CREATE | `src/i18n/routing.ts` |
| CREATE | `src/i18n/navigation.ts` |
| CREATE | `src/i18n/alternates.ts` |
| CREATE | `src/proxy.ts` |
| CREATE | `src/app/[locale]/layout.tsx` |
| MODIFY | `src/i18n/request.ts` |
| MODIFY | `src/app/layout.tsx` |
| MODIFY | `src/app/sitemap.ts` |
| MODIFY | `src/app/robots.ts` |
| MODIFY | `vitest.setup.tsx` |
| MOVE + MODIFY | `src/app/page.tsx` → `src/app/[locale]/page.tsx` |
| MOVE | `src/app/rules/` → `src/app/[locale]/rules/` |
| MOVE | `src/app/privacy/` → `src/app/[locale]/privacy/` |
| MOVE | `src/app/terms/` → `src/app/[locale]/terms/` |
| MOVE | `src/app/book/` → `src/app/[locale]/book/` |
| MOVE | `src/app/booking/` → `src/app/[locale]/booking/` |
| MOVE | `src/app/my-rental/` → `src/app/[locale]/my-rental/` |
| MOVE | `src/app/pricing/` → `src/app/[locale]/pricing/` |
| MOVE | `src/app/how-it-works/` → `src/app/[locale]/how-it-works/` |
| MOVE | `src/app/faq/` → `src/app/[locale]/faq/` |
| MOVE | `src/app/accessories/` → `src/app/[locale]/accessories/` |
| MOVE | `src/app/models/` → `src/app/[locale]/models/` |
| MOVE | `src/app/cities/` → `src/app/[locale]/cities/` |
| MOVE | `src/app/admin/` → `src/app/[locale]/admin/` |
| MOVE | `src/app/delivery-ebike-rental/` → `src/app/[locale]/delivery-ebike-rental/` |
| MOVE | `src/app/ebike-rental-for-couriers/` → `src/app/[locale]/ebike-rental-for-couriers/` |
| MOVE | `src/app/monthly-ebike-rental/` → `src/app/[locale]/monthly-ebike-rental/` |
| MODIFY | `src/components/layout/Nav.tsx` |
| MODIFY | `src/components/layout/Footer.tsx` |
| MODIFY | `src/components/models/ModelCard.tsx` |
| MODIFY | `src/components/ui/CookieConsent.tsx` |
| MODIFY | `src/components/ui/LocaleSwitcher.tsx` |
| MODIFY | `src/components/admin/AdminSidebar.tsx` |
| MODIFY | `src/components/admin/AdminTopbar.tsx` |
| MODIFY | `src/components/admin/AdminShell.tsx` |
| MODIFY | `src/components/admin/CommandPalette.tsx` |
| MODIFY | `src/components/providers/Interactions.tsx` |
| MODIFY | `src/components/booking/BookingWizard.tsx` |
| MODIFY | `src/app/[locale]/models/[slug]/page.tsx` |
| MODIFY | `src/app/[locale]/cities/[city]/page.tsx` |
| MODIFY | `src/app/[locale]/delivery-ebike-rental/page.tsx` |
| MODIFY | `src/app/[locale]/ebike-rental-for-couriers/page.tsx` |
| MODIFY | `src/app/[locale]/monthly-ebike-rental/page.tsx` |
| STAY (no change) | `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/manifest.ts`, `src/app/opengraph-image.tsx`, `src/app/favicon.ico`, `src/app/globals.css` |

---

## Task 1: Create `src/i18n/routing.ts`

**Files:** Create `src/i18n/routing.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/i18n/routing.ts
import defineRouting from "next-intl/routing";
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeCookie: true,
  localeDetection: true,
});
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/routing.ts
git commit -m "feat(i18n): add defineRouting config with as-needed prefix"
```

---

## Task 2: Create `src/i18n/navigation.ts`

**Files:** Create `src/i18n/navigation.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/navigation.ts
git commit -m "feat(i18n): add createNavigation exports"
```

---

## Task 3: Create `src/i18n/alternates.ts`

**Files:** Create `src/i18n/alternates.ts`

This helper is a pure function with no React imports — safe to call from `sitemap.ts`, `generateMetadata`, and server components.

- [ ] **Step 1: Create the file**

```typescript
// src/i18n/alternates.ts
import { locales, defaultLocale, type Locale } from "./config";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app").replace(/\/$/, "");

/** Returns the localized path for a given locale and base path.
 *  English (default) paths are unprefixed; others get a /<locale> prefix. */
export function localePath(locale: Locale, href: string): string {
  const p = href || "/";
  if (locale === defaultLocale) return p;
  return `/${locale}${p === "/" ? "" : p}`;
}

/** Builds the `alternates` object for Next.js `generateMetadata`.
 *  Includes all supported locales + x-default pointing to English. */
export function buildAlternates(locale: Locale, href: string) {
  const base = siteUrl();
  const canonical = `${base}${localePath(locale, href)}`;
  const languages = Object.fromEntries([
    ...locales.map((loc) => [loc, `${base}${localePath(loc, href)}`]),
    ["x-default", `${base}${localePath(defaultLocale, href)}`],
  ]);
  return { canonical, languages };
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/alternates.ts
git commit -m "feat(i18n): add buildAlternates helper for hreflang metadata"
```

---

## Task 4: Update `src/i18n/request.ts`

**Files:** Modify `src/i18n/request.ts`

Switch from cookie-read to `requestLocale` from the URL segment (set by the proxy).

- [ ] **Step 1: Replace the file content**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, type Locale } from "./config";
import en from "../../messages/en.json";
import et from "../../messages/et.json";
import lv from "../../messages/lv.json";
import fi from "../../messages/fi.json";
import ru from "../../messages/ru.json";

const catalogs: Record<Locale, Record<string, unknown>> = { en, et, lv, fi, ru };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;
  return {
    locale,
    messages: catalogs[locale],
  };
});
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/request.ts
git commit -m "feat(i18n): switch request.ts to requestLocale (URL-segment based)"
```

---

## Task 5: Create `src/proxy.ts`

**Files:** Create `src/proxy.ts`

In Next.js 16, `middleware.ts` is deprecated and renamed to `proxy.ts` (function renamed from `middleware` to `proxy`). next-intl's `createMiddleware` is wired here as the handler.

- [ ] **Step 1: Create the file**

```typescript
// src/proxy.ts
// Next.js 16 renames middleware.ts → proxy.ts (function middleware → proxy).
// next-intl's createMiddleware provides locale detection, cookie sync, and
// path-prefix rewriting based on the routing config.
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, and metadata files.
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\..*).*)",
  ],
};
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: add proxy.ts (Next.js 16 middleware) with next-intl routing"
```

---

## Task 6: Update `vitest.setup.tsx` (add `@/i18n/navigation` mock)

**Files:** Modify `vitest.setup.tsx`

Do this BEFORE swapping imports in components so tests stay green throughout the migration.

- [ ] **Step 1: Add the `@/i18n/navigation` mock after the existing `next/link` mock**

Open `vitest.setup.tsx` and add after the `vi.mock("next/link", ...)` block (around line 41):

```typescript
// @/i18n/navigation re-exports next-intl-aware versions of Link/useRouter/
// usePathname. In tests, delegate to the same inert stubs as next/link +
// next/navigation so component tests can render without a router context.
vi.mock("@/i18n/navigation", () => ({
  __esModule: true,
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children: import("react").ReactNode;
  } & Record<string, unknown>) => {
    const url = typeof href === "string" ? href : (href?.pathname ?? "");
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    );
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  redirect: vi.fn(),
  getPathname: vi.fn(() => "/"),
}));
```

Also add `setRequestLocale` to the `next-intl/server` mock (around line 92), since it'll be called from layout in tests:

```typescript
vi.mock("next-intl/server", async () => {
  const enMessages = (await import("./messages/en.json"))
    .default as Record<string, unknown>;
  return {
    getTranslations: async (namespace?: string) =>
      intl.makeT(enMessages, namespace),
    getLocale: async () => "en",
    getMessages: async () => enMessages,
    setRequestLocale: vi.fn(), // no-op in tests
  };
});
```

- [ ] **Step 2: Run existing tests to confirm they still pass**

```bash
npx vitest run 2>&1
```

Expected: all tests PASS (no regressions from the mock addition).

- [ ] **Step 3: Commit**

```bash
git add vitest.setup.tsx
git commit -m "test: add @/i18n/navigation mock + setRequestLocale stub"
```

---

## Task 7: Move routes under `[locale]` directory

**Files:** Move all route directories

Use `git mv` so the rename is tracked in git history. Run these commands in Bash (not PowerShell — square brackets in PowerShell paths need special handling that git mv avoids).

- [ ] **Step 1: Create the `[locale]` directory and move all routes**

```bash
mkdir -p 'src/app/[locale]'
git mv 'src/app/page.tsx' 'src/app/[locale]/page.tsx'
git mv 'src/app/rules' 'src/app/[locale]/rules'
git mv 'src/app/privacy' 'src/app/[locale]/privacy'
git mv 'src/app/terms' 'src/app/[locale]/terms'
git mv 'src/app/book' 'src/app/[locale]/book'
git mv 'src/app/booking' 'src/app/[locale]/booking'
git mv 'src/app/my-rental' 'src/app/[locale]/my-rental'
git mv 'src/app/pricing' 'src/app/[locale]/pricing'
git mv 'src/app/how-it-works' 'src/app/[locale]/how-it-works'
git mv 'src/app/faq' 'src/app/[locale]/faq'
git mv 'src/app/accessories' 'src/app/[locale]/accessories'
git mv 'src/app/models' 'src/app/[locale]/models'
git mv 'src/app/cities' 'src/app/[locale]/cities'
git mv 'src/app/admin' 'src/app/[locale]/admin'
git mv 'src/app/delivery-ebike-rental' 'src/app/[locale]/delivery-ebike-rental'
git mv 'src/app/ebike-rental-for-couriers' 'src/app/[locale]/ebike-rental-for-couriers'
git mv 'src/app/monthly-ebike-rental' 'src/app/[locale]/monthly-ebike-rental'
```

- [ ] **Step 2: Verify the directory structure looks correct**

```bash
find 'src/app/[locale]' -name 'page.tsx' | sort
```

Expected output (paths must include `[locale]`):
```
src/app/[locale]/accessories/page.tsx
src/app/[locale]/admin/bookings/page.tsx
src/app/[locale]/admin/calendar/page.tsx
src/app/[locale]/admin/content/page.tsx
src/app/[locale]/admin/contracts/page.tsx
src/app/[locale]/admin/fleet/page.tsx
src/app/[locale]/admin/maintenance/page.tsx
src/app/[locale]/admin/models/page.tsx
src/app/[locale]/admin/page.tsx
src/app/[locale]/admin/rentals/page.tsx
src/app/[locale]/book/page.tsx
src/app/[locale]/booking/status/page.tsx
src/app/[locale]/booking/success/page.tsx
src/app/[locale]/cities/[city]/page.tsx
src/app/[locale]/delivery-ebike-rental/page.tsx
src/app/[locale]/ebike-rental-for-couriers/page.tsx
src/app/[locale]/faq/page.tsx
src/app/[locale]/how-it-works/page.tsx
src/app/[locale]/models/[slug]/page.tsx
src/app/[locale]/models/page.tsx
src/app/[locale]/monthly-ebike-rental/page.tsx
src/app/[locale]/my-rental/page.tsx
src/app/[locale]/page.tsx
src/app/[locale]/pricing/page.tsx
src/app/[locale]/rules/page.tsx
src/app/[locale]/privacy/page.tsx
src/app/[locale]/terms/page.tsx
```

- [ ] **Step 3: Confirm sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx, globals.css, favicon.ico are STILL at `src/app/` root (not moved)**

```bash
ls src/app/*.ts src/app/*.tsx src/app/*.css src/app/favicon.ico 2>/dev/null
```

Expected: `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, `globals.css`, `favicon.ico` are listed.

- [ ] **Step 4: Commit the file moves**

```bash
git add -A
git commit -m "refactor: move all routes under src/app/[locale]/"
```

---

## Task 8: Create `src/app/[locale]/layout.tsx`

**Files:** Create `src/app/[locale]/layout.tsx`

This is the locale shell. It does NOT render `<html>` or `<body>` — those stay in the root `app/layout.tsx`. It provides providers, Nav, Footer, and calls `setRequestLocale` for static rendering.

- [ ] **Step 1: Create the file**

```typescript
// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { InteractionProvider } from "@/components/providers/Interactions";
import { Background } from "@/components/layout/Background";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { buildAlternates } from "@/i18n/alternates";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? (locale as Locale) : "en";
  return {
    alternates: buildAlternates(loc, "/"),
    openGraph: { locale: loc },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale as Locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <InteractionProvider>
        <Background />
        <Nav />
        {children}
        <Footer />
        <CookieConsent />
      </InteractionProvider>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from this file (there will be errors elsewhere until the root layout is fixed, which comes next).

- [ ] **Step 3: Commit**

```bash
git add 'src/app/[locale]/layout.tsx'
git commit -m "feat: add [locale] layout with providers, generateStaticParams, and hreflang"
```

---

## Task 9: Update root `src/app/layout.tsx`

**Files:** Modify `src/app/layout.tsx`

The root layout keeps `<html>` and `<body>`. Remove all providers and Nav/Footer (they move to `[locale]/layout.tsx`). Keep fonts, `globals.css`, Analytics, JsonLd, and the static base metadata. Call `getLocale()` to set the `lang` attribute.

- [ ] **Step 1: Replace the entire file**

```typescript
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { Analytics } from "@/components/analytics/Analytics";
import { JsonLd, buildOrganizationSchema } from "@/components/seo/JsonLd";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app"
).replace(/\/$/, "");

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const title = "rentaro — Delivery-ready e-bikes by the month";
const description =
  "Rent a delivery-built e-bike by the month in Tallinn, Riga and Helsinki. 30-day, 6 and 12-month plans with service support, lock, charger and extra-battery options included.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", rel: "icon" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "rentaro",
    title,
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0C11",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Analytics />
        <JsonLd data={buildOrganizationSchema()} />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no type errors from layout files.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "refactor: slim root layout — move providers to [locale]/layout"
```

---

## Task 10: Swap `next/link` imports — public-facing components

**Files:** Modify `Nav.tsx`, `Footer.tsx`, `ModelCard.tsx`, `CookieConsent.tsx`, `booking/success/page.tsx`, `admin/page.tsx`

For each file: change `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`. No other changes.

- [ ] **Step 1: Update `src/components/layout/Nav.tsx`**

Change line 4:
```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 2: Update `src/components/layout/Footer.tsx`**

Change line 1:
```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 3: Update `src/components/models/ModelCard.tsx`**

Change the `next/link` import:
```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 4: Update `src/components/ui/CookieConsent.tsx`**

Change the `next/link` import:
```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 5: Update `src/app/[locale]/booking/success/page.tsx`**

Change the `next/link` import:
```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 6: Update `src/app/[locale]/admin/page.tsx`**

Change the `next/link` import:
```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run 2>&1
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/Nav.tsx src/components/layout/Footer.tsx \
        src/components/models/ModelCard.tsx src/components/ui/CookieConsent.tsx \
        'src/app/[locale]/booking/success/page.tsx' 'src/app/[locale]/admin/page.tsx'
git commit -m "refactor: swap next/link → @/i18n/navigation Link in public components"
```

---

## Task 11: Swap `next/link` imports — SEO landing + inner page components

**Files:** Modify `delivery-ebike-rental`, `ebike-rental-for-couriers`, `monthly-ebike-rental` pages; `AdminSidebar.tsx`; `models/[slug]/page.tsx`; `cities/[city]/page.tsx`

- [ ] **Step 1: Update `src/app/[locale]/delivery-ebike-rental/page.tsx`**

Change the `next/link` import:
```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 2: Update `src/app/[locale]/ebike-rental-for-couriers/page.tsx`**

```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 3: Update `src/app/[locale]/monthly-ebike-rental/page.tsx`**

```typescript
// Before:
import Link from "next/link";
// After:
import { Link } from "@/i18n/navigation";
```

- [ ] **Step 4: Update `src/components/admin/AdminSidebar.tsx`**

Change the `next/link` import AND the `next/navigation` import in one edit:
```typescript
// Before:
import Link from "next/link";
import { usePathname } from "next/navigation";
// After:
import { Link, usePathname } from "@/i18n/navigation";
```

- [ ] **Step 5: Update `src/app/[locale]/models/[slug]/page.tsx`**

```typescript
// Before:
import Link from "next/link";
import { notFound } from "next/navigation";
// After:
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";  // keep — next-intl doesn't wrap notFound
```

- [ ] **Step 6: Update `src/app/[locale]/cities/[city]/page.tsx`**

```typescript
// Before:
import Link from "next/link";
import { notFound } from "next/navigation";
// After:
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";  // keep
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run 2>&1
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add 'src/app/[locale]/delivery-ebike-rental/page.tsx' \
        'src/app/[locale]/ebike-rental-for-couriers/page.tsx' \
        'src/app/[locale]/monthly-ebike-rental/page.tsx' \
        src/components/admin/AdminSidebar.tsx \
        'src/app/[locale]/models/[slug]/page.tsx' \
        'src/app/[locale]/cities/[city]/page.tsx'
git commit -m "refactor: swap next/link → @/i18n/navigation in SEO pages + admin sidebar + dynamic pages"
```

---

## Task 12: Swap `useRouter` / `usePathname` imports

**Files:** Modify `Interactions.tsx`, `BookingWizard.tsx`, `AdminShell.tsx`, `AdminTopbar.tsx`, `CommandPalette.tsx`

For each: change `useRouter`/`usePathname` from `next/navigation` → `@/i18n/navigation`. `useSearchParams` and `notFound` stay from `next/navigation`.

- [ ] **Step 1: Update `src/components/providers/Interactions.tsx`**

Change line 4:
```typescript
// Before:
import { useRouter } from "next/navigation";
// After:
import { useRouter } from "@/i18n/navigation";
```

- [ ] **Step 2: Update `src/components/booking/BookingWizard.tsx`**

Change line 4:
```typescript
// Before:
import { useRouter, useSearchParams } from "next/navigation";
// After:
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
```

- [ ] **Step 3: Update `src/components/admin/AdminShell.tsx`**

Change line 13:
```typescript
// Before:
import { usePathname } from "next/navigation";
// After:
import { usePathname } from "@/i18n/navigation";
```

- [ ] **Step 4: Update `src/components/admin/AdminTopbar.tsx`**

Change the `next/navigation` import:
```typescript
// Before:
import { usePathname } from "next/navigation";
// After:
import { usePathname } from "@/i18n/navigation";
```

- [ ] **Step 5: Update `src/components/admin/CommandPalette.tsx`**

Change the `next/navigation` import:
```typescript
// Before:
import { useRouter } from "next/navigation";
// After:
import { useRouter } from "@/i18n/navigation";
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run 2>&1
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/providers/Interactions.tsx \
        src/components/booking/BookingWizard.tsx \
        src/components/admin/AdminShell.tsx \
        src/components/admin/AdminTopbar.tsx \
        src/components/admin/CommandPalette.tsx
git commit -m "refactor: swap useRouter/usePathname → @/i18n/navigation in providers + admin"
```

---

## Task 13: Update `LocaleSwitcher.tsx`

**Files:** Modify `src/components/ui/LocaleSwitcher.tsx`

Replace the manual cookie write + `router.refresh()` with `router.replace(pathname, { locale })`. next-intl's router writes the `NEXT_LOCALE` cookie automatically and navigates to the localized URL. The UI/markup is unchanged.

- [ ] **Step 1: Replace the file content**

```typescript
// src/components/ui/LocaleSwitcher.tsx
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
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run 2>&1
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LocaleSwitcher.tsx
git commit -m "feat: update LocaleSwitcher to use router.replace with locale (drops manual cookie write)"
```

---

## Task 14: Add hreflang to dynamic pages (`[slug]` and `[city]`)

**Files:** Modify `src/app/[locale]/models/[slug]/page.tsx` and `src/app/[locale]/cities/[city]/page.tsx`

Add `locale` to the `Params` type and include `buildAlternates` in `generateMetadata`. Also fix `openGraph.locale` to use the actual locale instead of the hardcoded `"en"`.

- [ ] **Step 1: Update `src/app/[locale]/models/[slug]/page.tsx`**

Change the `Params` type and `generateMetadata`:

```typescript
// Change:
type Params = { params: Promise<{ slug: string }> };

// To:
type Params = { params: Promise<{ locale: string; slug: string }> };
```

Add import at the top of the file:
```typescript
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
```

Replace `generateMetadata`:
```typescript
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const m = getModelBySlug(slug);
  if (!m) return { title: "Model not found — rentaro" };
  const title = `${m.name} — rentaro`;
  const description =
    m.blurb ?? `${m.name} — available on 30-day, 6 or 12-month rentaro plans.`;
  const path = `/models/${m.slug}`;
  const ogImage = resolveImg(m.img);
  return {
    title,
    description,
    alternates: buildAlternates(loc, path),
    openGraph: {
      type: "website",
      siteName: "rentaro",
      title,
      description,
      url: path,
      locale: loc,
      images: [{ url: ogImage, alt: m.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
```

Also update the page component signature to match:
```typescript
export default async function ModelDetail({ params }: Params) {
  const { slug } = await params;
  // rest is unchanged
```

- [ ] **Step 2: Update `src/app/[locale]/cities/[city]/page.tsx`**

Change the `Params` type:
```typescript
// Change:
type Params = { params: Promise<{ city: string }> };

// To:
type Params = { params: Promise<{ locale: string; city: string }> };
```

Add imports:
```typescript
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
```

In `generateMetadata`, add `locale` extraction and `buildAlternates`:
```typescript
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, city } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const c = getCityById(city);
  const t = await getTranslations("cityPage");
  const tc = await getTranslations("cities");
  if (!c) return { title: t("meta.notFoundTitle") };
  const soon = c.status === "soon";
  const cityName = tc(`names.${c.id}`);
  const country = tc(`countries.${countryKey(c.country)}`);
  const title = soon
    ? t("meta.titleSoon", { city: cityName })
    : t("meta.titleLive", { city: cityName });
  const description = soon
    ? t("meta.descriptionSoon", { city: cityName, country })
    : t("meta.descriptionLive", { city: cityName, country });
  const path = `/cities/${c.id}`;
  return {
    title,
    description,
    alternates: buildAlternates(loc, path),
    openGraph: {
      type: "website",
      siteName: "rentaro",
      url: path,
      locale: loc,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
```

Update the page component signature:
```typescript
export default async function CityPage({ params }: Params) {
  const { city } = await params;
  // rest is unchanged
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/[locale]/models/[slug]/page.tsx' 'src/app/[locale]/cities/[city]/page.tsx'
git commit -m "feat(seo): add hreflang alternates to dynamic pages (models/[slug] + cities/[city])"
```

---

## Task 15: Add hreflang to SEO landing pages + home page

**Files:** Modify `delivery-ebike-rental`, `ebike-rental-for-couriers`, `monthly-ebike-rental` pages; create `src/app/[locale]/page.tsx` `generateMetadata`

These pages have static `metadata` exports. Convert them to `generateMetadata` with locale param + `buildAlternates`.

- [ ] **Step 1: Update `src/app/[locale]/delivery-ebike-rental/page.tsx`**

Replace the static `metadata` export with `generateMetadata`:

```typescript
// Add these imports at the top:
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";

// Replace:
// export const metadata: Metadata = { title: "...", description: "..." };
// With:
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  return {
    title: "Delivery e-bike rental — rentaro",
    description:
      "Delivery-built e-bikes you can rent by the month. Strong motors, real payload and service support to keep your downtime low — suitable for city delivery work in Tallinn, Riga and Helsinki.",
    alternates: buildAlternates(loc, "/delivery-ebike-rental"),
  };
}
```

- [ ] **Step 2: Update `src/app/[locale]/ebike-rental-for-couriers/page.tsx`**

Remove the existing `export const metadata: Metadata = {...}` block (lines 13–17) and replace with:

```typescript
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  return {
    title: "E-bike rental for couriers — rentaro",
    description:
      "rentaro is e-bike rental built for delivery couriers. Start quickly on a monthly plan, ride with service support and keep your bike — your income tool — moving. Tallinn, Riga and Helsinki.",
    alternates: buildAlternates(loc, "/ebike-rental-for-couriers"),
  };
}
```

- [ ] **Step 3: Update `src/app/[locale]/monthly-ebike-rental/page.tsx`**

Remove the existing `export const metadata: Metadata = {...}` block (lines 12–16) and replace with:

```typescript
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  return {
    title: "Monthly e-bike rental — rentaro",
    description:
      "Rent an e-bike by the month instead of buying. One predictable monthly price covers the bike, service support, lock and charger — with no large upfront cost. Tallinn, Riga and Helsinki.",
    alternates: buildAlternates(loc, "/monthly-ebike-rental"),
  };
}
```

- [ ] **Step 4: Update `src/app/[locale]/page.tsx` (home page)**

The home page (`page.tsx`) currently has NO metadata export — the root layout provides the base. Add a `generateMetadata` at the top of the file to supply per-locale hreflang. Insert these lines before the `export default function Home()`:

```typescript
import type { Metadata } from "next";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  return {
    alternates: buildAlternates(loc, "/"),
    openGraph: { locale: loc },
  };
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/[locale]/delivery-ebike-rental/page.tsx' \
        'src/app/[locale]/ebike-rental-for-couriers/page.tsx' \
        'src/app/[locale]/monthly-ebike-rental/page.tsx' \
        'src/app/[locale]/page.tsx'
git commit -m "feat(seo): add hreflang alternates to SEO landing pages and home"
```

---

## Task 16: Update `src/app/sitemap.ts`

**Files:** Modify `src/app/sitemap.ts`

Emit per-locale URL alternates for every route so Google can associate language variants.

- [ ] **Step 1: Replace the file content**

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { bikeModels } from "@/data/bikeModels";
import { cities } from "@/data/cities";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/alternates";

const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app").replace(/\/$/, "");

function toSitemapEntry(href: string, now: Date): MetadataRoute.Sitemap[number] {
  const languages = Object.fromEntries(
    locales.map((loc: Locale) => [loc, `${base}${localePath(loc, href)}`])
  );
  return {
    url: `${base}${localePath(defaultLocale, href)}`,
    lastModified: now,
    alternates: { languages },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/models",
    "/pricing",
    "/how-it-works",
    "/accessories",
    "/faq",
    "/rules",
    "/privacy",
    "/terms",
    "/book",
    "/monthly-ebike-rental",
    "/delivery-ebike-rental",
    "/ebike-rental-for-couriers",
  ];
  const modelRoutes = bikeModels.map((m) => `/models/${m.slug}`);
  const cityRoutes = cities.map((c) => `/cities/${c.id}`);
  const now = new Date();

  return [...staticRoutes, ...modelRoutes, ...cityRoutes].map((path) =>
    toSitemapEntry(path, now)
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(seo): add per-locale alternates to sitemap"
```

---

## Task 17: Update `src/app/robots.ts`

**Files:** Modify `src/app/robots.ts`

Extend disallow rules to cover locale-prefixed variants of private paths.

- [ ] **Step 1: Replace the file content**

```typescript
// src/app/robots.ts
import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app").replace(/\/$/, "");

const privatePaths = ["/admin", "/my-rental", "/booking/success"];
const localePrefixes = ["et", "lv", "fi", "ru"];

const disallow: string[] = [
  ...privatePaths,
  ...localePrefixes.flatMap((loc) => privatePaths.map((p) => `/${loc}${p}`)),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/robots.ts
git commit -m "feat(seo): extend robots.txt disallow to locale-prefixed private paths"
```

---

## Task 18: Final verification

**Files:** No changes — verification only

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run 2>&1
```

Expected: all tests PASS with no failures.

- [ ] **Step 2: Run the linter**

```bash
npm run lint 2>&1
```

Expected: exit 0, no errors or warnings.

- [ ] **Step 3: Run the production build**

```bash
npm run build 2>&1
```

Expected: build succeeds. Look for:
- `✓ Generating static pages` — should include entries for all 5 locales
- No `Type error` lines
- No `Build failed` message

If the build fails with a type error, read the error message and fix the indicated file, then re-run.

- [ ] **Step 4: Verify hreflang tags appear in the built output**

```bash
# Start the production server
npm run start &
sleep 3
# Fetch the English home page and look for hreflang
curl -s http://localhost:3000/ | grep -i 'hreflang\|alternate'
# Fetch the Estonian home page
curl -s http://localhost:3000/et | grep -i 'hreflang\|alternate'
# Fetch a model page in Finnish
curl -s 'http://localhost:3000/fi/models' | grep -i 'hreflang\|alternate'
kill %1
```

Expected: each response contains lines like:
```html
<link rel="alternate" hreflang="et" href="https://..."/et"/>
<link rel="alternate" hreflang="en" href="https://..."/>
<link rel="alternate" hreflang="x-default" href="https://..."/>
```

- [ ] **Step 5: Verify English URLs are unprefixed (as-needed)**

```bash
npm run start &
sleep 3
# English should NOT redirect to /en
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/pricing
# Estonian should be at /et/pricing
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/et/pricing
kill %1
```

Expected:
- `/pricing` → HTTP 200 (no redirect)
- `/et/pricing` → HTTP 200

- [ ] **Step 6: Verify language switcher works**

```bash
npm run start &
sleep 3
# Hitting /et should get the Estonian layout (lang attribute)
curl -s http://localhost:3000/et | grep '<html'
kill %1
```

Expected: `<html lang="et" ...>`

- [ ] **Step 7: Commit final state and push**

```bash
git add -A
git status
# If everything is clean, push
git push origin main
```

Expected: `git status` shows `nothing to commit, working tree clean` (all changes were committed in earlier steps). Then push succeeds.

---

## Quick reference: `localePath` behavior

| locale | href | result |
|---|---|---|
| `en` | `/` | `/` |
| `et` | `/` | `/et` |
| `en` | `/pricing` | `/pricing` |
| `et` | `/pricing` | `/et/pricing` |
| `lv` | `/models/cargo-1` | `/lv/models/cargo-1` |

---

## Troubleshooting

**Build error: "Could not find a declaration file for module `@/i18n/navigation`"**
→ Ensure `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }`.

**Build error in `[locale]/layout.tsx`: "setRequestLocale is not exported from next-intl/server"**
→ Check next-intl version: `cat node_modules/next-intl/package.json | grep '"version"'`. If < 3.7, `setRequestLocale` doesn't exist — use `unstable_setRequestLocale` instead. If 4.x, it may have moved: `grep -r "setRequestLocale" node_modules/next-intl/dist/types/`.

**Build error: `Type error: Property 'locale' does not exist on type '{ slug: string }'`**
→ The `Params` type in `[slug]/page.tsx` wasn't updated to include `locale`. Re-read Task 14 Step 1.

**`npm run lint` error: `@/i18n/navigation` import in a server component uses `useRouter`**
→ Check that any file using `useRouter`/`usePathname` has `"use client"` at the top. These hooks are client-only.

**Language switcher changes locale but URL doesn't update**
→ `router.replace(pathname, { locale })` requires `pathname` from `usePathname()` of `@/i18n/navigation`, not from `next/navigation`. Verify the import in `LocaleSwitcher.tsx`.
