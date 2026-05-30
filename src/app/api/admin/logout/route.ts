/**
 * POST /api/admin/logout — clears the admin session cookie.
 *
 * Overwrites the httpOnly session cookie with an immediately-expiring one. No
 * upstream call is needed (the JWT is stateless); the browser simply loses its
 * credential. Logout CSRF is harmless (worst case an attacker signs you out),
 * so no Origin check is enforced here.
 */
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, sessionCookieOptions } from "@/server/adminApi";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return res;
}
