"use client";

/**
 * DrawerFooter — the standard sticky footer for admin edit drawers, promoted
 * from the per-page copies (content/models). Renders, in order:
 *
 *   [Danger?] ······spacer······ Cancel (ghost) · Primary (busy-aware)
 *
 * The optional danger action pins left via the `.spacer` class the global
 * `.drawer-foot` rule honours. Buttons use the shared `.admin-mini-btn`
 * classes (globals.css) which replicate the previous inline MiniButton styles.
 *
 * Primary submit modes:
 * - `onPrimary` given  → a type="button" that calls it.
 * - `onPrimary` absent → a type="submit" button; pass `form` (the drawer form's
 *   id) so Enter-to-save and click both submit even though the footer lives
 *   outside the <form> element.
 */
import type { ReactNode } from "react";

export interface DrawerFooterProps {
  /** Close / discard (the drawer's onClose, usually). */
  onCancel: () => void;
  /** Cancel button text (default "Cancel"). */
  cancelLabel?: string;
  /** Primary button text, e.g. "Save changes". */
  primaryLabel: ReactNode;
  /** Primary text while `busy` (default "…"). */
  busyLabel?: ReactNode;
  /** A mutation is in flight — disables every button, swaps the primary label. */
  busy?: boolean;
  /** Extra primary-only disable (e.g. validation failed). */
  disabled?: boolean;
  /** Primary click handler. Omit to render the primary as type="submit". */
  onPrimary?: () => void;
  /** id of the <form> the submit-mode primary targets (when onPrimary is omitted). */
  form?: string;
  /** Optional destructive action pinned to the left (e.g. Delete). */
  danger?: { label: ReactNode; onClick: () => void; busy?: boolean };
}

export function DrawerFooter({
  onCancel,
  cancelLabel = "Cancel",
  primaryLabel,
  busyLabel = "…",
  busy = false,
  disabled = false,
  onPrimary,
  form,
  danger,
}: DrawerFooterProps) {
  const anyBusy = busy || Boolean(danger?.busy);

  return (
    <>
      {danger && (
        <button
          type="button"
          className="admin-mini-btn danger spacer"
          onClick={danger.onClick}
          disabled={anyBusy}
        >
          {danger.busy ? "…" : danger.label}
        </button>
      )}
      <button type="button" className="admin-mini-btn" onClick={onCancel} disabled={anyBusy}>
        {cancelLabel}
      </button>
      <button
        type={onPrimary ? "button" : "submit"}
        form={onPrimary ? undefined : form}
        className="admin-mini-btn primary"
        onClick={onPrimary}
        disabled={anyBusy || disabled}
      >
        {busy ? busyLabel : primaryLabel}
      </button>
    </>
  );
}
