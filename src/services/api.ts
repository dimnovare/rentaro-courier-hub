/**
 * Tiny fetch helper. With no NEXT_PUBLIC_API_BASE_URL set, services return their
 * local typed data (mock). Set the env var (Phase 5 / production) and the same
 * services transparently fetch the .NET API instead.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

/**
 * Abort a public-API fetch after this long (mirrors PORTAL_TIMEOUT_MS in
 * portalService). Without it a stalled API (e.g. a Railway cold start) leaves
 * the request pending indefinitely and hangs SSR of every page that awaits
 * these services (/, /models, /book). On timeout the fetch rejects and the
 * caller falls back to its local data.
 */
const API_TIMEOUT_MS = 12_000;

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (!API_BASE) return fallback;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      // Revalidate often so live availability (derived from real bike-unit status)
      // reflects fleet changes — a reserve/return — within ~20-40s, matching the
      // API's 20s output-cache window.
      next: { revalidate: 20 },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[rentaro] API GET ${path} failed; falling back to local data.`, err);
    return fallback;
  }
}

/**
 * Fetch data that must never fall back to a potentially stale local value.
 * This is used for public price claims: when the live API is unavailable, the
 * caller can omit the claim instead of advertising an outdated amount.
 */
export async function apiGetOptional<T>(path: string): Promise<T | undefined> {
  if (!API_BASE) return undefined;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 20 },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(
      `[rentaro] API GET ${path} failed; omitting data that must stay current.`,
      err,
    );
    return undefined;
  }
}

/**
 * Like {@link apiGet}, but for single-resource endpoints where a live-API 404
 * is a definitive "this resource does not exist" (e.g. an admin-deleted or
 * deactivated model) — it resolves to `undefined` so the caller can render a
 * real not-found page instead of resurrecting stale fallback data forever.
 *
 * The `fallback` still applies when the API is unreachable or errors (network
 * failure, timeout, 5xx): an outage must degrade to local data, not 404 every
 * detail page.
 */
export async function apiGetOrNotFound<T>(
  path: string,
  fallback: T | undefined,
): Promise<T | undefined> {
  if (!API_BASE) return fallback;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 20 },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[rentaro] API GET ${path} failed; falling back to local data.`, err);
    return fallback;
  }
}
