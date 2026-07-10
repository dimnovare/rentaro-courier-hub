// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { defaultOgImages, defaultTwitterImages } from "@/lib/og";
import { getSiteUrl, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { Analytics } from "@/components/analytics/Analytics";
import { JsonLd, buildOrganizationSchema } from "@/components/seo/JsonLd";

const siteUrl = getSiteUrl();

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

const title = SITE_TITLE;
const description = SITE_DESCRIPTION;

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
    images: defaultOgImages,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: defaultTwitterImages,
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
