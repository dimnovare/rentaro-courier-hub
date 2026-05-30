"use client";

/**
 * Admin command palette (⌘K / Ctrl+K).
 *
 * A centered, dark modal that lets an admin jump to any console section by
 * typing. Destinations are derived from the sidebar's `NAV_GROUPS`, so the
 * palette never drifts out of sync with the navigation. A lightweight
 * subsequence fuzzy match ranks results; arrow keys move the selection and
 * Enter navigates (`router.push`). Esc — or clicking the backdrop — closes it.
 *
 * The open/close state and the ⌘K listener live in `AdminShell`; this component
 * is purely presentational + interactive and is only mounted when authed.
 *
 * Accessibility: rendered in a portal as `role="dialog" aria-modal`, focus is
 * moved to the search input on open and restored to the previously focused
 * element on close, Tab is trapped within the dialog, and the active option is
 * linked to the input via `aria-activedescendant`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/navigation";
import { NAV_GROUPS } from "./AdminSidebar";

interface Destination {
  /** Display label, e.g. "Bookings". */
  label: string;
  /** Route to push, e.g. "/admin/bookings". */
  href: string;
  /** Group the item belongs to, shown as a muted hint (e.g. "Operations"). */
  group: string;
}

/** Flatten the grouped nav model into a single list of jump destinations. */
const DESTINATIONS: Destination[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((it) => ({ label: it.label, href: it.href, group: g.label })),
);

/**
 * Score `query` against `text` using an order-preserving subsequence match.
 * Returns a number (higher = better) or `-1` when the query doesn't match.
 * Consecutive hits and word-start hits score higher, so "bk" → "Bookings"
 * and "cal" → "Calendar" feel natural. An empty query matches everything.
 */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    for (let j = ti; j < t.length; j++) {
      if (t[j] === ch) {
        found = j;
        break;
      }
    }
    if (found === -1) return -1;
    // Base point for the match.
    score += 1;
    // Bonus for matching at the very start, a word boundary, or contiguously.
    if (found === 0) score += 4;
    else if (t[found - 1] === " " || t[found - 1] === "-") score += 3;
    if (found === ti) streak += 1;
    else streak = 0;
    score += streak; // reward consecutive runs
    ti = found + 1;
  }
  return score;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Raw selection index; clamped to the live result set at read time (below) so
  // it stays valid as filtering shrinks the list — no extra effect needed.
  const [rawActive, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Element focused before the palette opened — restored on close.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Rank destinations against the current query. Empty query → original order.
  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return DESTINATIONS;
    return DESTINATIONS.map((d) => ({
      d,
      // Match against both label and group so "ops" surfaces Operations items.
      score: Math.max(fuzzyScore(trimmed, d.label), fuzzyScore(trimmed, `${d.group} ${d.label}`)),
    }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.d);
  }, [query]);

  // Clamp the highlighted index into the current result range during render.
  const active = results.length ? Math.min(rawActive, results.length - 1) : 0;

  // Reset transient state and capture/restore focus around open transitions.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
      setQuery("");
      setActive(0);
      // Focus the input after the portal has painted.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    // On close, hand focus back to wherever it came from.
    restoreFocusRef.current?.focus?.();
  }, [open]);

  // Lock body scroll while the palette is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Ensure the highlighted row stays visible as you arrow through the list.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, results.length - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = results[active];
      if (target) go(target.href);
      return;
    }
    // Simple focus trap: keep Tab inside the dialog (there's effectively one
    // focusable control, so just hold focus on the input).
    if (e.key === "Tab") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cmdk-overlay"
      onMouseDown={(e) => {
        // Close only when the backdrop itself is pressed, not the panel.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="cmdk card"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <div className="cmdk-input-row">
          <span className="cmdk-search-ico" aria-hidden>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21 l-4.3-4.3" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className="cmdk-input mono"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-listbox"
            aria-activedescendant={results[active] ? `cmdk-opt-${active}` : undefined}
            aria-autocomplete="list"
            placeholder="Jump to section…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="cmdk-esc mono" aria-hidden>esc</kbd>
        </div>

        <ul ref={listRef} id="cmdk-listbox" className="cmdk-list" role="listbox" aria-label="Sections">
          {results.length === 0 ? (
            <li className="cmdk-empty mono">No matching sections</li>
          ) : (
            results.map((d, i) => (
              <li
                key={d.href}
                id={`cmdk-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                className={`cmdk-opt${i === active ? " is-active" : ""}`}
                onMouseMove={() => setActive(i)}
                onMouseDown={(e) => {
                  // Prevent the input from blurring before navigation fires.
                  e.preventDefault();
                  go(d.href);
                }}
              >
                <span className="cmdk-opt-label mono">{d.label}</span>
                <span className="cmdk-opt-group mono">{d.group}</span>
              </li>
            ))
          )}
        </ul>

        <div className="cmdk-foot mono" aria-hidden>
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
