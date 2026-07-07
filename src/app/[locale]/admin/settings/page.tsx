"use client";

/**
 * Admin → Settings. Controls public-site feature visibility (six toggles, all
 * default HIDDEN) and the bank requisites shown for manual transfers. Backed by
 * the single-row SiteSettings record via adminSettingsService (GET/PUT
 * /api/admin/settings through the same-origin BFF proxy).
 *
 * Same shell/auth pattern as the other admin pages: a "use client" page mounted
 * inside the AdminAuthProvider + AdminShell layout. It reads via useAdminAuth for
 * signOut on a 401, and subscribes to the topbar refresh bus.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getSettings,
  updateSettings,
  SettingsApiError,
  SettingsConfigError,
  type SiteSettings,
} from "@/services/adminSettingsService";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";

/* ── The six feature toggles, in display order ─────────────────────────── */

const TOGGLE_KEYS = [
  "showAccessories",
  "showReferralCode",
  "showAddGear",
  "showReferAcourier",
  "showPayConfirm",
  "showOnlineSigning",
] as const;

/* ── The four bank-requisite fields, in display order ──────────────────── */

const BANK_KEYS = ["bankIban", "bankAccountName", "bankName", "bankReference"] as const;
type BankKey = (typeof BANK_KEYS)[number];

const BANK_PLACEHOLDER: Record<BankKey, string> = {
  bankIban: "EE00 0000 0000 0000 0000",
  bankAccountName: "rentaro OÜ",
  bankName: "LHV Pank",
  bankReference: "RENTARO-0000",
};

/**
 * Plain-language help under each bank field, so a non-technical operator knows
 * exactly what to type and never clears the wrong box. Hardcoded English to
 * match the rest of the admin console (admin strings are not translated).
 */
const BANK_HELP: Record<BankKey, string> = {
  bankIban: "The account number couriers transfer to. Copy it exactly from your bank.",
  bankAccountName: "The account holder's name, as it appears at the bank (e.g. rentaro OÜ).",
  bankName: "Your bank's name (e.g. LHV Pank). Shown to couriers for reference.",
  bankReference: "The reference / explanation couriers should add to their transfer.",
};

/** Short one-line help under each grouped card's heading. */
const FEATURES_HELP =
  "Switches for what couriers see on the public site. Everything is hidden by default — turn a section on only when it is ready to ship.";
const OPS_HELP = "Internal automation. These do not change what couriers see on the site.";
const BANK_SECTION_HELP =
  "Bank details shown to couriers who pay by manual transfer. Double-check before saving — these appear on their payment instructions.";

/** True when two settings records are field-for-field identical (used for the
 *  unsaved-changes indicator). Compares only the keys we edit on this page. */
function sameSettings(a: SiteSettings, b: SiteSettings): boolean {
  for (const k of TOGGLE_KEYS) {
    if (a[k] !== b[k]) return false;
  }
  if (a.autoSendReturnReminders !== b.autoSendReturnReminders) return false;
  if ((a.deliveryFee ?? 0) !== (b.deliveryFee ?? 0)) return false;
  for (const k of BANK_KEYS) {
    if ((a[k] ?? "") !== (b[k] ?? "")) return false;
  }
  return true;
}

/** Format a timestamp as HH:MM for the "Saved ✓" confirmation. */
function hhmm(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: SiteSettings }
  | { phase: "error"; message: string; config: boolean };

export default function AdminSettingsPage() {
  const t = useTranslations("admin.settings");
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // The last-saved snapshot. Everything on screen is compared against this to
  // decide whether there are unsaved changes; it is refreshed on load and after
  // a successful save. State (not a ref) so the comparison runs during render.
  const [baseline, setBaseline] = useState<SiteSettings | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    setSavedAt(null);
    try {
      const data = await getSettings();
      setBaseline(data);
      setState({ phase: "ready", data });
    } catch (err) {
      if (err instanceof SettingsApiError && err.unauthorized) {
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

  const setField = useCallback(<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    // Editing anything clears the previous "Saved" confirmation and any error,
    // so the dirty indicator can take over. Values are NOT reset to defaults —
    // whatever is on screen is exactly what a Save will write.
    setSavedAt(null);
    setActionError(null);
    setState((s) => (s.phase === "ready" ? { ...s, data: { ...s.data, [key]: value } } : s));
  }, []);

  const save = useCallback(async () => {
    if (busy || state.phase !== "ready") return;
    setBusy(true);
    setActionError(null);
    try {
      // The backend PUT is all-or-nothing: it writes every field, so we send the
      // full current record. Whatever is on screen is saved verbatim — nothing is
      // blanked behind the operator's back.
      const saved = await updateSettings(state.data);
      setBaseline(saved);
      setState({ phase: "ready", data: saved });
      setSavedAt(Date.now());
    } catch (err) {
      if (err instanceof SettingsApiError && err.unauthorized) {
        signOut();
      } else {
        setActionError(err instanceof Error ? err.message : "Could not save settings.");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, state, signOut]);

  if (state.phase === "loading") {
    return <Notice>Loading settings…</Notice>;
  }
  if (state.phase === "error") {
    return <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />;
  }

  const data = state.data;
  // Unsaved-changes flag: the on-screen record differs from the last save.
  const dirty = baseline ? !sameSettings(data, baseline) : false;

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title={t("title")} subtitle="What couriers see on the site, plus bank details for transfers." />

      {actionError && <ActionErrorBar message={actionError} onDismiss={() => setActionError(null)} />}

      {/* ── Features ────────────────────────────────────────────────────── */}
      <SettingsCard title={t("sections")} help={FEATURES_HELP}>
        <div className="admin-set-card-body">
          {TOGGLE_KEYS.map((key, i) => (
            <ToggleRow
              key={key}
              label={t(key)}
              checked={data[key]}
              first={i === 0}
              onChange={(v) => setField(key, v)}
            />
          ))}
        </div>
      </SettingsCard>

      {/* ── Operations ──────────────────────────────────────────────────── */}
      <SettingsCard title={t("opsHeading")} help={OPS_HELP}>
        <div className="admin-set-card-body">
          <ToggleRow
            label={t("autoSendReturnReminders")}
            checked={data.autoSendReturnReminders}
            first
            onChange={(v) => setField("autoSendReturnReminders", v)}
          />
          <div style={{ borderTop: "1px solid var(--border)", padding: "16px 0 4px" }}>
            <EuroField
              label="Delivery fee (€)"
              value={data.deliveryFee}
              help="Flat one-time fee when a customer picks delivery instead of free pickup. €0 = free."
              onChange={(v) => setField("deliveryFee", v)}
            />
          </div>
        </div>
      </SettingsCard>

      {/* ── Bank details / requisites ───────────────────────────────────── */}
      <SettingsCard title={t("bankHeading")} help={BANK_SECTION_HELP}>
        <div className="admin-set-card-body pad">
          {BANK_KEYS.map((key) => (
            <BankField
              key={key}
              label={t(key)}
              value={data[key]}
              placeholder={BANK_PLACEHOLDER[key]}
              help={BANK_HELP[key]}
              onChange={(v) => setField(key, v)}
            />
          ))}
        </div>
      </SettingsCard>

      {/* ── Save + unsaved-changes / saved cues ─────────────────────────── */}
      <div className="admin-set-savebar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void save()}
          disabled={busy || !dirty}
          style={{ padding: "12px 26px", fontSize: 14, opacity: busy || !dirty ? 0.55 : 1 }}
        >
          {busy ? "Saving…" : t("save")}
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
    </div>
  );
}

/** A grouped settings card: heading + one-line help, then its body. */
function SettingsCard({
  title,
  help,
  children,
}: {
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="card admin-set-card">
        <div className="admin-set-card-head">
          <h2 className="admin-set-card-title">{title}</h2>
          <p className="admin-set-card-help">{help}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

/** A labelled switch row. Help text is the label itself (describes the public effect). */
function ToggleRow({
  label,
  checked,
  first,
  onChange,
}: {
  label: string;
  checked: boolean;
  first: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "16px 0",
        cursor: "pointer",
        borderTop: first ? "none" : "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 14.5, color: "var(--text-2)", lineHeight: 1.5 }}>{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

/** Lime pill switch built from a visually-hidden checkbox for accessibility. */
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

/**
 * A euro number input for the flat delivery fee. Money, so it parses to a plain
 * number (2-decimal step); a blank / unparseable value reads as 0. Kept as a
 * controlled string so the operator can clear the box mid-edit without it snapping
 * to 0 on every keystroke.
 */
function EuroField({
  label,
  value,
  help,
  onChange,
}: {
  label: string;
  value: number;
  help: string;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState<string>(() => String(value ?? 0));

  // Re-sync when the saved value changes underneath us (load / save / refresh).
  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  return (
    <div className="field" style={{ marginBottom: 4 }}>
      <label>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={text}
        aria-label={label}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const n = Number.parseFloat(raw);
          onChange(Number.isFinite(n) && n >= 0 ? n : 0);
        }}
        className="mono"
        style={{ fontFamily: "var(--font-mono)", maxWidth: 160 }}
      />
      <p className="admin-set-field-help">{help}</p>
    </div>
  );
}

function BankField({
  label,
  value,
  placeholder,
  help,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  help: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field" style={{ marginBottom: 20 }}>
      <label>{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="mono"
        style={{ fontFamily: "var(--font-mono)" }}
      />
      <p className="admin-set-field-help">{help}</p>
    </div>
  );
}

/* ── Shared chrome (mirrors the content page) ──────────────────────────── */

function ActionErrorBar({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="mono"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        color: "var(--danger)",
        fontSize: 12.5,
        marginBottom: 24,
        padding: "12px 16px",
        borderRadius: "var(--r-md)",
        border: "1px solid rgba(255, 138, 120, 0.32)",
        background: "rgba(255, 138, 120, 0.06)",
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="mono"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--danger)",
          cursor: "pointer",
          fontSize: 12.5,
          padding: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

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
  if (err instanceof SettingsConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof SettingsApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: "Something went wrong loading settings.", config: false };
}
