"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listTemplates,
  uploadTemplate,
  activateTemplate,
  ContractApiError,
  ContractConfigError,
  ContractAuthError,
  type ContractTemplate,
} from "@/services/adminContractService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDate } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; templates: ContractTemplate[] }
  | { phase: "error"; message: string; config: boolean };

export default function AdminContractsPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  // Tracks which template ids currently have an in-flight activate call.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const templates = await listTemplates();
      setState({ phase: "ready", templates });
    } catch (err) {
      if (err instanceof ContractAuthError || (err instanceof ContractApiError && err.unauthorized)) {
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

  const onUploaded = useCallback((created: ContractTemplate) => {
    setBanner({ tone: "ok", text: `Uploaded "${created.name}".` });
    // Refresh the list so versions / active flags reflect the server.
    void load();
  }, [load]);

  async function activate(id: string) {
    if (state.phase !== "ready") return;
    setBanner(null);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await activateTemplate(id);
      setBanner({ tone: "ok", text: "Template activated." });
      await load();
    } catch (err) {
      if (err instanceof ContractApiError && err.unauthorized) {
        signOut();
      } else {
        const text =
          err instanceof ContractApiError || err instanceof ContractConfigError
            ? err.message
            : "Could not activate that template.";
        setBanner({ tone: "bad", text });
      }
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <div>
      {state.phase === "loading" ? (
        <Notice>Loading templates…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          {banner && <Banner tone={banner.tone} text={banner.text} />}

          <UploadCard
            onUploaded={onUploaded}
            onError={(text) => setBanner({ tone: "bad", text })}
            onAuthError={signOut}
          />

          <PlaceholderReference />

          <AdminSection title="Templates" count={state.templates.length}>
            <TemplatesTable
              templates={state.templates}
              pending={pending}
              onActivate={(id) => void activate(id)}
            />
          </AdminSection>
        </>
      )}
    </div>
  );
}

/** Map a non-auth thrown error onto an error load state (auth failures are
 *  handled by the caller, which signs out). */
function toErrorState(err: unknown): LoadState {
  if (err instanceof ContractConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof ContractApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: "Something went wrong loading templates.", config: false };
}

/* ── Upload ────────────────────────────────────────────────────────────── */

function UploadCard({
  onUploaded,
  onError,
  onAuthError,
}: {
  onUploaded: (created: ContractTemplate) => void;
  onError: (text: string) => void;
  onAuthError: () => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    try {
      const created = await uploadTemplate(file, name);
      setName("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      onUploaded(created);
    } catch (err) {
      if (err instanceof ContractApiError && err.unauthorized) {
        onAuthError();
      } else {
        const text =
          err instanceof ContractApiError || err instanceof ContractConfigError
            ? err.message
            : "Upload failed.";
        onError(text);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Upload a template</h2>
      </div>

      <article className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={onSubmit} style={{ padding: "24px 22px 22px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 20, lineHeight: 1.6 }}>
            Upload a <span className="mono">.docx</span> or <span className="mono">.pdf</span> rental
            agreement. Detected placeholders are listed once it&apos;s parsed. The newest upload of a
            template becomes a new version; activate the one you want used for new contracts.
          </p>

          <div className="field">
            <label htmlFor="tpl-name">Name (optional)</label>
            <input
              id="tpl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard rental agreement"
            />
          </div>

          <div className="field">
            <label htmlFor="tpl-file">Template file</label>
            <input
              id="tpl-file"
              ref={fileInput}
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 14 }}
            />
            {file && (
              <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 8 }}>
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={!file || busy}
            style={!file || busy ? { opacity: 0.5, cursor: "not-allowed", marginTop: 4 } : { marginTop: 4 }}
          >
            {busy ? "Uploading…" : "Upload template"}
          </button>
        </form>
      </article>
    </section>
  );
}

/* ── Supported placeholders reference ──────────────────────────────────── */

/**
 * The exact tokens the backend fills on generation (see
 * AdminContractEndpoints.BuildPlaceholderValuesAsync). Put any of these in the
 * Word template as `{{token}}` and they are replaced when a contract is
 * generated for a booking. Tokens whose data is not yet known (e.g. bike fields
 * before a unit is assigned) resolve to an empty string.
 */
const PLACEHOLDER_TOKENS: { token: string; desc: string }[] = [
  { token: "customerName", desc: "Customer full name" },
  { token: "customerFirstName", desc: "First name" },
  { token: "customerLastName", desc: "Last name" },
  { token: "customerEmail", desc: "Email address" },
  { token: "customerPhone", desc: "Phone number" },
  { token: "city", desc: "City name" },
  { token: "model", desc: "Bike model name" },
  { token: "plan", desc: "Plan term (e.g. 30 days)" },
  { token: "monthlyPrice", desc: "Monthly price" },
  { token: "dailyPrice", desc: "Daily price" },
  { token: "deposit", desc: "Deposit amount" },
  { token: "startDate", desc: "Rental start date" },
  { token: "plannedEndDate", desc: "Planned end date" },
  { token: "bikeSerial", desc: "Assigned bike serial number" },
  { token: "bikeInternalCode", desc: "Assigned bike internal code" },
  { token: "lockId", desc: "Lock ID" },
  { token: "batteryId", desc: "Battery ID" },
  { token: "contractDate", desc: "Date the contract was generated" },
  { token: "contractRef", desc: "Booking reference (id)" },
  { token: "accessories", desc: "Selected accessories, comma-separated" },
];

/**
 * Explains how customer/rental details get into a contract: you put `{{token}}`
 * tokens in the Word template and they are auto-filled on generation. Lists
 * every supported token as a copyable chip (click copies `{{token}}`).
 */
function PlaceholderReference() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(token: string) {
    const text = `{{${token}}}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(token);
      window.setTimeout(() => setCopied((c) => (c === token ? null : c)), 1200);
    } catch {
      /* clipboard blocked (e.g. insecure context) — the token text is still visible to copy by hand. */
    }
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Supported placeholders</h2>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {PLACEHOLDER_TOKENS.length} tokens
        </span>
      </div>

      <article className="card" style={{ padding: "22px 22px 8px" }}>
        <p style={{ color: "var(--text-2)", fontSize: 13.5, margin: "0 0 6px", lineHeight: 1.6 }}>
          Write any of these tokens in your Word template as{" "}
          <span className="mono" style={{ color: "var(--lime)" }}>
            {"{{token}}"}
          </span>{" "}
          and they are filled in automatically when a contract is generated for a booking.
        </p>

        <ol
          style={{
            color: "var(--text-muted)",
            fontSize: 12.5,
            lineHeight: 1.7,
            margin: "0 0 18px",
            paddingLeft: 18,
          }}
        >
          <li>
            Add tokens like{" "}
            <span className="mono" style={{ color: "var(--text-2)" }}>
              {"{{customerName}}"}
            </span>{" "}
            to your <span className="mono">.docx</span> template, then upload it above.
          </li>
          <li>Activate the template you want used for new contracts.</li>
          <li>
            On a booking (Bookings page → <b>Manage</b>) click <b>Generate contract</b> — the tokens are
            filled and the customer is emailed to sign.
          </li>
        </ol>

        <p style={{ color: "var(--text-dim)", fontSize: 11.5, margin: "0 0 10px" }}>
          Click a token to copy it as <span className="mono">{"{{token}}"}</span>. Tokens with no data yet
          (e.g. bike fields before a unit is assigned) are left blank.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PLACEHOLDER_TOKENS.map((p) => (
            <button
              key={p.token}
              type="button"
              title={`${p.desc} — click to copy {{${p.token}}}`}
              onClick={() => void copy(p.token)}
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.03em",
                padding: "5px 10px",
                marginBottom: 8,
                borderRadius: "var(--r-sm)",
                background: copied === p.token ? "rgba(216,255,54,0.12)" : "var(--surface)",
                border: `1px solid ${copied === p.token ? "rgba(216,255,54,0.4)" : "var(--border)"}`,
                color: copied === p.token ? "var(--lime)" : "var(--text-2)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 120ms, border-color 120ms, color 120ms",
              }}
            >
              {copied === p.token ? "copied ✓" : `{{${p.token}}}`}
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

/* ── Templates table ───────────────────────────────────────────────────── */

function TemplatesTable({
  templates,
  pending,
  onActivate,
}: {
  templates: ContractTemplate[];
  pending: Record<string, boolean>;
  onActivate: (id: string) => void;
}) {
  return (
    <AdminTable>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>File</Th>
          <Th>Version</Th>
          <Th>Active</Th>
          <Th>Placeholders</Th>
          <Th>Created</Th>
          <Th>Action</Th>
        </tr>
      </thead>
      <tbody>
        {templates.length === 0 ? (
          <EmptyRow colSpan={7} label="No templates uploaded yet." />
        ) : (
          templates.map((t) => (
            <tr key={t.id}>
              <Td>{t.name}</Td>
              <Td mono dim>
                <div>{t.fileName}</div>
                <div style={{ marginTop: 3 }}>{t.contentType}</div>
              </Td>
              <Td mono nowrap>
                v{t.version}
              </Td>
              <Td nowrap>
                {t.isActive ? (
                  <StatusPill value="active" tone="good" />
                ) : (
                  <StatusPill value="inactive" tone="neutral" />
                )}
              </Td>
              <Td dim>
                <Placeholders values={t.placeholders} />
              </Td>
              <Td mono nowrap>
                {fmtDate(t.createdAt)}
              </Td>
              <Td>
                {t.isActive ? (
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                    in use
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "8px 14px", fontSize: 12.5 }}
                    disabled={Boolean(pending[t.id])}
                    onClick={() => onActivate(t.id)}
                  >
                    {pending[t.id] ? "Activating…" : "Activate"}
                  </button>
                )}
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </AdminTable>
  );
}

/** Render placeholder tokens as small mono chips, or an em-dash when none. */
function Placeholders({ values }: { values: string[] }) {
  if (!values || values.length === 0) {
    return <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 360 }}>
      {values.map((p) => (
        <span
          key={p}
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.03em",
            padding: "3px 8px",
            borderRadius: "var(--r-sm)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
            whiteSpace: "nowrap",
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

/* ── Shared pieces (match the other admin pages) ───────────────────────── */

function Banner({ tone, text }: { tone: "ok" | "bad"; text: string }) {
  return (
    <div
      className="mono"
      role="status"
      style={{
        marginBottom: 18,
        padding: "11px 15px",
        borderRadius: "var(--r-sm)",
        fontSize: 12.5,
        color: tone === "ok" ? "var(--lime)" : "var(--danger)",
        background: tone === "ok" ? "rgba(216,255,54,0.08)" : "rgba(255,138,120,0.08)",
        border: `1px solid ${tone === "ok" ? "rgba(216,255,54,0.3)" : "rgba(255,138,120,0.32)"}`,
      }}
    >
      {text}
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
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 10 }}>
        {config ? "Not configured" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      {!config && (
        <button type="button" className="btn btn-primary" onClick={onRetry} style={{ padding: "12px 22px", fontSize: 14 }}>
          Try again
        </button>
      )}
    </div>
  );
}
