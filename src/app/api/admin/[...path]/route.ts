/**
 * Catch-all admin API proxy: /api/admin/<anything> → ${API_BASE}/api/admin/<anything>.
 *
 * This is the heart of the BFF. The browser calls these routes same-origin with
 * no Authorization header; the proxy reads the JWT from the httpOnly session
 * cookie and attaches it as `Authorization: Bearer <jwt>` when forwarding to the
 * .NET API server-side. The token is therefore never present in client JS.
 *
 * It handles every admin verb and content type the services use: JSON, the
 * multipart uploads (model image, contract template) and the binary PDF
 * download — bodies are buffered and forwarded, responses are streamed back.
 *
 * Security:
 *   - GET requires a session cookie; absent → 401.
 *   - Mutations (POST/PUT/PATCH/DELETE) additionally require a same-origin
 *     Origin/Referer (CSRF defence on top of the SameSite=Lax cookie).
 *   - The inbound Cookie and Host headers are NOT forwarded, so the session
 *     cookie never leaks to the upstream API.
 *
 * The explicit sibling routes (login / logout / session) take precedence over
 * this catch-all for those exact paths.
 */
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminApiBase, isSameOrigin } from "@/server/adminApi";

export const dynamic = "force-dynamic";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function handle(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const base = adminApiBase();
  if (!base) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_API_BASE_URL to use admin", notConfigured: true },
      { status: 503 },
    );
  }

  // CSRF: block cross-origin mutations before doing anything else.
  if (MUTATING.has(request.method) && !isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  // Auth: the JWT comes from the httpOnly cookie, not from the client.
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { path } = await ctx.params;
  const segments = (path ?? []).map((s) => encodeURIComponent(s)).join("/");
  const target = `${base}/api/admin/${segments}${request.nextUrl.search}`;

  // Forward only what's needed; never the inbound Cookie/Host.
  const headers = new Headers();
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("authorization", `Bearer ${token}`);

  // Buffer the body for methods that carry one (covers JSON, multipart and
  // binary uploads uniformly without needing a streaming `duplex` request).
  let body: ArrayBuffer | undefined;
  if (MUTATING.has(request.method)) {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 0) body = buf;
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the admin API. Check your connection." },
      { status: 502 },
    );
  }

  // Stream the upstream response back, preserving the headers a client needs
  // (content type, attachment filename for PDF downloads, length, caching).
  const resHeaders = new Headers();
  for (const h of ["content-type", "content-disposition", "content-length", "cache-control"]) {
    const v = upstream.headers.get(h);
    if (v) resHeaders.set(h, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
