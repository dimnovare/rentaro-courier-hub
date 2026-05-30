import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { InteractionProvider } from "@/components/providers/Interactions";
import { Background } from "@/components/layout/Background";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@/components/analytics/Analytics";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { JsonLd, buildOrganizationSchema } from "@/components/seo/JsonLd";

// Use `|| ` (not `??`) so an empty/blank env var falls back to the default —
// `new URL("")` throws (ERR_INVALID_URL) and breaks the build otherwise.
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
    // Static, multi-size assets generated from the lime "R" logo mark (under
    // /public). The root favicon.ico (src/app/favicon.ico) is auto-served by
    // Next at /favicon.ico; these explicit links cover modern PNG favicons,
    // the manifest icons and the iOS home-screen touch icon.
    icon: [
      { url: "/favicon.ico", sizes: "any", rel: "icon" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "rentaro",
    title,
    description,
    url: "/",
    locale: "en",
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
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Analytics />
        <JsonLd data={buildOrganizationSchema()} />
        <NextIntlClientProvider messages={messages}>
          <InteractionProvider>
            <Background />
            <Nav />
            {children}
            <Footer />
            <CookieConsent />
          </InteractionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
