/**
 * Single euro formatter. Replaces the previously-divergent per-page formatters
 * so every price reads consistently.
 *
 * - default: two decimals, e.g. `€5.90` (customer-facing prices).
 * - `{ cents: false }`: whole euros with thousands grouping, e.g. `€1,177`
 *   (admin metrics / large sums).
 * - `{ currency: "EUR" }`: currency-code SUFFIX instead of the € prefix,
 *   e.g. `147.00 EUR` (invoice-style readouts). Default behaviour unchanged.
 */
export function formatEur(
  n: number | null | undefined,
  opts?: { cents?: boolean; currency?: string },
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const cents = opts?.cents ?? true;
  const amount = cents ? n.toFixed(2) : Math.round(n).toLocaleString("en-US");
  return opts?.currency ? `${amount} ${opts.currency}` : `€${amount}`;
}
