"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ic } from "@/components/ui/Icon";
import { cities } from "@/data/cities";
import { bikeModels } from "@/data/bikeModels";
import { pricingPlans, getPlanById } from "@/data/pricingPlans";
import { accessories } from "@/data/accessories";
import { submitBooking } from "@/services/bookingService";
import { track } from "@/services/analytics";
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
  // Referral code deep-link (e.g. a shared "?ref=ABC123" link). Prefills the
  // optional referral input on the details step and rides along in the payload.
  const initialReferral = params.get("ref") ?? "";

  const [cityId, setCityId] = useState(initialCity);
  const [modelId, setModelId] = useState(initialModel);
  const [planId, setPlanId] = useState<PlanId | "">(initialPlan);
  const [accessoryIds, setAccessoryIds] = useState<string[]>([]);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const startRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferral);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Inline validation: track which required fields the visitor has blurred so
  // errors only appear after interaction (never on a pristine field).
  type DetailField = "first" | "last" | "email" | "phone" | "start";
  const [touched, setTouched] = useState<Record<DetailField, boolean>>({
    first: false,
    last: false,
    email: false,
    phone: false,
    start: false,
  });
  const markTouched = (f: DetailField) =>
    setTouched((s) => (s[f] ? s : { ...s, [f]: true }));

  // Add-ons are collapsed by default to keep the Details step short.
  const [addonsOpen, setAddonsOpen] = useState(false);

  // Required-fields consent gate on the Review step.
  const [consent, setConsent] = useState(false);

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

  // Funnel: fire `wizard_started` once on mount, then `wizard_step_viewed`
  // whenever the visible step changes. Both are consent-gated inside `track`.
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      track("wizard_started", { step: key });
    }
    track("wizard_step_viewed", { step: key });
    // `key` is the only signal that matters here — re-fire on each step change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const model = bikeModels.find((m) => m.id === modelId);
  const plan = planId ? getPlanById(planId) : undefined;
  const city = cities.find((c) => c.id === cityId);
  const today = new Date().toISOString().slice(0, 10);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const detailsValid =
    !!first.trim() && !!last.trim() && emailOk && !!phone.trim() && !!startDate;

  // Per-field error messages — only surfaced once a field has been touched.
  // `email` distinguishes "required" from "invalid format" for clearer guidance.
  const fieldErrors: Record<DetailField, string> = {
    first: !first.trim() ? t("details.errors.firstName") : "",
    last: !last.trim() ? t("details.errors.lastName") : "",
    email: !email.trim()
      ? t("details.errors.email")
      : !emailOk
        ? t("details.errors.emailInvalid")
        : "",
    phone: !phone.trim() ? t("details.errors.phone") : "",
    start: !startDate ? t("details.errors.startDate") : "",
  };
  const errFor = (f: DetailField) => (touched[f] ? fieldErrors[f] : "");

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

  const goNext = () => {
    // The step the visitor is leaving is the current visible `key`.
    track("wizard_step_completed", { step: key });
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const next = () => stepValid && !isLast && goNext();
  const back = () => (step > 0 ? setStep(step - 1) : router.push("/"));

  // Single-select steps select AND advance in one tap (no separate Continue).
  const pick = (set: () => void) => {
    set();
    if (!isLast) goNext();
  };

  const submit = async () => {
    if (!cityId || !modelId || !planId || !consent) return;
    setSubmitting(true);
    setError("");
    // PII-free: ids only, never the customer's name/email/phone.
    track("booking_submitted", { city: cityId, model: modelId, plan: planId });
    try {
      const result = await submitBooking({
        cityId,
        modelId,
        planId: planId as PlanId,
        accessoryIds,
        preferredStartDate: startDate,
        customer: { firstName: first.trim(), lastName: last.trim(), email: email.trim(), phone: phone.trim() },
        notes: notes.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
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
        // Deep link to the rental portal (success page reads summary.portalUrl).
        // Defensive: the backend may not return a token (e.g. mock mode).
        portalUrl: result.portalToken
          ? `/my-rental?token=${result.portalToken}`
          : undefined,
      };
      sessionStorage.setItem("rentaro_booking", JSON.stringify(summary));

      // No payment here — reserving is free. The customer pays the first 30-day
      // period + deposit later, in the rental portal, only after rentaro approves
      // the booking and they've accepted the contract (see ManageRental's Pay
      // step). Go straight to the success page.
      track("booking_success", { plan: planId });
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
          {t("intro", { n: steps.length })}
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
                  onClick={() => {
                    track("plan_selected", { plan: p.id });
                    pick(() => setPlanId(p.id));
                  }}
                >
                  <span className="opt-t">{tp(`terms.${p.id}`)}</span>
                  <span className="opt-p">
                    {t("plan.perDay", { price: p.daily.toFixed(2) })}
                  </span>
                  <span className="opt-m">{t("plan.per30", { price: p.monthly })} · {tp(`tags.${p.id}`)}</span>
                  <span className="opt-m">
                    {t("plan.depositLine", { deposit: p.monthly, total: p.monthly * 2 })}
                  </span>
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
                <input id="first" value={first} onChange={(e) => setFirst(e.target.value)} onBlur={() => markTouched("first")} aria-invalid={!!errFor("first")} autoComplete="given-name" enterKeyHint="next" />
                {errFor("first") && <p className="field-err">{errFor("first")}</p>}
              </div>
              <div className="field">
                <label htmlFor="last">{t("details.lastName")}</label>
                <input id="last" value={last} onChange={(e) => setLast(e.target.value)} onBlur={() => markTouched("last")} aria-invalid={!!errFor("last")} autoComplete="family-name" enterKeyHint="next" />
                {errFor("last") && <p className="field-err">{errFor("last")}</p>}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="email">{t("details.email")}</label>
                <input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => markTouched("email")} aria-invalid={!!errFor("email")} autoComplete="email" enterKeyHint="next" />
                {errFor("email") && <p className="field-err">{errFor("email")}</p>}
              </div>
              <div className="field">
                <label htmlFor="phone">{t("details.phone")}</label>
                <input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => markTouched("phone")} aria-invalid={!!errFor("phone")} autoComplete="tel" enterKeyHint="next" />
                {errFor("phone") && <p className="field-err">{errFor("phone")}</p>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="start">{t("details.startDate")}</label>
              <button
                type="button"
                className="date-field"
                data-empty={startDate ? undefined : ""}
                onClick={() => {
                  const el = startRef.current;
                  if (!el) return;
                  // Open the native calendar on a tap anywhere in the field.
                  // showPicker() is the modern path; focus()+click() is the fallback.
                  if (typeof el.showPicker === "function") el.showPicker();
                  else el.focus();
                }}
              >
                <span className="date-field-ico" aria-hidden>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5 H20.5" /><path d="M8 3 V6" /><path d="M16 3 V6" /><path d="M7.5 13 H9" /><path d="M11.5 13 H13" /><path d="M15.5 13 H17" />
                  </svg>
                </span>
                <input
                  ref={startRef}
                  id="start"
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onBlur={() => markTouched("start")}
                  aria-invalid={!!errFor("start")}
                />
                <span className="date-field-caret" aria-hidden>
                  <Ic.arrow />
                </span>
              </button>
              {errFor("start") && <p className="field-err">{errFor("start")}</p>}
            </div>
            <div className="field">
              <label htmlFor="notes">{t("details.notes")}</label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("details.notesPlaceholder")} />
            </div>
            <div className="field">
              <label htmlFor="referral">{t("referral.label")}</label>
              <input
                id="referral"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder={t("referral.placeholder")}
                autoComplete="off"
                autoCapitalize="characters"
                enterKeyHint="next"
              />
            </div>

            {/* Add-ons folded in here (optional), collapsed by default so the
                Details step stays short above the validation gate. */}
            <div className="wizard-addons">
              <button
                type="button"
                className="addons-toggle"
                aria-expanded={addonsOpen}
                aria-controls="addons-grid"
                onClick={() => setAddonsOpen((o) => !o)}
              >
                <span className="addons-toggle-label">
                  {t("addons.toggle")}
                  {accessoryIds.length > 0 && (
                    <span className="addons-count">{accessoryIds.length}</span>
                  )}
                </span>
                <span className={`addons-chevron ${addonsOpen ? "open" : ""}`} aria-hidden>
                  <Ic.arrow />
                </span>
              </button>
              {addonsOpen && (
                <div id="addons-grid" className="addons-body">
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
              )}
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
            <label className="consent-row">
              <input
                type="checkbox"
                className="consent-box"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="consent-text">
                {t.rich("review.consent", {
                  rules: (chunks) => <Link href="/rules">{chunks}</Link>,
                  privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
                })}
              </span>
            </label>
            {error && <div className="wizard-err">{error}</div>}
          </>
        )}

        <div className="wizard-foot">
          <button className="btn btn-ghost" onClick={back}>
            {step === 0 ? t("buttons.cancel") : t("buttons.back")}
          </button>
          {!isLast ? (
            <div className="wizard-foot-action">
              {key === "details" && !stepValid && (
                <span className="wizard-foot-hint">{t("details.completeHint")}</span>
              )}
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
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting || !consent}
              style={!consent && !submitting ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
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
