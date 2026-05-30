"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ic } from "@/components/ui/Icon";
import { cities } from "@/data/cities";
import { bikeModels } from "@/data/bikeModels";
import { pricingPlans, getPlanById } from "@/data/pricingPlans";
import { accessories } from "@/data/accessories";
import { submitBooking } from "@/services/bookingService";
import { createBookingPayment } from "@/services/paymentService";
import type { PlanId } from "@/types";

/** The single-select steps that a deep link can pre-satisfy and thus skip. */
type StepKey = "city" | "model" | "plan" | "details" | "review";

/** Map the data `country` value onto its `cities.countries` message key. */
const countryKey: Record<string, string> = {
  Estonia: "estonia",
  Latvia: "latvia",
  Finland: "finland",
};

export function BookingWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("booking");
  const tc = useTranslations("cities");
  const tp = useTranslations("pricing");
  const ta = useTranslations("accessories");

  // Pre-fill from deep-link query params (e.g. "Reserve this bike" → ?model=…,
  // "Reserve in Tallinn" → ?city=…, "Choose 6 months" → ?plan=…). A pre-filled
  // single-select step is dropped from the flow entirely, so an intent-driven
  // visitor never re-picks what they already chose.
  const qCity = params.get("city");
  const initialCity = cities.find((c) => c.id === qCity && c.status !== "soon") ? (qCity as string) : "";
  const qModel = params.get("model");
  const initialModel = bikeModels.find((m) => m.id === qModel) ? (qModel as string) : "";
  const qPlan = params.get("plan");
  const initialPlan = pricingPlans.find((p) => p.id === qPlan) ? (qPlan as PlanId) : "";

  const [cityId, setCityId] = useState(initialCity);
  const [modelId, setModelId] = useState(initialModel);
  const [planId, setPlanId] = useState<PlanId | "">(initialPlan);
  const [accessoryIds, setAccessoryIds] = useState<string[]>([]);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Steps actually shown: skip any single-select already provided by a deep link.
  // Add-ons are folded into the Details screen, so there is no separate step.
  const steps = (
    [
      !initialCity && "city",
      !initialModel && "model",
      !initialPlan && "plan",
      "details",
      "review",
    ] as (StepKey | false)[]
  ).filter(Boolean) as StepKey[];

  const [step, setStep] = useState(0);
  const key = steps[Math.min(step, steps.length - 1)];

  const model = bikeModels.find((m) => m.id === modelId);
  const plan = planId ? getPlanById(planId) : undefined;
  const city = cities.find((c) => c.id === cityId);
  const today = new Date().toISOString().slice(0, 10);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const detailsValid =
    !!first.trim() && !!last.trim() && emailOk && !!phone.trim() && !!startDate;

  const stepValid =
    key === "city"
      ? !!cityId
      : key === "model"
        ? !!modelId
        : key === "plan"
          ? !!planId
          : key === "details"
            ? detailsValid
            : true;

  const isLast = step >= steps.length - 1;
  const toggleAcc = (id: string) =>
    setAccessoryIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const goNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const next = () => stepValid && !isLast && goNext();
  const back = () => (step > 0 ? setStep(step - 1) : router.push("/"));

  // Single-select steps select AND advance in one tap (no separate Continue).
  const pick = (set: () => void) => {
    set();
    if (!isLast) goNext();
  };

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
      setError(t("errors.submit"));
      setSubmitting(false);
    }
  };

  return (
    <div className="wizard">
      <div className="wizard-head">
        <h1>{t("title")}</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          {t("intro")}
        </p>
        {/* Running selection + price, visible across every step. */}
        {(cityId || modelId || planId) && (
          <div className="wizard-pick">
            {cityId && <span className="chip">{tc(`names.${cityId}`)}</span>}
            {model && <span className="chip">{model.name}</span>}
            {plan && (
              <span className="chip accent">
                {tp(`terms.${planId}`)} · {t("plan.per30", { price: plan.monthly })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="wizard-rail">
        {steps.map((k, i) => (
          <div key={k} className={`st ${i === step ? "active" : i < step ? "done" : ""}`}>
            <div className="bar" />
            <div className="lbl">
              {i + 1}. {t(`steps.${k === "details" ? "details" : k}`)}
            </div>
          </div>
        ))}
      </div>

      <article className="card wizard-panel">
        {key === "city" && (
          <>
            <h3>{t("city.heading")}</h3>
            <p className="sub">{t("city.sub")}</p>
            <div className="opt-grid three">
              {cities.map((c) => {
                const soon = c.status === "soon";
                return (
                  <button
                    key={c.id}
                    className={`opt ${cityId === c.id ? "selected" : ""} ${soon ? "disabled" : ""}`}
                    disabled={soon}
                    onClick={() => !soon && pick(() => setCityId(c.id))}
                  >
                    <span className="opt-t">{tc(`names.${c.id}`)}</span>
                    <span className="opt-m">{tc(`countries.${countryKey[c.country]}`)}</span>
                    <span className="opt-p">
                      {soon
                        ? t("city.soon")
                        : c.status === "limited"
                          ? t("city.limited")
                          : t("city.available", { count: c.available })}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {key === "model" && (
          <>
            <h3>{t("model.heading")}</h3>
            <p className="sub">{t("model.sub")}</p>
            <div className="opt-grid">
              {bikeModels.map((m) => (
                <button
                  key={m.id}
                  className={`opt ${modelId === m.id ? "selected" : ""}`}
                  onClick={() => pick(() => setModelId(m.id))}
                >
                  <span className="opt-t">{m.name}</span>
                  <span className="opt-m">
                    {m.brand} · {m.tagline}
                  </span>
                  <span className="opt-p">
                    {t("model.fromDay", { price: m.fromDay.toFixed(2) })}
                    {m.status === "wait" ? t("model.waitlistSuffix") : ""}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {key === "plan" && (
          <>
            <h3>{t("plan.heading")}</h3>
            <p className="sub">{t("plan.sub")}</p>
            <div className="opt-grid three">
              {pricingPlans.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${planId === p.id ? "selected" : ""}`}
                  onClick={() => pick(() => setPlanId(p.id))}
                >
                  <span className="opt-t">{tp(`terms.${p.id}`)}</span>
                  <span className="opt-p">
                    {t("plan.perDay", { price: p.daily.toFixed(2) })}
                  </span>
                  <span className="opt-m">{t("plan.per30", { price: p.monthly })} · {tp(`tags.${p.id}`)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {key === "details" && (
          <>
            <h3>{t("details.heading")}</h3>
            <p className="sub">{t("details.sub")}</p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="first">{t("details.firstName")}</label>
                <input id="first" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" enterKeyHint="next" />
              </div>
              <div className="field">
                <label htmlFor="last">{t("details.lastName")}</label>
                <input id="last" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" enterKeyHint="next" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="email">{t("details.email")}</label>
                <input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" enterKeyHint="next" />
              </div>
              <div className="field">
                <label htmlFor="phone">{t("details.phone")}</label>
                <input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" enterKeyHint="next" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="start">{t("details.startDate")}</label>
              <input id="start" type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="notes">{t("details.notes")}</label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("details.notesPlaceholder")} />
            </div>

            {/* Add-ons folded in here (optional) so they're never a separate step. */}
            <div className="wizard-addons">
              <h4 className="wizard-subhead">{t("addons.heading")}</h4>
              <p className="sub">{t("addons.sub")}</p>
              <div className="opt-grid">
                {accessories.map((a) => {
                  const on = accessoryIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`opt row ${on ? "selected" : ""}`}
                      onClick={() => toggleAcc(a.id)}
                    >
                      <span>
                        <span className="opt-t" style={{ display: "block" }}>
                          {ta(`names.${a.id}`)}
                        </span>
                        <span className="opt-p">{a.price}</span>
                      </span>
                      <span className="opt-check">{on && <Ic.check s={12} />}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {key === "review" && (
          <>
            <h3>{t("review.heading")}</h3>
            <p className="sub">{t("review.sub")}</p>
            <div>
              <div className="summary-row">
                <span className="l">{t("review.city")}</span>
                <span className="v">{cityId ? tc(`names.${cityId}`) : city?.name}</span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.model")}</span>
                <span className="v">{model?.name}</span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.plan")}</span>
                <span className="v">
                  {planId ? tp(`terms.${planId}`) : plan?.term} · {t("plan.perDay", { price: plan?.daily.toFixed(2) ?? "" })}
                </span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.addons")}</span>
                <span className="v">
                  {accessoryIds.length
                    ? accessoryIds.map((id) => ta(`names.${id}`)).join(", ")
                    : t("review.none")}
                </span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.startDate")}</span>
                <span className="v">{startDate}</span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.contact")}</span>
                <span className="v">
                  {first} {last}
                  <br />
                  {email}
                </span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.deposit")}</span>
                <span className="v">€{plan?.monthly}</span>
              </div>
              <div className="summary-total">
                <span className="l">{t("review.from")}</span>
                <span className="big">
                  €{plan?.monthly}
                  <span className="per"> {t("review.per30Addons")}</span>
                </span>
              </div>
            </div>
            <p className="sub" style={{ marginTop: 16 }}>
              {t("review.paymentNote")}
            </p>
            {error && <div className="wizard-err">{error}</div>}
          </>
        )}

        <div className="wizard-foot">
          <button className="btn btn-ghost" onClick={back}>
            {step === 0 ? t("buttons.cancel") : t("buttons.back")}
          </button>
          {!isLast ? (
            <button
              className="btn btn-primary"
              onClick={next}
              disabled={!stepValid}
              style={!stepValid ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              {t("buttons.continue")}
              <span className="arrow">
                <Ic.arrow />
              </span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? t("buttons.submitting") : t("buttons.submit")}
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
