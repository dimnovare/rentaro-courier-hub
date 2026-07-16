"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FeedbackApiError,
  FeedbackConfigError,
  listRentalFeedback,
  type AdminRentalFeedback,
  type AdminRentalFeedbackPage,
} from "@/services/adminFeedbackService";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { PageHeader } from "@/components/admin/PageHeader";
import { Notice, ErrorPanel } from "@/components/admin/Feedback";
import { AdminTable, EmptyRow, Td, Th, fmtDate } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; page: AdminRentalFeedbackPage }
  | { phase: "error"; message: string; config: boolean };

const PAGE_SIZE = 100;

export default function AdminFeedbackPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    // Silent reloads (topbar Refresh) keep the current inbox on screen instead
    // of blanking the page back to the loading notice.
    const silent = Boolean(opts?.silent);
    if (!silent) setState({ phase: "loading" });
    setLoadMoreError(null);
    try {
      setState({
        phase: "ready",
        page: await listRentalFeedback(0, PAGE_SIZE),
      });
    } catch (error) {
      if (error instanceof FeedbackApiError && error.unauthorized) {
        signOut();
        return;
      }
      // A failed SILENT refresh keeps the (still-valid) data on screen.
      if (!silent) setState(toErrorState(error));
    }
  }, [signOut]);

  const loadMore = useCallback(async () => {
    if (state.phase !== "ready" ||
        loadingMore ||
        state.page.items.length >= state.page.total) {
      return;
    }

    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const next = await listRentalFeedback(state.page.items.length, PAGE_SIZE);
      setState((current) => current.phase === "ready"
        ? {
            phase: "ready",
            page: {
              ...next,
              items: [...current.page.items, ...next.items],
            },
          }
        : current);
    } catch (error) {
      if (error instanceof FeedbackApiError && error.unauthorized) {
        signOut();
        return;
      }
      setLoadMoreError(
        error instanceof Error ? error.message : "Could not load more feedback.",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, signOut, state]);

  useEffect(() => {
    void load();
  }, [load]);
  const silentReload = useCallback(() => void load({ silent: true }), [load]);
  useAdminRefresh(silentReload);

  if (state.phase === "loading") {
    return <Notice>Loading rental feedback…</Notice>;
  }

  if (state.phase === "error") {
    return <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />;
  }

  return (
    <FeedbackInbox
      page={state.page}
      loadingMore={loadingMore}
      loadMoreError={loadMoreError}
      onLoadMore={loadMore}
    />
  );
}

/** Map a non-auth thrown error onto an error load state — config problems (API
 *  base URL unset) get the "Not configured" panel, API failures get "Try again"
 *  (mirrors the sibling admin pages' toErrorState). */
function toErrorState(err: unknown): LoadState {
  if (err instanceof FeedbackConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof FeedbackApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: "Something went wrong loading rental feedback.", config: false };
}

function FeedbackInbox({
  page,
  loadingMore,
  loadMoreError,
  onLoadMore,
}: {
  page: AdminRentalFeedbackPage;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
}) {
  const feedback: AdminRentalFeedback[] = page.items;

  return (
    <div>
      <PageHeader
        title="Feedback"
        subtitle="Completed-rental ratings and comments from couriers. Publication consent is shown explicitly."
      />

      <section className="admin-feedback-summary" aria-label="Feedback summary">
        <FeedbackMetric value={String(page.total)} label="Responses" />
        <FeedbackMetric
          value={page.averageRating == null ? "—" : page.averageRating.toFixed(1)}
          label="Average rating"
        />
        <FeedbackMetric value={String(page.publishable)} label="May publish" />
      </section>

      <AdminTable>
        <thead>
          <tr>
            <Th>Received</Th>
            <Th>Customer</Th>
            <Th>Bike</Th>
            <Th>City</Th>
            <Th>Rating</Th>
            <Th>Comment</Th>
            <Th>Language</Th>
            <Th>Testimonial</Th>
          </tr>
        </thead>
        <tbody>
          {feedback.length === 0 ? (
            <EmptyRow
              colSpan={8}
              label="No rental feedback yet — responses appear here after a completed rental's feedback form is submitted."
            />
          ) : (
            feedback.map((item) => (
              <tr key={item.id}>
                <Td mono nowrap>{fmtDate(item.submittedAt)}</Td>
                <Td nowrap>
                  <strong className="admin-feedback-customer">{item.customerName || "—"}</strong>
                  <span className="mono admin-feedback-email">{item.customerEmail}</span>
                </Td>
                <Td>
                  <span className="admin-feedback-model">{item.modelName}</span>
                  <span className="mono admin-feedback-code">{item.modelId}</span>
                </Td>
                <Td nowrap>{item.cityName}</Td>
                <Td nowrap>
                  <span className="admin-feedback-rating" aria-label={`${item.rating} out of 5`}>
                    <span aria-hidden>{"★".repeat(item.rating)}</span>
                    <span className="mono">{item.rating}/5</span>
                  </span>
                </Td>
                <Td>
                  <p className="admin-feedback-comment">{item.comment?.trim() || "—"}</p>
                </Td>
                <Td mono nowrap>{item.locale.toUpperCase()}</Td>
                <Td nowrap>
                  <StatusPill
                    value={item.consentToPublish ? "consented" : "private"}
                    tone={item.consentToPublish ? "good" : "neutral"}
                  />
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>

      {feedback.length < page.total && (
        <div className="admin-feedback-more">
          <span className="mono">Showing {feedback.length} of {page.total}</span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
      {loadMoreError && <p className="admin-error" role="alert">{loadMoreError}</p>}
    </div>
  );
}

function FeedbackMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="admin-feedback-metric">
      <strong>{value}</strong>
      <span className="mono">{label}</span>
    </div>
  );
}
