import { type NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/services/api";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Invalid portal link" }, { status: 401, headers: PRIVATE_HEADERS });
  }
  if (!API_BASE) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: PRIVATE_HEADERS });
  }

  const { id } = await params;
  try {
    const upstream = await fetch(
      `${API_BASE}/api/portal/invoices/${encodeURIComponent(id)}/pdf?token=${encodeURIComponent(token)}`,
      {
        headers: { Accept: "application/pdf" },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!upstream.ok || !upstream.body) {
      const status = upstream.status === 401 || upstream.status === 404 ? upstream.status : 502;
      return NextResponse.json({ error: "Invoice not found" }, { status, headers: PRIVATE_HEADERS });
    }

    const disposition = upstream.headers.get("content-disposition") ?? "attachment; filename=invoice.pdf";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invoice unavailable" }, { status: 502, headers: PRIVATE_HEADERS });
  }
}

