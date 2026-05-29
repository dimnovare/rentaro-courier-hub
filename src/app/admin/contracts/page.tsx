"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; templates: ContractTemplate[] }
  | { phase: "no-auth" }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminContractsPage() {
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
      setState(toErrorState(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        setState({ phase: "no-auth" });
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
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <Header onRefresh={state.phase === "ready" ? () => void load() : undefined} />

      {state.phase === "loading" ? (
        <Notice>Loading templates…</Notice>
      ) : state.phase === "no-auth" ? (
        <AuthGate />
      ) : state.phase === "error" ? (
        <ErrorPanel
          message={state.message}
          unauthorized={state.unauthorized}
          config={state.config}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {banner && <Banner tone={banner.tone} text={banner.text} />}

          <UploadCard
            onUploaded={onUploaded}
            onError={(text) => setBanner({ tone: "bad", text })}
            onAuthError={() => setState({ phase: "no-auth" })}
          />

          <AdminSection title="Templates" count={state.templates.length}>
            <TemplatesTable
              templates={state.templates}
              pending={pending}
              onActivate={(id) => void activate(id)}
            />
          </AdminSection>
        </>
      )}
    </main>
  );
}

/** Map a thrown error onto an error/no-auth load state. */
function toErrorState(err: unknown): LoadState {
  if (err instanceof ContractAuthError) {
    return { phase: "no-auth" };
  }
  if (err instanceof ContractConfigError) {
    return { phase: "error", message: err.message, unauthorized: false, config: true };
  }
  if (err instanceof ContractApiError) {
    if (err.unauthorized) return { phase: "no-auth" };
    return { phase: "error", message: err.message, unauthorized: err.unauthorized, config: false };
  }
  return { phase: "error", message: "Something went wrong loading templates.", unauthorized: false, config: false };
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

function Header({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        paddingBottom: 24,
        marginBottom: 32,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <h1 style={{ fontSize: 26, letterSpacing: "-0.03em" }}>
          rentaro <span style={{ color: "var(--text-dim)" }}>·</span>{" "}
          <span style={{ color: "var(--lime)" }}>contracts</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Contract templates &amp; placeholders
        </p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link href="/admin" className="btn btn-ghost" style={{ padding: "11px 18px", fontSize: 13.5 }}>
          Dashboard
        </Link>
        {onRefresh && (
          <button type="button" className="btn btn-ghost" style={{ padding: "11px 18px", fontSize: 13.5 }} onClick={onRefresh}>
            Refresh
          </button>
        )}
      </div>
    </header>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

function AuthGate() {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in required</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        Sign in on the admin home to manage contract templates.
      </p>
      <Link href="/admin" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}>
        Go to admin home
      </Link>
    </div>
  );
}

function ErrorPanel({
  message,
  unauthorized,
  config,
  onRetry,
}: {
  message: string;
  unauthorized: boolean;
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
        {config ? "Not configured" : unauthorized ? "Unauthorized" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {unauthorized ? (
          <Link href="/admin" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}>
            Sign in again
          </Link>
        ) : config ? null : (
          <button type="button" className="btn btn-primary" onClick={onRetry} style={{ padding: "12px 22px", fontSize: 14 }}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
