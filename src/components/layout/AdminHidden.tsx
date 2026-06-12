"use client";

import { usePathname } from "@/i18n/navigation";

/**
 * Renders the marketing site chrome (top nav, footer, cookie banner) on public
 * pages only. The admin console at `/admin/*` ships its own full chrome
 * (sidebar + topbar + mobile drawer), so the public header/footer must not
 * appear there — on mobile they doubled the navigation, stole vertical space
 * with the "Reserve" CTA, and fought the admin drawer for z-index.
 *
 * `usePathname` from the i18n navigation helper is already locale-stripped, so
 * the admin routes are matched as plain `/admin…`.
 */
export function AdminHidden({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}
