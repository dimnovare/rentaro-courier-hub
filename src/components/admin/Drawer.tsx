"use client";

/**
 * Drawer — a right-side slide-in panel for create/edit forms in the admin
 * console. Keeps editing in a focused overlay instead of expanding table rows,
 * so the operator never loses their place in a long list and forms get room to
 * breathe. Mirrors the ⌘K palette's UX contract: portalled to <body>, focus is
 * trapped and restored, Esc / backdrop-click closes, body scroll locks while
 * open, and all motion is disabled under prefers-reduced-motion (via CSS).
 *
 * Usage:
 *   <Drawer open={editing} onClose={close} title="Edit model"
 *           subtitle="rentaro-city" footer={<>…buttons…</>}>
 *     …form fields (.field / .field-row)…
 *   </Drawer>
 *
 * The drawer is presentation only — validation, draft state and service calls
 * stay with the page that opens it.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  /** When true the drawer is mounted and shown. */
  open: boolean;
  /** Close request (Esc, backdrop click, or the × button). */
  onClose: () => void;
  /** Heading shown top-left. */
  title: string;
  /** Optional muted line under the title (e.g. the record's id). */
  subtitle?: string;
  /** Sticky footer content — typically Cancel + Save buttons. */
  footer?: ReactNode;
  /** Scrollable body — the form. */
  children: ReactNode;
  /** Panel max width in px (default 540; mobile is always full-width). */
  width?: number;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  width = 540,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // Keep onClose in a ref so the focus-trap effect can depend on `open` ALONE.
  // Parents typically pass a fresh onClose each render; if it were an effect dep,
  // every keystroke (parent re-render) would re-run the trap and yank focus back
  // to the first focusable (the × button), making inputs impossible to type into.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  // Portals need document.body — only render after mount to avoid any SSR /
  // hydration mismatch on the client-rendered admin pages.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    // Remember what had focus so we can restore it on close.
    restoreRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const visibleFocusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null,
          )
        : [];

    // Focus the first field (or the panel itself) when the drawer opens.
    (visibleFocusables()[0] ?? panel)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const f = visibleFocusables();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
    // ONLY `open` — see onCloseRef above. Re-running on every onClose identity
    // change would steal focus on each keystroke.
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="drawer-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ maxWidth: width }}
      >
        <header className="drawer-head">
          <div>
            <h2 className="drawer-title">{title}</h2>
            {subtitle ? <p className="drawer-sub mono">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 4 L12 12" />
              <path d="M12 4 L4 12" />
            </svg>
          </button>
        </header>

        <div className="drawer-body">{children}</div>

        {footer ? <footer className="drawer-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
