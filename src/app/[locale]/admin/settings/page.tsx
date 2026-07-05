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

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    setSavedAt(null);
    try {
      const data = await getSettings();
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
    setSavedAt(null);
    setActionError(null);
    setState((s) => (s.phase === "ready" ? { ...s, data: { ...s.data, [key]: value } } : s));
  }, []);

  const save = useCallback(async () => {
    if (busy || state.phase !== "ready") return;
    setBusy(true);
    setActionError(null);
    try {
      const saved = await updateSettings(state.data);
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

  return (
    <div style={{ maxWidth: 720 }}>
      <header style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 8px" }}>{t("title")}</h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
          These switches control what couriers see on the public site. Everything is hidden by default — turn
          a section on only when it is ready to ship.
        </p>
      </header>

      {actionError && <ActionErrorBar message={actionError} onDismiss={() => setActionError(null)} />}

      {/* ── Feature visibility ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <SectionHeading>{t("sections")}</SectionHeading>
        <div className="card" style={{ padding: "6px 20px" }}>
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
      </section>

      {/* ── Operations ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <SectionHeading>{t("opsHeading")}</SectionHeading>
        <div className="card" style={{ padding: "6px 20px" }}>
          <ToggleRow
            label={t("autoSendReturnReminders")}
            checked={data.autoSendReturnReminders}
            first
            onChange={(v) => setField("autoSendReturnReminders", v)}
          />
        </div>
      </section>

      {/* ── Bank requisites ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <SectionHeading>{t("bankHeading")}</SectionHeading>
        <div className="card" style={{ padding: "24px 20px" }}>
          {BANK_KEYS.map((key) => (
            <BankField
              key={key}
              label={t(key)}
              value={data[key]}
              placeholder={BANK_PLACEHOLDER[key]}
              onChange={(v) => setField(key, v)}
            />
          ))}
        </div>
      </section>

      {/* ── Save ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void save()}
          disabled={busy}
          style={{ padding: "12px 26px", fontSize: 14, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "…" : t("save")}
        </button>
        {savedAt !== null && (
          <span className="mono" style={{ fontSize: 12, color: "var(--lime)" }} role="status">
            {t("saved")}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        margin: "0 0 14px",
      }}
    >
      {children}
    </h2>
  );
}

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

function BankField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field" style={{ marginBottom: 18 }}>
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
