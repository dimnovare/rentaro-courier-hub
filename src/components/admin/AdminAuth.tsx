"use client";

/**
 * Admin authentication context — the single source of truth for the admin
 * session across the whole `/admin/*` shell.
 *
 * The JWT is persisted in `localStorage["rentaro_admin_jwt"]` — deliberately the
 * SAME key the self-contained admin services (adminFleetService,
 * adminBookingService, adminModelService, adminCatalogService, adminRental/
 * Maintenance/Contract services, adminMetricsService …) already read on every
 * request. That means those services keep working untouched: the shell just
 * owns sign-in / sign-out / restore, and the services pick the token up from
 * storage exactly as before.
 *
 * Surface:
 *   token   — the current JWT, or null when signed out.
 *   ready   — false until we've checked localStorage on mount (prevents a
 *             flash of the sign-in screen for an already-signed-in admin and
 *             keeps SSR/CSR markup consistent).
 *   signIn  — exchange username + password for a JWT (via adminLogin), persist
 *             it and flip the shell to the console.
 *   signOut — clear the token everywhere; the shell falls back to sign-in.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminLogin } from "@/services/adminService";

/** Shared storage key — must match what the admin services read. */
const TOKEN_KEY = "rentaro_admin_jwt";

interface AdminAuthValue {
  /** Current JWT, or null when not signed in. */
  token: string | null;
  /** True once the initial localStorage check has run. */
  ready: boolean;
  /** Exchange credentials for a JWT and persist it. Throws on failure. */
  signIn: (username: string, password: string) => Promise<void>;
  /** Drop the session (clears storage + state). */
  signOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a saved JWT once on mount (client-only). Until this runs `ready`
  // is false and the shell shows a minimal loader rather than guessing.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {
      /* localStorage unavailable — treat as signed out. */
    }
    setReady(true);
  }, []);

  // Keep the session in sync across tabs: if another tab signs in or out, the
  // `storage` event fires here and we mirror it.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== TOKEN_KEY) return;
      setToken(e.newValue && e.newValue.length > 0 ? e.newValue : null);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    // adminLogin throws AdminApiError / AdminConfigError on failure; let the
    // caller (the sign-in form) translate it into a message.
    const jwt = await adminLogin(username.trim(), password);
    try {
      localStorage.setItem(TOKEN_KEY, jwt);
    } catch {
      /* persistence failed — still sign in for this session. */
    }
    setToken(jwt);
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ token, ready, signIn, signOut }),
    [token, ready, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

/** Read the admin auth context. Throws if used outside the provider. */
export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within <AdminAuthProvider>.");
  }
  return ctx;
}
