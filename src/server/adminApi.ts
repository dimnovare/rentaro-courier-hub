/**
 * Server-only helpers for the admin BFF (Backend-for-Frontend).
 *
 * The admin JWT lives in a same-origin, httpOnly cookie set by the Next route
 * handlers under `src/app/api/admin/*`. Browser JS can never read it; the proxy
 * route attaches it as `Authorization: Bearer <jwt>` when forwarding admin
 * requests to the .NET API server-side. This module is imported only by those
 * route handlers, so it never reaches the client bundle.
 */
import type { NextRequest } from "next/server";

/** httpOnly cookie holding the admin JWT. Not the old localStorage key. */
export const ADMIN_SESSION_COOKIE = "rentaro_admin_session";

/**
 * Upstream .NET API origin for admin proxying. Prefers a server-only
 * `ADMIN_API_BASE_URL`, falling back to the same `NEXT_PUBLIC_API_BASE_URL` the
 * public site already uses — so existing deploys (Vercel) and local dev keep
 * working with zero new configuration. Trailing slash stripped.
 */
export function adminApiBase(): string {
  const raw = process.env.ADMIN_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return raw.replace(/\/$/, "");
}

/**
 * CSRF defence for mutating requests. The session cookie is `SameSite=Lax`, so
 * browsers already withhold it on cross-site POST/PUT/PATCH/DELETE; this is the
 * belt-and-suspenders check. We compare the request's `Origin` (or `Referer`
 * fallback) host against the host the request actually arrived on
 * (`x-forwarded-host` behind Vercel's proxy, else `Host`). Same-origin fetches
 * from the admin SPA always send a matching `Origin`, so this passes in both
 * local dev (localhost:3000) and production without hardcoding a domain.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  const candidate = request.headers.get("origin") ?? request.headers.get("referer");
  if (!candidate) return false; // a mutating request with no Origin/Referer is rejected

  try {
    return new URL(candidate).host === host;
  } catch {
    return false;
  }
}

/**
 * Cookie attributes shared by the login (set) and logout (clear) routes.
 * `Secure` is omitted in development so the cookie works over plain
 * http://localhost; production is always HTTPS (Vercel) so it is always set.
 */
export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

/**
 * Max-Age (seconds) for the session cookie, derived from the login response's
 * `expiresAt` so the cookie and the JWT expire together. Falls back to the
 * backend's 8h token lifetime when the timestamp is missing or unparseable.
 */
export function sessionMaxAge(expiresAt?: string): number {
  const fallback = 8 * 60 * 60; // matches Rentaro.Api AdminAuth TokenLifetime
  if (!expiresAt) return fallback;
  const expMs = Date.parse(expiresAt);
  if (Number.isNaN(expMs)) return fallback;
  const secs = Math.floor((expMs - Date.now()) / 1000);
  // Clamp to (0, fallback + small skew] so a bad/futuristic timestamp can't
  // pin a session open indefinitely.
  return secs > 0 ? Math.min(secs, fallback + 60) : fallback;
}
