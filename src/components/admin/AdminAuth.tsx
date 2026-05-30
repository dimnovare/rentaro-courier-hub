"use client";

/**
 * Admin authentication context — the single source of truth for the admin
 * session across the whole `/admin/*` shell.
 *
 * The JWT is NOT stored in the browser. It lives in a same-origin, httpOnly
 * cookie set by the Next BFF (`/api/admin/login`), so client JavaScript can
 * never read it and XSS cannot exfiltrate it. The admin services call the
 * same-origin `/api/admin/*` proxy, which attaches the token server-side.
 *
 * This context only tracks whether a session exists (it cannot see the token):
 *   authenticated — true once a session cookie is known to be present.
 *   ready         — false until the initial session check completes (prevents a
 *                   flash of the sign-in screen for an already-signed-in admin).
 *   signIn        — exchange username + password for a session (sets the cookie
 *                   server-side via adminLogin), then flip the shell to the console.
 *   signOut       — clear the session cookie (via adminLogout) and drop to sign-in.
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
import { adminLogin, adminLogout } from "@/services/adminService";

interface AdminAuthValue {
  /** True when a session cookie is present (the admin is signed in). */
  authenticated: boolean;
  /** True once the initial session check has run. */
  ready: boolean;
  /** Exchange credentials for a session cookie. Throws on failure. */
  signIn: (username: string, password: string) => Promise<void>;
  /** Drop the session (clears the cookie server-side + local state). */
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  // Ask the BFF whether a session cookie exists. Until this resolves `ready`
  // is false and the shell shows a minimal loader rather than guessing. An
  // expired-but-present cookie still reads as authenticated here; the first
  // real data call's 401 then bounces to sign-in via signOut().
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => null)) as { authenticated?: boolean } | null;
        if (active) setAuthenticated(Boolean(data?.authenticated));
      } catch {
        if (active) setAuthenticated(false);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    // adminLogin throws AdminApiError / AdminConfigError on failure; let the
    // caller (the sign-in form) translate it into a message.
    await adminLogin(username.trim(), password);
    setAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await adminLogout();
    setAuthenticated(false);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ authenticated, ready, signIn, signOut }),
    [authenticated, ready, signIn, signOut],
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
