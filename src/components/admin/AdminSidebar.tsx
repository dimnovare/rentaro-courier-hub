"use client";

/**
 * Persistent left sidebar for the admin console. Brand lockup at the top,
 * grouped navigation with inline-SVG icons in the middle, sign-out pinned at
 * the bottom. The active item is derived from the current pathname: Dashboard
 * matches `/admin` exactly, every other item matches its route prefix.
 *
 * On narrow viewports the sidebar becomes an off-canvas drawer toggled from the
 * topbar; `open` / `onClose` drive that. A backdrop (rendered by the shell)
 * closes it on outside click.
 */
import { Link, usePathname } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { LogoMark } from "@/components/ui/LogoMark";
import { useAdminAuth } from "./AdminAuth";

/* ── Inline icons (line style, 1.6 stroke, currentColor) ───────────────── */

type IcoProps = { s?: number };
const I = {
  dashboard: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  bookings: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 3 V6" /><path d="M16 3 V6" /><path d="M8 11 H16" /><path d="M8 15 H13" />
    </svg>
  ),
  rentals: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7 h11 l3 4 h2 v4 h-2" /><circle cx="7" cy="17" r="2.2" /><circle cx="17" cy="17" r="2.2" /><path d="M9.2 17 H14.8" /><path d="M4 7 v8 h0.8" />
    </svg>
  ),
  calendar: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5 H20.5" /><path d="M8 3 V6" /><path d="M16 3 V6" /><path d="M7.5 13 H9" /><path d="M11.5 13 H13" /><path d="M15.5 13 H17" />
    </svg>
  ),
  maintenance: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 5.5 a3.6 3.6 0 0 0-4.9 4.6 L4 15.7 a1.8 1.8 0 0 0 2.5 2.5 l5.6-5.6 a3.6 3.6 0 0 0 4.6-4.9 l-2.3 2.3 -2.1-.5 -.5-2.1 z" />
    </svg>
  ),
  models: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" /><path d="M4 7.5 L12 12 L20 7.5" /><path d="M12 12 V21" />
    </svg>
  ),
  support: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5 a8.5 8.5 0 1 0-3.6 6.95 L21 20 l-1-3.2" /><path d="M8.5 10.5 H15.5" /><path d="M8.5 14 H13" />
    </svg>
  ),
  content: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9 H16" /><path d="M8 13 H16" /><path d="M8 17 H12" />
    </svg>
  ),
  fleet: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M9 17 H13 L9.5 9 H7.5" /><path d="M13 17 L16.5 10 H13.5" /><path d="M11 9 H8" /><circle cx="12" cy="6.5" r="1.3" />
    </svg>
  ),
  contracts: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3 H14 L19 8 V21 H7 Z" /><path d="M14 3 V8 H19" /><path d="M10 13 H16" /><path d="M10 17 H14" />
    </svg>
  ),
  settings: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5 v2.2 M12 19.3 v2.2 M21.5 12 h-2.2 M4.7 12 H2.5 M18.7 5.3 l-1.6 1.6 M6.9 17.1 l-1.6 1.6 M18.7 18.7 l-1.6-1.6 M6.9 6.9 L5.3 5.3" />
    </svg>
  ),
  pricelist: ({ s = 17 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5 h9 l7 7 -8 8 -7-7 Z" /><circle cx="9" cy="10" r="1.4" /><path d="M11 13 h5" /><path d="M10 16 h4" />
    </svg>
  ),
  signout: ({ s = 16 }: IcoProps): ReactElement => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8 V6 a2 2 0 0 0-2-2 H6 a2 2 0 0 0-2 2 v12 a2 2 0 0 0 2 2 h6 a2 2 0 0 0 2-2 v-2" />
      <path d="M10 12 H21" /><path d="M18 9 L21 12 L18 15" />
    </svg>
  ),
} as const;

type IconName = keyof typeof I;

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** When true, only an exact pathname match is "active" (used for Dashboard). */
  exact?: boolean;
  /** When true, render a muted "soon" badge — the page is a placeholder scaffold. */
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Navigation model — grouped exactly per the console spec. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: "dashboard", exact: true }],
  },
  {
    label: "Operations",
    items: [
      { label: "Bookings", href: "/admin/bookings", icon: "bookings" },
      { label: "Rentals", href: "/admin/rentals", icon: "rentals" },
      { label: "Calendar", href: "/admin/calendar", icon: "calendar" },
      { label: "Maintenance", href: "/admin/maintenance", icon: "maintenance" },
      { label: "Support", href: "/admin/support", icon: "support" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Models", href: "/admin/models", icon: "models" },
      { label: "Content", href: "/admin/content", icon: "content" },
    ],
  },
  {
    label: "Fleet",
    items: [{ label: "Fleet", href: "/admin/fleet", icon: "fleet" }],
  },
  {
    label: "Contracts",
    items: [{ label: "Contracts", href: "/admin/contracts", icon: "contracts" }],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: "settings" },
      { label: "Pricelist", href: "/admin/pricelist", icon: "pricelist", comingSoon: true },
    ],
  },
];

/** Is `href` the active route for the current `pathname`? */
function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminSidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname() ?? "/admin";
  const { signOut } = useAdminAuth();

  return (
    <aside className={`admin-sidebar${open ? " is-open" : ""}`} aria-label="Admin navigation">
      <Link href="/admin" className="admin-sidebar-brand" onClick={onNavigate}>
        <span className="admin-brand-logo">
          <LogoMark size={26} />
        </span>
        <span className="admin-brand-word">
          rentaro <span className="admin-brand-dot">·</span> <span className="admin-brand-tag">admin</span>
        </span>
      </Link>

      <nav className="admin-nav">
        {NAV_GROUPS.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <p className="admin-nav-grouplabel mono">{group.label}</p>
            {group.items.map((item) => {
              const Icon = I[item.icon];
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <span className="admin-nav-indicator" aria-hidden />
                  <span className="admin-nav-icon" aria-hidden>
                    <Icon />
                  </span>
                  <span className="admin-nav-label">{item.label}</span>
                  {item.comingSoon && (
                    <span
                      className="mono"
                      aria-label="coming soon"
                      style={{
                        marginLeft: "auto",
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text-dim)",
                        padding: "2px 7px",
                        borderRadius: "var(--r-full)",
                        border: "1px solid var(--border-strong)",
                        lineHeight: 1.4,
                      }}
                    >
                      soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <button type="button" className="admin-nav-item admin-signout" onClick={signOut}>
        <span className="admin-nav-indicator" aria-hidden />
        <span className="admin-nav-icon" aria-hidden>
          <I.signout />
        </span>
        <span className="admin-nav-label">Sign out</span>
      </button>
    </aside>
  );
}

/** Resolve a human page title for a pathname (used by the topbar). */
export function titleForPath(pathname: string): string {
  // Longest-prefix match so e.g. /admin/models/x still resolves to "Models".
  let best: { title: string; len: number } | null = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const match = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      if (match && (!best || item.href.length > best.len)) {
        best = { title: item.label, len: item.href.length };
      }
    }
  }
  return best?.title ?? "Admin";
}
