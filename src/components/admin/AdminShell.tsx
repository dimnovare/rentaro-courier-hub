"use client";

/**
 * The admin console shell. Wraps every `/admin/*` page once:
 *   - while the auth context is checking the session → a minimal loader
 *   - when not signed in                             → the full-screen sign-in
 *   - when signed in                                 → sidebar + topbar + content
 *
 * Section pages no longer carry their own sign-in gate or page header — this
 * shell provides all of the chrome, and pages read auth state from useAdminAuth.
 */
import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useAdminAuth } from "./AdminAuth";
import { AdminSignIn } from "./AdminSignIn";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { CommandPalette } from "./CommandPalette";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { authenticated, ready } = useAdminAuth();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Close the command palette on navigation (router.push lands on a new path).
  useEffect(() => {
    setPaletteOpen(false);
  }, [pathname]);

  // Global ⌘K / Ctrl+K toggles the command palette. Only active once signed in.
  useEffect(() => {
    if (!authenticated) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authenticated]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  if (!ready) {
    return (
      <div className="admin-boot">
        <span className="admin-boot-dot" aria-hidden />
        <span className="mono admin-boot-text">Loading console…</span>
      </div>
    );
  }

  if (!authenticated) {
    return <AdminSignIn />;
  }

  return (
    <div className={`admin-app${navOpen ? " nav-open" : ""}`}>
      <AdminSidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && (
        <button
          type="button"
          className="admin-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <div className="admin-main">
        <AdminTopbar onToggleNav={() => setNavOpen((o) => !o)} />
        <main className="admin-content">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
