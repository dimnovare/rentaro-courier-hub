"use client";

/**
 * Full-screen admin sign-in. Rendered by the shell whenever there is no token.
 * Sits on the global moving-grid background (provided by the root layout) for
 * brand continuity, and reuses the shared `.card` / `.field` / `.btn` classes.
 *
 * It owns only the form fields + submit state; the actual credential exchange
 * is delegated to the auth context's `signIn`, so this component never touches
 * localStorage or the API directly.
 */
import { useState } from "react";
import { LogoMark } from "@/components/ui/LogoMark";
import { AdminApiError, AdminConfigError } from "@/services/adminService";
import { useAdminAuth } from "./AdminAuth";

export function AdminSignIn() {
  const { signIn } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username, password);
      // On success the shell swaps to the console; clearing local state is moot.
      setPassword("");
    } catch (err) {
      if (err instanceof AdminConfigError || err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong signing in.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-signin">
      <div className="admin-signin-card card">
        <div className="admin-signin-brand">
          <span className="admin-brand-logo">
            <LogoMark size={30} />
          </span>
          <span className="admin-brand-word">
            rentaro <span className="admin-brand-dot">·</span> <span className="admin-brand-tag">admin</span>
          </span>
        </div>

        <h1 className="admin-signin-title">Sign in</h1>
        <p className="admin-signin-sub">
          Operator console for bookings, fleet, rentals and the catalogue. Your session lives only in
          this browser.
        </p>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="mono admin-signin-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mono admin-signin-foot">rentaro · internal · authorised operators only</p>
    </div>
  );
}
