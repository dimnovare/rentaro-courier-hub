"use client";

/**
 * Slim top bar for the admin console: a mobile menu toggle, the current section
 * title (derived from the route), a subtle "live" status chip, and a Refresh
 * affordance that reloads whichever section is mounted (via the refresh bus).
 */
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { titleForPath } from "./AdminSidebar";
import { triggerAdminRefresh } from "./useAdminRefresh";

function MenuIcon(): ReactElement {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7 H20" /><path d="M4 12 H20" /><path d="M4 17 H20" />
    </svg>
  );
}

function RefreshIcon(): ReactElement {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11 a8 8 0 1 0 -.7 4.5" /><path d="M20 5 V11 H14" />
    </svg>
  );
}

export function AdminTopbar({ onToggleNav }: { onToggleNav: () => void }) {
  const pathname = usePathname() ?? "/admin";
  const title = titleForPath(pathname);

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-topbar-menu"
          onClick={onToggleNav}
          aria-label="Toggle navigation"
        >
          <MenuIcon />
        </button>
        <h1 className="admin-topbar-title">{title}</h1>
      </div>

      <div className="admin-topbar-right">
        <span className="admin-live mono" aria-label="Live data">
          <span className="admin-live-dot" aria-hidden />
          live
        </span>
        <button
          type="button"
          className="admin-topbar-refresh"
          onClick={() => triggerAdminRefresh()}
          aria-label="Refresh"
        >
          <RefreshIcon />
          <span className="admin-topbar-refresh-label">Refresh</span>
        </button>
      </div>
    </header>
  );
}
