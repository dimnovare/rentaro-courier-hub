/**
 * PageHeader — the single, identical heading every admin page renders at the top
 * of its content. Gives the console one consistent title style (matching the
 * dashboard / models heading) so a non-technical operator always knows where
 * they are, with an optional muted subtitle and a right-aligned slot for the
 * page's existing action buttons (e.g. "+ New booking").
 *
 * Styling lives in globals.css under `.admin-page-head` (near the other admin
 * styles) so it stays consistent and themable with the rest of the console.
 */
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Right-aligned actions (buttons/links). Optional. */
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-head">
      <div className="admin-page-head-text">
        <h1 className="admin-page-head-title">{title}</h1>
        {subtitle && <p className="admin-page-head-sub">{subtitle}</p>}
      </div>
      {children && <div className="admin-page-head-actions">{children}</div>}
    </header>
  );
}
