"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Ic } from "@/components/ui/Icon";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { cities } from "@/data/cities";
import { pricingPlans, getPlanById } from "@/data/pricingPlans";
import { accessories } from "@/data/accessories";
import { submitBooking } from "@/services/bookingService";
import { track } from "@/services/analytics";
import { API_BASE } from "@/services/api";
import { resolveImg } from "@/services/modelService";
import type { SiteSettings } from "@/services/settingsService";
import type { BikeModel, PlanId } from "@/types";

/** Contact preference captured on the review step. */
type ContactMethod = "email" | "phone";
/** Payment preference captured on the review step. */
type PaymentMethod = "cash" | "transfer";

/** The single-select steps that a deep link can pre-satisfy and thus skip. */
type StepKey = "city" | "model" | "plan" | "details" | "review";

/** Map the data `country` value onto its `cities.countries` message key. */
const countryKey: Record<string, string> = {
  Estonia: "estonia",
  Latvia: "latvia",
  Finland: "finland",
};

// Pricing is identical across all bike models and only varies by plan, so the
// per-model price is shown as a min–max daily RANGE derived from the plans.
// Computed once from `pricingPlans` so it stays correct if the plans change.
const dailyRates = pricingPlans.map((p) => p.daily);
const dailyMin = Math.min(...dailyRates);
const dailyMax = Math.max(...dailyRates);

// Country dial codes offered next to the phone input. Estonia is the default.
const dialCodes = [
  { code: "+372", labelKey: "estonia" },
  { code: "+371", labelKey: "latvia" },
  { code: "+358", labelKey: "finland" },
] as const;

// Earliest selectable pickup date = today + 3 business days (skip Sat/Sun).
// Kept as a small standalone helper so the lead time is easy to relax later.
const BUSINESS_DAYS_LEAD = 3;
function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

// Format a Date as YYYY-MM-DD from its LOCAL parts. Avoids toISOString(), whose
// UTC slice can shift to the previous/next day for UTC+2/+3 users at night.
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingWizard({ settings, models }: { settings: SiteSettings; models: BikeModel[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("booking");
  const tc = useTranslations("cities");
  const tp = useTranslations("pricing");
  const ta = useTranslations("accessories");
  const tm = useTranslations("modelItems");

  // Pre-fill from deep-link query params (e.g. "Reserve this bike" → ?model=…,
  // "Reserve in Tallinn" → ?city=…, "Choose 6 months" → ?plan=…). A pre-filled
  // single-select step is dropped from the flow entirely, so an intent-driven
  // visitor never re-picks what they already chose.
  const qCity = params.get("city");
  const initialCity = cities.find((c) => c.id === qCity && c.status !== "soon") ? (qCity as string) : "";
  const qModel = params.get("model");
  const initialModel = models.find((m) => m.id === qModel) ? (qModel as string) : "";
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
  const [dialCode, setDialCode] = useState<string>(dialCodes[0].code);
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const startRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferral);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Live availability: keyed as "city:<id>" and "model:<id>" → available count.
  // Falls back silently to static data when the API is unavailable.
  const [availMap, setAvailMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const url = API_BASE
      ? `${API_BASE}/api/public/availability`
      : "/api/public/availability";
    fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((entries: Array<{ modelId: string; cityId: string; available: number }>) => {
        const m: Record<string, number> = {};
        for (const e of entries) {
          const cityKey = `city:${e.cityId}`;
          m[cityKey] = (m[cityKey] ?? 0) + e.available;
          const modelKey = `model:${e.modelId}`;
          m[modelKey] = (m[modelKey] ?? 0) + e.available;
        }
        setAvailMap(m);
      })
      .catch(() => {}); // silent fallback to static
  }, []);

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

  // Contact + payment preferences (review step). Contact defaults to email;
  // payment defaults to cash-at-pickup. Both ride along in the booking payload.
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  // Model the visitor is previewing in the info popup (null = closed). The popup
  // is informational only and never changes the selection.
  const [infoModel, setInfoModel] = useState<BikeModel | null>(null);

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
  }, [key]);

  // Close the model info popup on Esc and lock background scroll while open.
  useEffect(() => {
    if (!infoModel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoModel(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [infoModel]);

  const model = models.find((m) => m.id === modelId);
  const plan = planId ? getPlanById(planId) : undefined;
  const city = cities.find((c) => c.id === cityId);

  // Earliest selectable pickup date (today + 3 business days), as YYYY-MM-DD.
  // Computed once on mount (lazy useState initializer) so it doesn't drift across
  // renders and never reads a ref during render.
  const [minStartDate] = useState(() =>
    toLocalISODate(addBusinessDays(new Date(), BUSINESS_DAYS_LEAD)),
  );

  // Clamp/clear any pre-filled or stale start date that falls before the
  // minimum (e.g. an older value or a hand-typed earlier date).
  useEffect(() => {
    if (startDate && startDate < minStartDate) setStartDate("");
  }, [startDate, minStartDate]);

  // End date = preferred start date + plan.months calendar months. Returned as a
  // localised date string (or "" when either input is missing).
  const endDate = (() => {
    if (!startDate || !plan) return "";
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return "";
    // Clamp the day so a month-end start (e.g. Aug 31 + 1 month) doesn't overflow
    // into the next month (Oct 1) but instead lands on the last valid day.
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + plan.months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return toLocalISODate(d);
  })();
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
        customer: { firstName: first.trim(), lastName: last.trim(), email: email.trim(), phone: `${dialCode} ${phone.trim()}` },
        notes: notes.trim() || undefined,
        referralCode: settings.showReferralCode ? referralCode.trim() || undefined : undefined,
        contactMethod,
        paymentMethod,
        locale,
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
      {/* Component-scoped responsive styles for elements that previously relied
          on inline styles (which can't express @media). Reuses brand tokens; no
          edits to globals.css. */}
      <style jsx>{`
        /* ---- Model picker option row ---- */
        .bike-opt-wrap {
          position: relative;
        }
        /* :global() because these classes sit on elements rendered outside this
           styled-jsx scope boundary (className on mapped buttons/spans). */
        :global(.bike-opt) {
          flex-direction: row;
          align-items: center;
          gap: 13px;
          padding-right: 52px; /* clear the info button */
        }
        :global(.bike-thumb) {
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          border-radius: var(--r-sm);
          overflow: hidden;
          /* Lighter surface + lift so a dark bike shot stays recognizable. */
          background: var(--surface);
          border: 1px solid var(--border-strong);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }
        :global(.bike-thumb img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        :global(.bike-opt-text) {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        :global(.bike-opt-text .opt-t),
        :global(.bike-opt-text .opt-m) {
          overflow-wrap: anywhere;
        }
        :global(.bike-info-btn) {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          cursor: pointer;
          background: var(--bg-2);
          border: 1px solid var(--border);
          color: var(--text-2);
          padding: 0;
          z-index: 2;
          transition: border-color 0.2s, color 0.2s;
        }
        :global(.bike-info-btn:hover) {
          border-color: var(--border-strong);
          color: var(--text);
        }

        /* ---- Segmented contact / payment choices ---- */
        :global(.seg-block) {
          margin-top: 20px;
        }
        :global(.seg-head) {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin: 0 0 10px;
        }
        :global(.seg-row) {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        :global(.seg-btn) {
          flex: 1 1 140px;
          box-sizing: border-box;
          cursor: pointer;
          text-align: center;
          padding: 13px 14px;
          min-height: 46px;
          border-radius: var(--r-sm);
          font-size: 14px;
          font-weight: 600;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-2);
          transition: border-color 0.2s, background 0.2s, color 0.2s;
        }
        :global(.seg-btn.on) {
          background: linear-gradient(
            180deg,
            rgba(216, 255, 54, 0.08),
            rgba(255, 255, 255, 0.02)
          );
          border-color: var(--lime);
          color: var(--text);
        }

        /* ---- Phone field: country-code select + number input ---- */
        :global(.phone-row) {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        :global(.phone-row .phone-dial) {
          flex: 0 0 auto;
          width: auto;
          max-width: 42%;
          /* Inherit the same dark-field look as the text inputs. */
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: var(--r-sm);
          padding: 0 10px;
          font-size: 15px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        :global(.phone-row .phone-dial:focus) {
          outline: none;
          border-color: var(--lime);
        }
        /* The native option popup ignores translucent --surface and renders on a
           light system background, which made the light option text invisible.
           Force a solid dark row so every country code is readable. */
        :global(.phone-row .phone-dial option) {
          background: #0e1118;
          color: #ffffff;
        }
        :global(.phone-row input) {
          flex: 1 1 auto;
          min-width: 0;
        }

        /* ---- Small inline hint under a field (e.g. earliest pickup) ---- */
        :global(.field-hint) {
          margin: 6px 0 0;
          font-size: 12.5px;
          color: var(--text-2);
        }

        /* ---- Long review values (e.g. email) must not overflow ---- */
        :global(.summary-v-wrap) {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* ---- Model details modal ---- */
        :global(.bike-modal-backdrop) {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(6, 8, 12, 0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        :global(.bike-modal) {
          position: relative;
          width: 100%;
          max-width: 460px;
          max-height: calc(100dvh - 32px);
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden; /* clip rounded corners; body scrolls internally */
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6),
            0 0 60px -16px var(--lime-glow);
        }
        :global(.bike-modal-close) {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          cursor: pointer;
          background: rgba(6, 8, 12, 0.55);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0;
        }
        :global(.bike-modal-img) {
          flex-shrink: 0;
          aspect-ratio: 16 / 10;
          background: var(--bg-2);
        }
        :global(.bike-modal-body) {
          padding: 20px 22px 22px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        @media (max-width: 600px) {
          :global(.bike-modal-img) {
            aspect-ratio: 16 / 9;
          }
          :global(.bike-modal-body) {
            padding: 18px 18px 20px;
          }
        }
      `}</style>
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
                        : (() => {
                            const liveCount = availMap[`city:${c.id}`];
                            const count = liveCount ?? c.available;
                            if (count === 0) return t("city.waitlist");
                            if (count <= 3) return t("city.limited");
                            return t("city.available", { count });
                          })()}
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
              {models.map((m) => {
                const liveCount = availMap[`model:${m.id}`];
                const isWait = liveCount !== undefined ? liveCount === 0 : m.status === "wait";
                // Prefer a brighter gallery/lifestyle shot for the small thumbnail
                // (the catalogue `img` is a dark studio cut-out that reads as
                // near-invisible on the dark option surface); fall back to `img`.
                const thumb = m.gallery?.[0] ?? m.img;
                return (
                  <div key={m.id} className="bike-opt-wrap">
                    <button
                      type="button"
                      className={`opt bike-opt ${modelId === m.id ? "selected" : ""}`}
                      onClick={() => pick(() => setModelId(m.id))}
                    >
                      <span className="bike-thumb" aria-hidden>
                        <img
                          src={resolveImg(thumb)}
                          alt=""
                          loading="lazy"
                        />
                      </span>
                      <span className="bike-opt-text">
                        <span className="opt-t">{m.name}</span>
                        <span className="opt-m">
                          {m.brand} · {tm(`${m.id}.tagline`)}
                        </span>
                        <span className="opt-p">
                          {t("plan.dayRange", {
                            min: dailyMin.toFixed(2),
                            max: dailyMax.toFixed(2),
                          })}
                          {isWait ? t("model.waitlistSuffix") : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="bike-info-btn"
                      aria-label={t("bike.viewDetails")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoModel(m);
                      }}
                    >
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11 V16.5" />
                        <path d="M12 7.5 V7.6" />
                      </svg>
                    </button>
                  </div>
                );
              })}
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
                  <span className="opt-deposit">
                    {t("plan.depositBadge", { deposit: p.monthly })}
                  </span>
                  <span className="opt-m">
                    {t("plan.dueLine", { total: p.monthly * 2 })}
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
                <input id="first" value={first} onChange={(e) => setFirst(e.target.value)} onBlur={() => markTouched("first")} aria-invalid={!!errFor("first")} aria-describedby={errFor("first") ? "first-err" : undefined} autoComplete="given-name" enterKeyHint="next" />
                {errFor("first") && <p id="first-err" role="alert" className="field-err">{errFor("first")}</p>}
              </div>
              <div className="field">
                <label htmlFor="last">{t("details.lastName")}</label>
                <input id="last" value={last} onChange={(e) => setLast(e.target.value)} onBlur={() => markTouched("last")} aria-invalid={!!errFor("last")} aria-describedby={errFor("last") ? "last-err" : undefined} autoComplete="family-name" enterKeyHint="next" />
                {errFor("last") && <p id="last-err" role="alert" className="field-err">{errFor("last")}</p>}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="email">{t("details.email")}</label>
                <input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => markTouched("email")} aria-invalid={!!errFor("email")} aria-describedby={errFor("email") ? "email-err" : undefined} autoComplete="email" enterKeyHint="next" />
                {errFor("email") && <p id="email-err" role="alert" className="field-err">{errFor("email")}</p>}
              </div>
              <div className="field">
                <label htmlFor="phone">{t("details.phone")}</label>
                <div className="phone-row">
                  <select
                    className="phone-dial"
                    aria-label={t("details.dialCode")}
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                  >
                    {dialCodes.map((d) => (
                      <option key={d.code} value={d.code}>
                        {tc(`countries.${d.labelKey}`)} {d.code}
                      </option>
                    ))}
                  </select>
                  <input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => markTouched("phone")} aria-invalid={!!errFor("phone")} aria-describedby={errFor("phone") ? "phone-err" : undefined} autoComplete="tel" enterKeyHint="next" placeholder={t("details.phonePlaceholder")} />
                </div>
                {errFor("phone") && <p id="phone-err" role="alert" className="field-err">{errFor("phone")}</p>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="start">{t("details.startDate")}</label>
              <div
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
                  min={minStartDate}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onBlur={() => markTouched("start")}
                  aria-invalid={!!errFor("start")}
                  aria-describedby={errFor("start") ? "start-err" : undefined}
                />
                <span className="date-field-caret" aria-hidden>
                  <Ic.arrow />
                </span>
              </div>
              {errFor("start") ? (
                <p id="start-err" role="alert" className="field-err">{errFor("start")}</p>
              ) : (
                <p className="field-hint">{t("details.startDateHint")}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="notes">{t("details.notes")}</label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("details.notesPlaceholder")} />
            </div>
            {settings.showReferralCode && (
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
            )}

            {/* Add-ons folded in here (optional), collapsed by default so the
                Details step stays short above the validation gate. Hidden until
                the admin enables the add-gear feature. */}
            {settings.showAddGear && (
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
            )}
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
              {settings.showAddGear && (
                <div className="summary-row">
                  <span className="l">{t("review.addons")}</span>
                  <span className="v">
                    {accessoryIds.length
                      ? accessoryIds.map((id) => ta(`names.${id}`)).join(", ")
                      : t("review.none")}
                  </span>
                </div>
              )}
              <div className="summary-row">
                <span className="l">{t("review.startDate")}</span>
                <span className="v">{startDate}</span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.endDate")}</span>
                <span className="v">{endDate || "—"}</span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.contact")}</span>
                <span className="v summary-v-wrap">
                  {first} {last}
                  <br />
                  {email}
                </span>
              </div>
              <div className="summary-row">
                <span className="l">{t("review.deposit")}</span>
                <span className="v">
                  €{plan?.monthly}
                  <span className="summary-sub">{t("review.depositNote")}</span>
                </span>
              </div>
              <div className="summary-total">
                <span className="l">{planId ? tp(`terms.${planId}`) : plan?.term}</span>
                <span className="big">
                  €{plan?.monthly}
                  <span className="per"> {t(settings.showAddGear ? "review.per30Addons" : "review.per30Only")}</span>
                </span>
              </div>
            </div>
            {plan && (
              <p className="sub" style={{ marginTop: 12 }}>
                {t("review.billedMonthly", { monthly: plan.monthly })}
              </p>
            )}
            {plan && endDate && (
              <p className="sub" style={{ marginTop: 4 }}>
                {t("review.endNote", { months: plan.months, date: endDate })}
              </p>
            )}

            {/* Contact preference — how rentaro should reach the customer. */}
            <div className="seg-block">
              <h4 className="seg-head">{t("contact.title")}</h4>
              <div className="seg-row">
                <button
                  type="button"
                  className={`seg-btn ${contactMethod === "email" ? "on" : ""}`}
                  aria-pressed={contactMethod === "email"}
                  onClick={() => setContactMethod("email")}
                >
                  {t("contact.email")}
                </button>
                <button
                  type="button"
                  className={`seg-btn ${contactMethod === "phone" ? "on" : ""}`}
                  aria-pressed={contactMethod === "phone"}
                  onClick={() => setContactMethod("phone")}
                >
                  {t("contact.phone")}
                </button>
              </div>
            </div>

            {/* Payment preference — cash at pickup or bank transfer. */}
            <div className="seg-block">
              <h4 className="seg-head">{t("payment.title")}</h4>
              <div className="seg-row">
                <button
                  type="button"
                  className={`seg-btn ${paymentMethod === "cash" ? "on" : ""}`}
                  aria-pressed={paymentMethod === "cash"}
                  onClick={() => setPaymentMethod("cash")}
                >
                  {t("payment.cash")}
                </button>
                <button
                  type="button"
                  className={`seg-btn ${paymentMethod === "transfer" ? "on" : ""}`}
                  aria-pressed={paymentMethod === "transfer"}
                  onClick={() => setPaymentMethod("transfer")}
                >
                  {t("payment.transfer")}
                </button>
              </div>
              {paymentMethod === "transfer" && (
                <p className="sub" style={{ marginTop: 8 }}>
                  {t("payment.transferNote")}
                </p>
              )}
            </div>

            <p className="sub" style={{ marginTop: 16 }}>
              {t("review.paymentNote")}
            </p>
            <a
              href="/rules"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-block"
              style={{ textDecoration: "none", marginTop: 4, marginBottom: 4, fontSize: 14 }}
            >
              {t("review.readRulesLink")}
            </a>
            <TrustStrip className="trust-strip-review" />
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
            {error && <div role="alert" className="wizard-err">{error}</div>}
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

      {/* Informational model preview popup. Opened by the per-option info button;
          never changes the selection. Closes on Esc, backdrop or the close button. */}
      {infoModel && (
        <div
          role="presentation"
          className="bike-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInfoModel(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={infoModel.name}
            className="card bike-modal"
          >
            <button
              type="button"
              className="bike-modal-close"
              aria-label={t("bike.close")}
              onClick={() => setInfoModel(null)}
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 4 L12 12" />
                <path d="M12 4 L4 12" />
              </svg>
            </button>
            <div className="bike-modal-img">
              <img
                src={resolveImg(infoModel.gallery?.[0] ?? infoModel.img)}
                alt={infoModel.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <div className="bike-modal-body">
              <h3>{infoModel.name}</h3>
              <div className="model-tagline">
                {infoModel.brand} · {tm(`${infoModel.id}.tagline`)}
              </div>
              <p className="lead" style={{ fontSize: 14.5, marginTop: 10 }}>
                {infoModel.blurb}
              </p>
              <div className="spec-row" style={{ marginTop: 12 }}>
                {infoModel.pills.map((p) => (
                  <span className="spec-pill" key={p}>
                    <Ic.bolt s={11} />
                    {p}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 16 }}
                onClick={() => {
                  const id = infoModel.id;
                  setInfoModel(null);
                  pick(() => setModelId(id));
                }}
              >
                {t("buttons.continue")}
                <span className="arrow">
                  <Ic.arrow />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
