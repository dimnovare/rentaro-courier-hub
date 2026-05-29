import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { InteractionProvider } from "@/components/providers/Interactions";
import { Background } from "@/components/layout/Background";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@/components/analytics/Analytics";
import { JsonLd, buildOrganizationSchema } from "@/components/seo/JsonLd";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://rentaro-courier-hub.vercel.app"
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
  icons: { icon: "/assets/logo-r.png" },
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Analytics />
        <JsonLd data={buildOrganizationSchema()} />
        <InteractionProvider>
          <Background />
          <Nav />
          {children}
          <Footer />
        </InteractionProvider>
      </body>
    </html>
  );
}
