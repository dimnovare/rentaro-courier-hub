"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getFeedback,
  submitFeedback,
  type FeedbackResult,
  type FeedbackSubmission,
  type PortalFeedback,
} from "@/services/feedbackService";

type LoadFeedback = (token: string) => Promise<FeedbackResult>;

type ExperienceState =
  | { phase: "loading" }
  | { phase: "ready"; feedback: PortalFeedback; token: string }
  | { phase: "invalid" | "unavailable" | "no_api" | "error" };

export function FeedbackExperience({
  token,
  load = getFeedback,
}: {
  token?: string;
  load?: LoadFeedback;
}) {
  const t = useTranslations("feedback");
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token") ?? "";
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ExperienceState>({ phase: "loading" });

  useEffect(() => {
    let active = true;
    setState({ phase: "loading" });
    const fragmentToken = typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "";
    const resolvedToken = token?.trim() || queryToken.trim() || fragmentToken.trim();

    if (!resolvedToken) {
      setState({ phase: "invalid" });
      return () => {
        active = false;
      };
    }

    void load(resolvedToken).then((result) => {
      if (!active) return;
      setState(
        result.kind === "ok"
          ? { phase: "ready", feedback: result.data, token: resolvedToken }
          : { phase: result.kind },
      );
    });

    return () => {
      active = false;
    };
  }, [attempt, load, queryToken, token]);

  if (state.phase === "ready") {
    return <FeedbackForm token={state.token} feedback={state.feedback} />;
  }

  if (state.phase === "loading") {
    return <FeedbackState title={t("loading")} />;
  }

  if (state.phase === "invalid") {
    return <FeedbackState title={t("invalidTitle")} body={t("invalidBody")} />;
  }

  if (state.phase === "unavailable") {
    return <FeedbackState title={t("notReadyTitle")} body={t("notReadyBody")} />;
  }

  const body = state.phase === "no_api" ? t("noApi") : t("errorBody");
  return (
    <FeedbackState title={t("errorTitle")} body={body}>
      <button type="button" className="btn btn-ghost" onClick={() => setAttempt((value) => value + 1)}>
        {t("retry")}
      </button>
    </FeedbackState>
  );
}

type SubmitFeedback = (
  token: string,
  body: FeedbackSubmission,
) => Promise<FeedbackResult>;

export function FeedbackForm({
  token,
  feedback,
  submit = submitFeedback,
}: {
  token: string;
  feedback: PortalFeedback;
  submit?: SubmitFeedback;
}) {
  const t = useTranslations("feedback");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [saved, setSaved] = useState(feedback.submitted);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0 || sending) return;

    setSending(true);
    setError(null);
    try {
      const result = await submit(token, {
        rating,
        comment: comment.trim(),
        consentToPublish,
      });
      if (result.kind === "ok") {
        setSaved(true);
      } else {
        setError(t("submitError"));
      }
    } catch {
      setError(t("submitError"));
    } finally {
      setSending(false);
    }
  }

  if (saved) {
    return (
      <section className="feedback-panel feedback-thanks" aria-live="polite">
        <p className="feedback-kicker mono">{t("eyebrow")}</p>
        <h1>{t("thankTitle")}</h1>
        <p>{t("thankBody")}</p>
        <Link href="/book" className="btn btn-primary">
          {t("nextBike")}
          <span aria-hidden>→</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="feedback-panel">
      <p className="feedback-kicker mono">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p className="feedback-intro">{t("intro")}</p>
      <p className="feedback-rental mono">
        {t("rental", { model: feedback.modelName, city: feedback.cityName })}
      </p>

      <form onSubmit={onSubmit} className="feedback-form">
        <fieldset className="feedback-rating-field">
          <legend>{t("ratingLegend")}</legend>
          <div
            className="feedback-rating"
            role="radiogroup"
            aria-label={t("ratingLegend")}
            aria-required="true"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                className={`feedback-star${value <= rating ? " is-filled" : ""}`}
              >
                <input
                  type="radio"
                  name="rental-rating"
                  value={value}
                  checked={rating === value}
                  required
                  aria-label={t("ratingLabel", { rating: value })}
                  onChange={() => setRating(value)}
                />
                <span aria-hidden>★</span>
              </label>
            ))}
          </div>
          <div className="feedback-rating-ends mono" aria-hidden>
            <span>{t("poor")}</span>
            <span>{t("excellent")}</span>
          </div>
        </fieldset>

        <label className="feedback-field">
          <span>{t("commentLabel")}</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("commentPlaceholder")}
            maxLength={2000}
            rows={5}
          />
        </label>

        <label className="feedback-consent">
          <input
            type="checkbox"
            checked={consentToPublish}
            onChange={(event) => setConsentToPublish(event.target.checked)}
          />
          <span>{t("consent")}</span>
        </label>

        {error && <p className="feedback-error" role="alert">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={rating === 0 || sending}
        >
          {sending ? t("submitting") : t("submit")}
        </button>
      </form>
    </section>
  );
}

function FeedbackState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <section className="feedback-panel feedback-state" aria-live="polite">
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {children}
    </section>
  );
}
