"use client";

/**
 * Slim top bar for the admin console: a mobile menu toggle, the current section
 * title (derived from the route — a plain div; the page's PageHeader owns the
 * h1), an "Updated HH:MM" freshness chip, a Ctrl K hint for the command
 * palette, and a Refresh affordance that reloads whichever section is mounted
 * (via the refresh bus). The Updated time is stamped on mount and on every
 * refresh-bus event, so it tracks both the Refresh button and page reloads.
 */
import { usePathname } from "@/i18n/navigation";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { titleForPath } from "./AdminSidebar";
import { triggerAdminRefresh, useAdminRefresh } from "./useAdminRefresh";

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

export function AdminTopbar({
  onToggleNav,
  onOpenPalette,
}: {
  onToggleNav: () => void;
  /** Opens the ⌘K command palette (the Ctrl K chip is hidden when absent). */
  onOpenPalette?: () => void;
}) {
  const pathname = usePathname() ?? "/admin";
  const title = titleForPath(pathname);

  // "Updated HH:MM" — when the mounted section's data was last (re)loaded.
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const stamp = useCallback(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setUpdatedAt(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, []);
  useEffect(() => stamp(), [stamp]); // initial load
  useAdminRefresh(stamp); // every refresh-bus event (incl. our own button)

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
        <div className="admin-topbar-title">{title}</div>
      </div>

      <div className="admin-topbar-right">
        <span className="admin-updated mono" title="When this section's data was last loaded">
          <span className="admin-updated-dot" aria-hidden />
          Updated {updatedAt ?? "—"}
        </span>
        {onOpenPalette && (
          <button
            type="button"
            className="admin-topbar-kbd mono"
            onClick={onOpenPalette}
            aria-label="Open command palette"
            title="Command palette (Ctrl K)"
          >
            Ctrl K
          </button>
        )}
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
