/**
 * Single euro formatter. Replaces the previously-divergent per-page formatters
 * so every price reads consistently.
 *
 * - default: two decimals, e.g. `€5.90` (customer-facing prices).
 * - `{ cents: false }`: whole euros with thousands grouping, e.g. `€1,177`
 *   (admin metrics / large sums).
 */
export function formatEur(n: number | null | undefined, opts?: { cents?: boolean }): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const cents = opts?.cents ?? true;
  return cents
    ? `€${n.toFixed(2)}`
    : `€${Math.round(n).toLocaleString("en-US")}`;
}
