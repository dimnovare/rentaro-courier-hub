"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ic } from "@/components/ui/Icon";
import { cities } from "@/data/cities";
import { bikeModels } from "@/data/bikeModels";
import { pricingPlans, getPlanById } from "@/data/pricingPlans";
import { accessories } from "@/data/accessories";
import { submitBooking } from "@/services/bookingService";
import { createBookingPayment } from "@/services/paymentService";
import type { PlanId } from "@/types";

const STEP_LABELS = ["City", "Model", "Plan", "Add-ons", "Details", "Review"];

export function BookingWizard() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(0);
  const [cityId, setCityId] = useState(() => {
    const q = params.get("city");
    return cities.find((c) => c.id === q && c.status !== "soon") ? (q as string) : "";
  });
  const [modelId, setModelId] = useState(() => {
    const q = params.get("model");
    return bikeModels.find((m) => m.id === q) ? (q as string) : "";
  });
  const [planId, setPlanId] = useState<PlanId | "">(() => {
    const q = params.get("plan");
    return pricingPlans.find((p) => p.id === q) ? (q as PlanId) : "";
  });
  const [accessoryIds, setAccessoryIds] = useState<string[]>([]);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const model = bikeModels.find((m) => m.id === modelId);
  const plan = planId ? getPlanById(planId) : undefined;
  const city = cities.find((c) => c.id === cityId);
  const today = new Date().toISOString().slice(0, 10);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const stepValid = [
    !!cityId,
    !!modelId,
    !!planId,
    true,
    !!first.trim() && !!last.trim() && emailOk && !!phone.trim() && !!startDate,
    true,
  ][step];

  const toggleAcc = (id: string) =>
    setAccessoryIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const next = () => stepValid && step < 5 && setStep(step + 1);
  const back = () => (step > 0 ? setStep(step - 1) : router.push("/"));

  const submit = async () => {
    if (!cityId || !modelId || !planId) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await submitBooking({
        cityId,
        modelId,
        planId: planId as PlanId,
        accessoryIds,
        preferredStartDate: startDate,
        customer: { firstName: first.trim(), lastName: last.trim(), email: email.trim(), phone: phone.trim() },
        notes: notes.trim() || undefined,
      });
      const summary = {
        id: result.id,
        model: model?.name ?? "",
        plan: plan?.term ?? "",
        monthly: plan?.monthly ?? 0,
        daily: plan?.daily ?? 0,
        city: city?.name ?? "",
        startDate,
        firstName: first.trim(),
        accessories: accessoryIds
          .map((id) => accessories.find((a) => a.id === id)?.name)
          .filter(Boolean),
      };
      sessionStorage.setItem("rentaro_booking", JSON.stringify(summary));

      // Start payment for the first 30-day period. When Montonio is configured the
      // backend returns a hosted checkout URL to redirect to; otherwise it skips
      // payment (no keys) and we continue straight to the success page.
      const payment = await createBookingPayment(result.id);
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }
      router.push("/booking/success");
    } catch {
      setError("Something went wrong submitting your request. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="wizard">
      <div className="wizard-head">
        <h1>Reserve your e-bike</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          Six quick steps. No payment now — we confirm availability and send your digital
          contract before pickup.
        </p>
      </div>

      <div className="wizard-rail">
        {STEP_LABELS.map((l, i) => (
          <div key={l} className={`st ${i === step ? "active" : i < step ? "done" : ""}`}>
            <div className="bar" />
            <div className="lbl">
              {i + 1}. {l}
            </div>
          </div>
        ))}
      </div>

      <article className="card wizard-panel">
        {step === 0 && (
          <>
            <h3>Where do you ride?</h3>
            <p className="sub">Choose your city. We operate in Tallinn and Riga today.</p>
            <div className="opt-grid three">
              {cities.map((c) => {
                const soon = c.status === "soon";
                return (
                  <button
                    key={c.id}
                    className={`opt ${cityId === c.id ? "selected" : ""} ${soon ? "disabled" : ""}`}
                    disabled={soon}
                    onClick={() => !soon && setCityId(c.id)}
                  >
                    <span className="opt-t">{c.name}</span>
                    <span className="opt-m">{c.country}</span>
                    <span className="opt-p">
                      {soon ? "Coming soon" : c.status === "limited" ? "Limited stock" : `${c.available} available`}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h3>Pick your bike</h3>
            <p className="sub">Every model rents on the same plans — choose the one that fits your shifts.</p>
            <div className="opt-grid">
              {bikeModels.map((m) => (
                <button
                  key={m.id}
                  className={`opt ${modelId === m.id ? "selected" : ""}`}
                  onClick={() => setModelId(m.id)}
                >
                  <span className="opt-t">{m.name}</span>
                  <span className="opt-m">
                    {m.brand} · {m.tagline}
                  </span>
                  <span className="opt-p">
                    From €{m.fromDay.toFixed(2)}/day{m.status === "wait" ? " · waitlist" : ""}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3>Choose a plan</h3>
            <p className="sub">The longer the term, the lower the daily price. Minimum 30 days.</p>
            <div className="opt-grid three">
              {pricingPlans.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${planId === p.id ? "selected" : ""}`}
                  onClick={() => setPlanId(p.id)}
                >
                  <span className="opt-t">{p.term}</span>
                  <span className="opt-p">
                    €{p.daily.toFixed(2)}/day
                  </span>
                  <span className="opt-m">€{p.monthly} per 30 days · {p.tag}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3>Add-ons</h3>
            <p className="sub">Optional. Add gear that earns shifts — you can change this later.</p>
            <div className="opt-grid">
              {accessories.map((a) => {
                const on = accessoryIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    className={`opt row ${on ? "selected" : ""}`}
                    onClick={() => toggleAcc(a.id)}
                  >
                    <span>
                      <span className="opt-t" style={{ display: "block" }}>
                        {a.name}
                      </span>
                      <span className="opt-p">{a.price}</span>
                    </span>
                    <span className="opt-check">{on && <Ic.check s={12} />}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3>Your details</h3>
            <p className="sub">So we can confirm availability and send your contract.</p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="first">First name</label>
                <input id="first" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
              </div>
              <div className="field">
                <label htmlFor="last">Last name</label>
                <input id="last" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="start">Preferred start date</label>
              <input id="start" type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery platform, pickup preference, anything we should know…" />
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h3>Review &amp; confirm</h3>
            <p className="sub">Check the details — no payment is taken now.</p>
            <div>
              <div className="summary-row">
                <span className="l">City</span>
                <span className="v">{city?.name}</span>
              </div>
              <div className="summary-row">
                <span className="l">Model</span>
                <span className="v">{model?.name}</span>
              </div>
              <div className="summary-row">
                <span className="l">Plan</span>
                <span className="v">
                  {plan?.term} · €{plan?.daily.toFixed(2)}/day
                </span>
              </div>
              <div className="summary-row">
                <span className="l">Add-ons</span>
                <span className="v">
                  {accessoryIds.length
                    ? accessoryIds.map((id) => accessories.find((a) => a.id === id)?.name).join(", ")
                    : "None"}
                </span>
              </div>
              <div className="summary-row">
                <span className="l">Start date</span>
                <span className="v">{startDate}</span>
              </div>
              <div className="summary-row">
                <span className="l">Contact</span>
                <span className="v">
                  {first} {last}
                  <br />
                  {email}
                </span>
              </div>
              <div className="summary-total">
                <span className="l">From</span>
                <span className="big">
                  €{plan?.monthly}
                  <span className="per"> / 30 days + add-ons</span>
                </span>
              </div>
            </div>
            <p className="sub" style={{ marginTop: 16 }}>
              Pay the first 30-day period securely via Montonio — card or bank transfer.
            </p>
            {error && <div className="wizard-err">{error}</div>}
          </>
        )}

        <div className="wizard-foot">
          <button className="btn btn-ghost" onClick={back}>
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 5 ? (
            <button
              className="btn btn-primary"
              onClick={next}
              disabled={!stepValid}
              style={!stepValid ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              Continue
              <span className="arrow">
                <Ic.arrow />
              </span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
              {!submitting && (
                <span className="arrow">
                  <Ic.arrow />
                </span>
              )}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
