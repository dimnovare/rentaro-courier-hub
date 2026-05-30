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
