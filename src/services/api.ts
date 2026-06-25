/**
 * Tiny fetch helper. With no NEXT_PUBLIC_API_BASE_URL set, services return their
 * local typed data (mock). Set the env var (Phase 5 / production) and the same
 * services transparently fetch the .NET API instead.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (!API_BASE) return fallback;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      // Revalidate often so live availability (derived from real bike-unit status)
      // reflects fleet changes — a reserve/return — within ~20-40s, matching the
      // API's 20s output-cache window.
      next: { revalidate: 20 },
    });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[rentaro] API GET ${path} failed; falling back to local data.`, err);
    return fallback;
  }
}
