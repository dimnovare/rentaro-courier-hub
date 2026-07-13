import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackExperience, FeedbackForm } from "@/components/feedback/FeedbackForm";
import type { PortalFeedback } from "@/services/feedbackService";

const feedback: PortalFeedback = {
  rentalId: "rental-1",
  customerFirstName: "Karl",
  cityName: "Tallinn",
  modelName: "rentaro Engine Pro 2.0",
  locale: "en",
  submitted: false,
};

describe("FeedbackForm", () => {
  it("requires an explicit rating and keeps testimonial consent unchecked", () => {
    render(<FeedbackForm token="signed-token" feedback={feedback} />);

    expect(screen.getByRole("button", { name: "Send feedback" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /publish my feedback/i })).not.toBeChecked();
    expect(screen.getByRole("radiogroup", { name: "Rate your rental" }))
      .toHaveAttribute("aria-required", "true");

    fireEvent.click(screen.getByRole("radio", { name: "Rate 5 out of 5" }));

    expect(screen.getByRole("button", { name: "Send feedback" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Rate 5 out of 5" })).toBeChecked();
  });

  it("submits the exact rating, trimmed comment, and consent choice", async () => {
    const submit = vi.fn().mockResolvedValue({
      kind: "ok",
      data: { ...feedback, submitted: true, rating: 4, comment: "Very reliable.", consentToPublish: true },
    });
    render(
      <FeedbackForm
        token="signed-token"
        feedback={feedback}
        submit={submit}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Rate 4 out of 5" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Comment (optional)" }), {
      target: { value: "  Very reliable.  " },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /publish my feedback/i }));
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith("signed-token", {
        rating: 4,
        comment: "Very reliable.",
        consentToPublish: true,
      }),
    );
    expect(await screen.findByText("Thank you for your feedback.")).toBeInTheDocument();
  });

  it("renders an existing response without another submission form", () => {
    render(
      <FeedbackForm
        token="signed-token"
        feedback={{ ...feedback, submitted: true, rating: 5, comment: "Excellent." }}
      />,
    );

    expect(screen.getByText("Thank you for your feedback.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send feedback" })).not.toBeInTheDocument();
  });
});

describe("FeedbackExperience", () => {
  it("loads the token from the URL fragment without sending it in the page request", async () => {
    window.history.replaceState(null, "", "/feedback#token=fragment-signed-token");
    const load = vi.fn().mockResolvedValue({ kind: "ok", data: feedback });

    render(<FeedbackExperience load={load} />);

    expect(await screen.findByText("How was your ride?")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("fragment-signed-token");
    window.history.replaceState(null, "", "/feedback");
  });

  it("loads signed rental context before rendering the form", async () => {
    const load = vi.fn().mockResolvedValue({ kind: "ok", data: feedback });

    render(<FeedbackExperience token="signed-token" load={load} />);

    expect(screen.getByText("Loading your rental…")).toBeInTheDocument();
    expect(await screen.findByText("How was your ride?")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("signed-token");
  });

  it("shows a specific invalid-link state", async () => {
    const load = vi.fn().mockResolvedValue({ kind: "invalid" });

    render(<FeedbackExperience token="expired-token" load={load} />);

    expect(
      await screen.findByText("This feedback link is invalid or has expired."),
    ).toBeInTheDocument();
  });
});
