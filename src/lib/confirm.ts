/**
 * Single confirm helper for admin mutations, so every destructive/irreversible
 * action asks with the same house wording instead of N hand-rolled
 * `window.confirm` strings.
 *
 * - `confirmAction("Delete this expense?", { finality: "irreversible" })`
 *   → "Delete this expense? This cannot be undone."
 * - `confirmAction("Mark this invoice as PAID?", { finality: "final" })`
 *   → "Mark this invoice as PAID? This is final."
 * - No `finality` → the message is shown as-is (plain step confirmations).
 *
 * Guards `typeof window` so accidental server-side calls return false instead
 * of throwing.
 */
export function confirmAction(
  message: string,
  opts?: { finality?: "irreversible" | "final" },
): boolean {
  if (typeof window === "undefined") return false;
  const suffix =
    opts?.finality === "irreversible"
      ? " This cannot be undone."
      : opts?.finality === "final"
        ? " This is final."
        : "";
  return window.confirm(`${message}${suffix}`);
}
