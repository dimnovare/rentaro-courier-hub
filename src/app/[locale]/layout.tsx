// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { defaultOgImages } from "@/lib/og";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { InteractionProvider } from "@/components/providers/Interactions";
import { Background } from "@/components/layout/Background";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { AdminHidden } from "@/components/layout/AdminHidden";
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
    openGraph: { locale: loc, images: defaultOgImages },
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
        <AdminHidden>
          <Nav />
        </AdminHidden>
        {children}
        <AdminHidden>
          <Footer />
        </AdminHidden>
        <AdminHidden>
          <CookieConsent />
        </AdminHidden>
      </InteractionProvider>
    </NextIntlClientProvider>
  );
}
