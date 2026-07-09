"use client";

/**
 * Admin → Pricelist. Edits the three GLOBAL pricing plans (p30 / p180 / p365)
 * that every bike inherits unless a model sets a per-tier override on its
 * Models page entry. Backed by GET/PUT /api/admin/pricing[/{code}] through the
 * same-origin BFF proxy (adminPricingService).
 *
 * One card per plan; each card saves independently with a confirm dialog, a
 * "Saved ✓" confirmation and an unsaved-changes cue (mirrors the settings
 * page pattern, reusing its .admin-set-* styles). Perks are edited per
 * language (EN / ET / LV / FI / RU) as one-perk-per-line textareas — collapsed
 * by default except EN, so the card stays readable for a non-technical
 * operator.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getPlans,
  updatePlan,
  PricingApiError,
  PricingConfigError,
  PricingAuthError,
  type AdminPlan,
  type PlanInput,
} from "@/services/adminPricingService";
import type { LocalizedStrings } from "@/types/pricing";
import {
  ADMIN_LOCALES,
  toLocalizedStrings,
  type AdminLocale,
} from "@/components/admin/LocalizedListEditor";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { Link } from "@/i18n/navigation";

/* ── Load-state machine (mirrors the settings / content pages) ──────────── */

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; plans: AdminPlan[] }
  | { phase: "error"; message: string; config: boolean };

const LOCALE_LABELS: Record<AdminLocale, string> = {
  en: "English",
  et: "Estonian",
  lv: "Latvian",
  fi: "Finnish",
  ru: "Russian",
};

export default function AdminPricelistPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Bumped on every (re)load so the per-plan cards re-initialise their drafts.
  const [loadSeq, setLoadSeq] = useState(0);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const plans = await getPlans();
      setState({ phase: "ready", plans: sortPlans(plans) });
      setLoadSeq((n) => n + 1);
    } catch (err) {
      if (err instanceof PricingAuthError || (err instanceof PricingApiError && err.unauthorized)) {
        signOut();
      } else {
        setState(toErrorState(err));
      }
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRefresh(load);

  /** Replace one plan in place after a successful save. */
  const replacePlan = useCallback((saved: AdminPlan) => {
    setState((s) =>
      s.phase === "ready"
        ? { ...s, plans: sortPlans(s.plans.map((p) => (p.id === saved.id ? saved : p))) }
        : s,
    );
  }, []);

  /** Drops to the shell sign-in on 401, otherwise returns a message for the card. */
  const handleSaveError = useCallback(
    (err: unknown, fallback: string): string => {
      if (err instanceof PricingAuthError || (err instanceof PricingApiError && err.unauthorized)) {
        signOut();
        return fallback;
      }
      return err instanceof PricingApiError ? err.message : fallback;
    },
    [signOut],
  );

  return (
    <div style={{ maxWidth: 820 }}>
      {state.phase === "loading" ? (
        <Notice>Loading pricelist…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          <PageHeader
            title="Pricelist"
            subtitle="The global 30-day tier prices. Every bike inherits these unless a model sets its own override on its Models page entry."
          />

          <div style={{ display: "grid", gap: 20 }}>
            {state.plans.length === 0 && (
              <Notice>No pricing plans yet. Plans are created by the backend seed.</Notice>
            )}
            {state.plans.map((plan) => (
              <PlanCard
                key={`${plan.id}:${loadSeq}`}
                plan={plan}
                onSaved={replacePlan}
                onError={handleSaveError}
              />
            ))}
          </div>

          <p
            className="mono"
            style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "26px 0 0", lineHeight: 1.6 }}
          >
            Need a different price for one bike only? Set a per-tier override under{" "}
            <Link href="/admin/models" style={{ color: "var(--lime)" }}>
              Models
            </Link>{" "}
            → edit model → Pricing.
          </p>
        </>
      )}
    </div>
  );
}

/** Stable ordering: by sortOrder, then months, so the tiers always line up. */
function sortPlans(plans: AdminPlan[]): AdminPlan[] {
  return [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.months - b.months);
}

/* ════════════════════════════════════════════════════════════════════════
   One plan card — its own draft + baseline, saved independently.
   ════════════════════════════════════════════════════════════════════════ */

/** Editable draft: prices as controlled strings so mid-edit clearing works. */
interface PlanDraft {
  daily: string;
  monthly: string;
  tag: string;
  featured: boolean;
  /** Raw textarea text per locale — one perk per line. */
  perksText: Record<AdminLocale, string>;
}

function draftFromPlan(plan: AdminPlan): PlanDraft {
  const perksText = {} as Record<AdminLocale, string>;
  const full = toLocalizedStrings(plan.perks);
  for (const locale of ADMIN_LOCALES) {
    perksText[locale] = (full[locale] ?? []).join("\n");
  }
  return {
    daily: String(plan.daily),
    monthly: String(plan.monthly),
    tag: plan.tag,
    featured: plan.featured,
    perksText,
  };
}

/** Parse a one-perk-per-line textarea into a trimmed, blank-dropped list. */
function parsePerkLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse a money field ("5.9" or "5,9") → number, or null when invalid. */
function parseMoney(text: string): number | null {
  const trimmed = text.replace(",", ".").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Build the PUT body from the draft (immutable fields pass through unchanged). */
function toInput(plan: AdminPlan, draft: PlanDraft, daily: number, monthly: number): PlanInput {
  const perks: LocalizedStrings = {};
  for (const locale of ADMIN_LOCALES) {
    perks[locale] = parsePerkLines(draft.perksText[locale]);
  }
  return {
    term: plan.term,
    months: plan.months,
    daily,
    // The backend Monthly column is an integer €/30d.
    monthly: Math.round(monthly),
    tag: draft.tag.trim(),
    featured: draft.featured,
    perks,
    sortOrder: plan.sortOrder,
  };
}

/** Format a timestamp as HH:MM for the "Saved ✓" confirmation. */
function hhmm(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function PlanCard({
  plan,
  onSaved,
  onError,
}: {
  plan: AdminPlan;
  onSaved: (saved: AdminPlan) => void;
  onError: (err: unknown, fallback: string) => string;
}) {
  const [draft, setDraft] = useState<PlanDraft>(() => draftFromPlan(plan));
  // Snapshot of the last-saved draft; the dirty cue compares against this.
  const [baseline, setBaseline] = useState<PlanDraft>(() => draftFromPlan(plan));
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Which locale perk lists are expanded — EN visible by default.
  const [openLocales, setOpenLocales] = useState<Record<AdminLocale, boolean>>({
    en: true,
    et: false,
    lv: false,
    fi: false,
    ru: false,
  });

  const set = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => {
    setSavedAt(null);
    setFormError(null);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const setPerkText = (locale: AdminLocale, text: string) => {
    setSavedAt(null);
    setFormError(null);
    setDraft((d) => ({ ...d, perksText: { ...d.perksText, [locale]: text } }));
  };

  const daily = parseMoney(draft.daily);
  const monthly = parseMoney(draft.monthly);
  const priceInvalid = daily === null || monthly === null;

  // Normalised comparison so "5.90" vs "5.9" or trailing blank perk lines
  // don't count as changes.
  const dirty = !sameDraft(draft, baseline);
  const saveDisabled = busy || !dirty || priceInvalid;

  async function save() {
    if (saveDisabled || daily === null || monthly === null) return;
    if (
      !window.confirm(
        `Save changes to the ${plan.term} plan? The new prices go live on the public site right away.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const saved = await updatePlan(plan.id, toInput(plan, draft, daily, monthly));
      onSaved(saved);
      const next = draftFromPlan(saved);
      setDraft(next);
      setBaseline(next);
      setSavedAt(Date.now());
    } catch (err) {
      setFormError(onError(err, `Could not save the ${plan.term} plan.`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ padding: 22 }}>
      {/* Card head: term + code + featured toggle. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, letterSpacing: "-0.01em", margin: 0 }}>{plan.term}</h2>
          <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", margin: "5px 0 0" }}>
            {plan.id} · {plan.months} {plan.months === 1 ? "month" : "months"} commitment
          </p>
        </div>
        <label
          style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          title="Featured plans are highlighted on the public pricing section."
        >
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--text-dim)" }}>
            Featured
          </span>
          <Switch checked={draft.featured} onChange={(v) => set("featured", v)} />
        </label>
      </div>

      {/* Prices + tag. */}
      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          marginBottom: 6,
        }}
      >
        <PriceField
          label="Daily (€/day)"
          value={draft.daily}
          step="0.10"
          invalid={daily === null}
          onChange={(v) => set("daily", v)}
        />
        <PriceField
          label="Monthly (€/30d)"
          value={draft.monthly}
          step="1"
          invalid={monthly === null}
          onChange={(v) => set("monthly", v)}
        />
        <Field label="Tag" hint="e.g. Best price">
          <input
            type="text"
            value={draft.tag}
            placeholder="Best price"
            aria-label={`${plan.term} tag`}
            onChange={(e) => set("tag", e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>
      {priceInvalid && (
        <p className="mono" style={{ color: "var(--danger)", fontSize: 11.5, margin: "4px 0 0" }} role="alert">
          Both prices must be numbers (0 or more) before you can save.
        </p>
      )}

      {/* Perks — per language, one perk per line, collapsible (EN open). */}
      <div style={{ marginTop: 18 }}>
        <p
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            margin: "0 0 4px",
          }}
        >
          Perks shown on the site
          <span style={{ marginLeft: 8, textTransform: "none", letterSpacing: "0.02em", color: "var(--text-muted)" }}>
            one perk per line · English is the fallback for empty languages
          </span>
        </p>
        {ADMIN_LOCALES.map((locale) => {
          const open = openLocales[locale];
          const count = parsePerkLines(draft.perksText[locale]).length;
          return (
            <div key={locale} style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setOpenLocales((o) => ({ ...o, [locale]: !o[locale] }))}
                aria-expanded={open}
                className="mono"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 2px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-2)",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span aria-hidden style={{ color: "var(--text-dim)", fontSize: 10 }}>
                  {open ? "▾" : "▸"}
                </span>
                <span>{LOCALE_LABELS[locale]}</span>
                <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: 11 }}>
                  {count === 0 ? "empty" : `${count} ${count === 1 ? "perk" : "perks"}`}
                </span>
              </button>
              {open && (
                <textarea
                  value={draft.perksText[locale]}
                  onChange={(e) => setPerkText(locale, e.target.value)}
                  rows={4}
                  placeholder={"Free service\nPriority support\nFree helmet"}
                  aria-label={`${LOCALE_LABELS[locale]} perks, one per line`}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, marginBottom: 12 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {formError && (
        <p className="mono" style={{ color: "var(--danger)", fontSize: 12, margin: "14px 0 0", lineHeight: 1.5 }} role="alert">
          {formError}
        </p>
      )}

      {/* Save + unsaved-changes / saved cues (settings page pattern). */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void save()}
          disabled={saveDisabled}
          style={{ padding: "11px 22px", fontSize: 13.5, opacity: saveDisabled ? 0.55 : 1 }}
        >
          {busy ? "Saving…" : "Save plan"}
        </button>
        {dirty ? (
          <span className="admin-set-dirty" role="status">
            <span className="admin-set-dirty-dot" aria-hidden />
            Unsaved changes
          </span>
        ) : savedAt !== null ? (
          <span className="admin-set-saved" role="status">
            Saved ✓ {hhmm(savedAt)}
          </span>
        ) : (
          <span className="admin-set-clean">All changes saved.</span>
        )}
      </div>
    </section>
  );
}

/** Field-for-field draft comparison on NORMALISED values (numbers + perk lists). */
function sameDraft(a: PlanDraft, b: PlanDraft): boolean {
  if (parseMoney(a.daily) !== parseMoney(b.daily)) return false;
  if (parseMoney(a.monthly) !== parseMoney(b.monthly)) return false;
  if (a.tag.trim() !== b.tag.trim()) return false;
  if (a.featured !== b.featured) return false;
  for (const locale of ADMIN_LOCALES) {
    const la = parsePerkLines(a.perksText[locale]);
    const lb = parsePerkLines(b.perksText[locale]);
    if (la.length !== lb.length || la.some((v, i) => v !== lb[i])) return false;
  }
  return true;
}

/* ── Form pieces (inline styles + brand CSS vars, matching the admin) ───── */

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  letterSpacing: "0.02em",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {hint && (
          <span className="mono" style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function PriceField({
  label,
  value,
  step,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  step: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        aria-label={label}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          ...(invalid ? { borderColor: "rgba(255, 138, 120, 0.5)" } : null),
        }}
      />
    </Field>
  );
}

/** Lime pill switch (mirrors the settings page pattern). */
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={{
        position: "relative",
        flexShrink: 0,
        width: 44,
        height: 25,
        borderRadius: "var(--r-full)",
        background: checked ? "var(--lime)" : "var(--bg-2)",
        border: `1px solid ${checked ? "var(--lime)" : "var(--border-strong)"}`,
        transition: "background 0.18s ease, border-color 0.18s ease",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 21 : 2,
          width: 19,
          height: 19,
          borderRadius: "50%",
          background: checked ? "var(--lime-ink)" : "var(--text-2)",
          transition: "left 0.18s ease, background 0.18s ease",
        }}
      />
    </span>
  );
}

/* ── Shared chrome (mirrors the settings / content pages) ──────────────── */

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

function ErrorPanel({
  message,
  config,
  onRetry,
}: {
  message: string;
  config: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 28,
        maxWidth: 520,
        borderColor: "rgba(255, 138, 120, 0.32)",
        background: "linear-gradient(180deg, rgba(255,138,120,0.06), rgba(255,255,255,0.02))",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--danger)",
          marginBottom: 10,
        }}
      >
        {config ? "Not configured" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      {!config && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRetry}
          style={{ padding: "12px 22px", fontSize: 14 }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

function toErrorState(err: unknown): LoadState {
  if (err instanceof PricingConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof PricingApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: "Something went wrong loading the pricelist.", config: false };
}
