/**
 * POST /api/admin/login — same-origin sign-in for the admin console.
 *
 * Forwards the posted credentials to the .NET API's `POST /api/admin/login`
 * server-side. On success it stores the returned JWT in an httpOnly, Secure
 * (prod), SameSite=Lax cookie — so the token never reaches client JavaScript
 * and is therefore not exfiltratable via XSS. The browser only learns
 * `{ ok: true }`. Failures (invalid credentials, rate limit) are passed through
 * with their status so the sign-in form can show a useful message.
 */
import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminApiBase,
  isSameOrigin,
  sessionCookieOptions,
  sessionMaxAge,
} from "@/server/adminApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const base = adminApiBase();
  if (!base) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_API_BASE_URL to use admin", notConfigured: true },
      { status: 503 },
    );
  }

  // Reject cross-site sign-in attempts (login CSRF).
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  let creds: { username?: unknown; password?: unknown };
  try {
    creds = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: typeof creds.username === "string" ? creds.username : "",
        password: typeof creds.password === "string" ? creds.password : "",
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the admin API. Check your connection." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    let message =
      upstream.status === 401
        ? "Invalid username or password"
        : `Sign-in failed (${upstream.status})`;
    try {
      const data = (await upstream.json()) as { error?: string };
      if (upstream.status !== 401 && data?.error) message = data.error;
    } catch {
      /* non-JSON body — keep the default message */
    }
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  let data: { token?: string; expiresAt?: string };
  try {
    data = (await upstream.json()) as { token?: string; expiresAt?: string };
  } catch {
    return NextResponse.json({ error: "Unexpected sign-in response" }, { status: 502 });
  }
  if (!data.token) {
    return NextResponse.json({ error: "Unexpected sign-in response" }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: data.token,
    ...sessionCookieOptions(),
    maxAge: sessionMaxAge(data.expiresAt),
  });
  return res;
}
