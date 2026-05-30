/**
 * GET /api/admin/session — lightweight signed-in check for the admin shell.
 *
 * Reports whether the httpOnly session cookie is present. This deliberately
 * does NOT call the backend: it is fast, has no backend dependency (a backend
 * hiccup can't lock the operator out of the shell), and an expired-but-present
 * cookie is caught the moment any real data call returns 401 — which the pages
 * already translate into a sign-out. Mirrors the previous localStorage flow.
 */
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/server/adminApi";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const authenticated = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  return NextResponse.json({ authenticated }, { headers: { "Cache-Control": "no-store" } });
}
