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

/** Step label keys, in display order — copy lives in the `booking.steps` namespace. */
const STEP_KEYS = ["city", "model", "plan", "addons", "details", "review"] as const;

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
      </div>

      <div className="wizard-rail">
        {STEP_KEYS.map((key, i) => (
          <div key={key} className={`st ${i === step ? "active" : i < step ? "done" : ""}`}>
            <div className="bar" />
            <div className="lbl">
              {i + 1}. {t(`steps.${key}`)}
            </div>
          </div>
        ))}
      </div>

      <article className="card wizard-panel">
        {step === 0 && (
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
                    onClick={() => !soon && setCityId(c.id)}
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

        {step === 1 && (
          <>
            <h3>{t("model.heading")}</h3>
            <p className="sub">{t("model.sub")}</p>
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
                    {t("model.fromDay", { price: m.fromDay.toFixed(2) })}
                    {m.status === "wait" ? t("model.waitlistSuffix") : ""}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3>{t("plan.heading")}</h3>
            <p className="sub">{t("plan.sub")}</p>
            <div className="opt-grid three">
              {pricingPlans.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${planId === p.id ? "selected" : ""}`}
                  onClick={() => setPlanId(p.id)}
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

        {step === 3 && (
          <>
            <h3>{t("addons.heading")}</h3>
            <p className="sub">{t("addons.sub")}</p>
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
                        {ta(`names.${a.id}`)}
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
            <h3>{t("details.heading")}</h3>
            <p className="sub">{t("details.sub")}</p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="first">{t("details.firstName")}</label>
                <input id="first" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
              </div>
              <div className="field">
                <label htmlFor="last">{t("details.lastName")}</label>
                <input id="last" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="email">{t("details.email")}</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="phone">{t("details.phone")}</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
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
          </>
        )}

        {step === 5 && (
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
          {step < 5 ? (
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
