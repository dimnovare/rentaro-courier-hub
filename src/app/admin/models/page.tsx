"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  listModels,
  createModel,
  updateModel,
  deleteModel,
  uploadModelImage,
  modelImageUrl,
  ModelApiError,
  ModelConfigError,
  ModelAuthError,
  type AdminModel,
  type ModelInput,
} from "@/services/adminModelService";
import { AdminTable, Th, Td, EmptyRow } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";

/**
 * Valid BikeStatus values — wire values must match the backend enum/string
 * (Rentaro.Domain). The select tolerates an unknown current value so the UI
 * never silently drops an unexpected status.
 */
const MODEL_STATUSES = [
  { value: "in", label: "in stock" },
  { value: "low", label: "low stock" },
  { value: "wait", label: "waitlist" },
] as const;

/** Known badge variants (drive colour on the marketing site). */
const BADGE_VARIANTS = [
  { value: "popular", label: "popular" },
  { value: "cargo", label: "cargo" },
  { value: "light", label: "light" },
] as const;

function statusLabel(value: string): string {
  return MODEL_STATUSES.find((s) => s.value === value.toLowerCase())?.label ?? value;
}

/* ── Load-state machine (mirrors the fleet / maintenance pages) ─────────── */

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; models: AdminModel[] }
  | { phase: "no-auth" }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminModelsPage() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  // Which model code (or "__new__") currently has its editor form open.
  const [editing, setEditing] = useState<string | null>(null);
  // Per-code in-flight flag for row actions (reorder / toggle / delete / image).
  const [pending, setPending] = useState<Record<string, boolean>>({});
  // Per-code cache-buster bumped after an image upload so <img> re-fetches.
  const [imgVersion, setImgVersion] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    try {
      const models = await listModels();
      setState({ phase: "ready", models: sortModels(models) });
    } catch (err) {
      setState(toErrorState(err, "Something went wrong loading models."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Drops to the auth gate on 401, otherwise shows an inline action error. */
  const handleActionError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof ModelAuthError || (err instanceof ModelApiError && err.unauthorized)) {
      setState({ phase: "no-auth" });
    } else {
      setActionError(err instanceof ModelApiError ? err.message : fallback);
    }
  }, []);

  const setBusy = useCallback((code: string, busy: boolean) => {
    setPending((p) => {
      if (busy) return { ...p, [code]: true };
      const next = { ...p };
      delete next[code];
      return next;
    });
  }, []);

  /** Replace one model in place (after update / image upload). */
  const replaceModel = useCallback((updated: AdminModel) => {
    setState((s) =>
      s.phase === "ready"
        ? { ...s, models: sortModels(s.models.map((m) => (m.code === updated.code ? updated : m))) }
        : s,
    );
  }, []);

  async function saveModel(input: ModelInput, originalCode: string | null): Promise<boolean> {
    setActionError(null);
    try {
      if (originalCode === null) {
        const created = await createModel(input);
        setState((s) =>
          s.phase === "ready" ? { ...s, models: sortModels([...s.models, created]) } : s,
        );
      } else {
        const updated = await updateModel(originalCode, input);
        replaceModel(updated);
      }
      setEditing(null);
      return true;
    } catch (err) {
      handleActionError(err, "Could not save the model.");
      return false;
    }
  }

  async function removeModel(code: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete model "${code}"? This cannot be undone.`)
    ) {
      return;
    }
    setActionError(null);
    setBusy(code, true);
    try {
      await deleteModel(code);
      setState((s) =>
        s.phase === "ready" ? { ...s, models: s.models.filter((m) => m.code !== code) } : s,
      );
      if (editing === code) setEditing(null);
    } catch (err) {
      handleActionError(err, `Could not delete ${code}.`);
    } finally {
      setBusy(code, false);
    }
  }

  async function togglePopular(model: AdminModel) {
    setActionError(null);
    setBusy(model.code, true);
    try {
      const updated = await updateModel(model.code, { popular: !model.popular });
      replaceModel(updated);
    } catch (err) {
      handleActionError(err, `Could not update ${model.code}.`);
    } finally {
      setBusy(model.code, false);
    }
  }

  /** Swap a model's sortOrder with its neighbour and persist both. */
  async function reorder(code: string, direction: "up" | "down") {
    if (state.phase !== "ready") return;
    const models = state.models;
    const i = models.findIndex((m) => m.code === code);
    if (i < 0) return;
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= models.length) return;

    const a = models[i];
    const b = models[j];
    setActionError(null);
    setBusy(a.code, true);
    setBusy(b.code, true);
    try {
      // Persist swapped sort orders, then reflect both in state.
      const [ua, ub] = await Promise.all([
        updateModel(a.code, { sortOrder: b.sortOrder }),
        updateModel(b.code, { sortOrder: a.sortOrder }),
      ]);
      setState((s) =>
        s.phase === "ready"
          ? {
              ...s,
              models: sortModels(
                s.models.map((m) => (m.code === ua.code ? ua : m.code === ub.code ? ub : m)),
              ),
            }
          : s,
      );
    } catch (err) {
      handleActionError(err, "Could not reorder models.");
    } finally {
      setBusy(a.code, false);
      setBusy(b.code, false);
    }
  }

  async function uploadImage(code: string, file: File) {
    setActionError(null);
    setBusy(code, true);
    try {
      const updated = await uploadModelImage(code, file);
      replaceModel(updated);
      // Force the thumbnail (served at a stable URL) to re-fetch.
      setImgVersion((v) => ({ ...v, [code]: (v[code] ?? 0) + 1 }));
    } catch (err) {
      handleActionError(err, `Could not upload a photo for ${code}.`);
    } finally {
      setBusy(code, false);
    }
  }

  const usedCodes = useMemo(
    () => (state.phase === "ready" ? state.models.map((m) => m.code) : []),
    [state],
  );

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <PageHeader
        showActions={state.phase === "ready" || state.phase === "error"}
        onRefresh={() => void load()}
        onNew={state.phase === "ready" ? () => setEditing("__new__") : undefined}
      />

      {state.phase === "loading" ? (
        <Notice>Loading models…</Notice>
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
          {actionError && <InlineError message={actionError} />}

          {editing === "__new__" && (
            <ModelEditor
              key="__new__"
              mode="create"
              usedCodes={usedCodes}
              onCancel={() => setEditing(null)}
              onSave={(input) => saveModel(input, null)}
            />
          )}

          <section style={{ marginBottom: 24 }}>
            <SectionHead title="Models" count={state.models.length} />
            <AdminTable>
              <thead>
                <tr>
                  <Th>Photo</Th>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Popular</Th>
                  <Th>From / day</Th>
                  <Th>Order</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {state.models.length === 0 ? (
                  <EmptyRow colSpan={8} label="No models yet. Create one to get started." />
                ) : (
                  state.models.map((m, idx) => (
                    <ModelRow
                      key={m.code}
                      model={m}
                      isFirst={idx === 0}
                      isLast={idx === state.models.length - 1}
                      busy={Boolean(pending[m.code])}
                      isEditing={editing === m.code}
                      imgVersion={imgVersion[m.code]}
                      onEdit={() => setEditing(editing === m.code ? null : m.code)}
                      onDelete={() => void removeModel(m.code)}
                      onTogglePopular={() => void togglePopular(m)}
                      onReorder={(dir) => void reorder(m.code, dir)}
                      onUpload={(file) => void uploadImage(m.code, file)}
                      onCancelEdit={() => setEditing(null)}
                      onSave={(input) => saveModel(input, m.code)}
                      usedCodes={usedCodes}
                    />
                  ))
                )}
              </tbody>
            </AdminTable>
          </section>
        </>
      )}
    </main>
  );
}

/** Stable ordering: by sortOrder, then code, so swaps are deterministic. */
function sortModels(models: AdminModel[]): AdminModel[] {
  return [...models].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
  );
}

/* ── A single model row (+ its inline editor when expanded) ────────────── */

function ModelRow({
  model,
  isFirst,
  isLast,
  busy,
  isEditing,
  imgVersion,
  onEdit,
  onDelete,
  onTogglePopular,
  onReorder,
  onUpload,
  onCancelEdit,
  onSave,
  usedCodes,
}: {
  model: AdminModel;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  isEditing: boolean;
  imgVersion: number | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePopular: () => void;
  onReorder: (dir: "up" | "down") => void;
  onUpload: (file: File) => void;
  onCancelEdit: () => void;
  onSave: (input: ModelInput) => Promise<boolean>;
  usedCodes: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  }

  return (
    <>
      <tr>
        <Td>
          <Thumbnail model={model} version={imgVersion} />
        </Td>
        <Td mono nowrap>
          {model.code}
        </Td>
        <Td>
          <div style={{ color: "var(--text)", fontSize: 13 }}>{model.name || "—"}</div>
          {model.brand && (
            <div className="mono" style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>
              {model.brand}
            </div>
          )}
        </Td>
        <Td nowrap>
          <StatusPill value={model.status} />
        </Td>
        <Td nowrap>
          <button
            type="button"
            onClick={onTogglePopular}
            disabled={busy}
            aria-pressed={model.popular}
            title={model.popular ? "Featured as popular — click to unset" : "Mark as popular"}
            className="mono"
            style={pillButtonStyle(model.popular, busy)}
          >
            {model.popular ? "popular" : "—"}
          </button>
        </Td>
        <Td mono nowrap>
          {formatEur(model.fromDay)}
        </Td>
        <Td nowrap>
          <div style={{ display: "inline-flex", gap: 4 }}>
            <IconButton label="Move up" disabled={busy || isFirst} onClick={() => onReorder("up")}>
              ↑
            </IconButton>
            <IconButton
              label="Move down"
              disabled={busy || isLast}
              onClick={() => onReorder("down")}
            >
              ↓
            </IconButton>
          </div>
        </Td>
        <Td nowrap>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            <RowAction onClick={onEdit} active={isEditing}>
              {isEditing ? "Close" : "Edit"}
            </RowAction>
            <RowAction onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? "…" : model.hasUploadedImage ? "Replace photo" : "Upload photo"}
            </RowAction>
            <RowAction onClick={onDelete} disabled={busy} danger>
              Delete
            </RowAction>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={pickFile}
              style={{ display: "none" }}
              aria-label={`Upload a photo for ${model.code}`}
            />
          </div>
        </Td>
      </tr>

      {isEditing && (
        <tr>
          <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
            <div style={{ padding: "18px 14px 24px", background: "rgba(255,255,255,0.015)" }}>
              <ModelEditor
                mode="edit"
                model={model}
                usedCodes={usedCodes}
                onCancel={onCancelEdit}
                onSave={onSave}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Thumbnail({ model, version }: { model: AdminModel; version: number | undefined }) {
  // Prefer the uploaded image (served at a stable URL, cache-busted on replace);
  // otherwise fall back to the model's `img` field if it's an absolute URL we
  // can render. A local "/assets/..." path won't resolve from the admin host,
  // so we show a neutral placeholder for those.
  const uploaded = model.hasUploadedImage ? modelImageUrl(model.code, version ?? 0) : null;
  const fallback = /^https?:\/\//.test(model.img) ? model.img : null;
  const src = uploaded ?? fallback;

  const box: React.CSSProperties = {
    width: 56,
    height: 42,
    borderRadius: "var(--r-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  if (!src) {
    return (
      <div style={box} className="mono" aria-label="No photo">
        <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.05em" }}>
          no img
        </span>
      </div>
    );
  }

  // Plain <img> (not next/image): the source is a remote API URL not registered
  // with next.config, and admin is internal so optimisation isn't needed. The
  // project disables @next/next/no-img-element globally (see eslint.config.mjs).
  return (
    <div style={box}>
      <img
        src={src}
        alt={`${model.name || model.code} photo`}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

/* ── Editor form (shared by create + edit) ─────────────────────────────── */

interface EditorFields {
  code: string;
  brand: string;
  name: string;
  tagline: string;
  blurb: string;
  img: string;
  fromDay: string;
  status: string;
  availability: string;
  popular: boolean;
  sortOrder: string;
  badgeText: string;
  badgeVariant: string;
  pills: string; // comma-separated
  spec: string; // raw JSON
}

function ModelEditor({
  mode,
  model,
  usedCodes,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  model?: AdminModel;
  usedCodes: string[];
  onCancel: () => void;
  onSave: (input: ModelInput) => Promise<boolean>;
}) {
  const [f, setF] = useState<EditorFields>(() => initialFields(model));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof EditorFields>(key: K, value: EditorFields[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const codeTrimmed = f.code.trim();
  const codeOk = codeTrimmed.length > 0;
  // On create, reject a code that already exists.
  const codeDuplicate =
    mode === "create" && codeOk && usedCodes.includes(codeTrimmed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (!codeOk) {
      setFormError("A code is required.");
      return;
    }
    if (codeDuplicate) {
      setFormError(`A model with code "${codeTrimmed}" already exists.`);
      return;
    }

    // Parse the spec JSON (empty → null). Surface parse errors before sending.
    let spec: Record<string, unknown> | null = null;
    const specRaw = f.spec.trim();
    if (specRaw) {
      try {
        const parsed = JSON.parse(specRaw);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          setFormError("Spec must be a JSON object (e.g. { \"motorPowerW\": 750 }).");
          return;
        }
        spec = parsed as Record<string, unknown>;
      } catch {
        setFormError("Spec is not valid JSON. Fix it or clear the field.");
        return;
      }
    }

    const badgeText = f.badgeText.trim();
    const input: ModelInput = {
      brand: f.brand.trim(),
      name: f.name.trim(),
      tagline: f.tagline.trim(),
      blurb: f.blurb.trim(),
      img: f.img.trim(),
      fromDay: parseNum(f.fromDay),
      status: f.status,
      availability: parseIntOr0(f.availability),
      popular: f.popular,
      sortOrder: parseIntOr0(f.sortOrder),
      badge: badgeText ? { text: badgeText, variant: f.badgeVariant } : null,
      pills: parseCsv(f.pills),
      spec,
    };
    // Only send `code` on create (it's immutable on update — the URL carries it).
    if (mode === "create") input.code = codeTrimmed;

    setSubmitting(true);
    const ok = await onSave(input);
    setSubmitting(false);
    if (!ok) {
      // The page shows the API error banner; keep the form open for a retry.
    }
  }

  const title = mode === "create" ? "New model" : `Edit ${model?.code ?? ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{ padding: 22, marginBottom: mode === "create" ? 36 : 0 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h3 style={{ fontSize: 17, letterSpacing: "-0.01em" }}>{title}</h3>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
          {mode === "create" ? "create" : "update"}
        </span>
      </div>

      {/* Identity + pricing row */}
      <div style={gridStyle}>
        <Field label="Code" hint={mode === "edit" ? "read-only" : "unique id"}>
          <input
            value={f.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="e.g. engine-pro"
            aria-label="Code"
            readOnly={mode === "edit"}
            style={{ ...inputStyle, opacity: mode === "edit" ? 0.6 : 1 }}
          />
        </Field>
        <Field label="Brand">
          <input
            value={f.brand}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="e.g. ENGWE"
            aria-label="Brand"
            style={inputStyle}
          />
        </Field>
        <Field label="Name">
          <input
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. rentaro Engine Pro 2.0"
            aria-label="Name"
            style={inputStyle}
          />
        </Field>
        <Field label="Tagline">
          <input
            value={f.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="e.g. The delivery workhorse"
            aria-label="Tagline"
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Numbers + status row */}
      <div style={{ ...gridStyle, marginTop: 16 }}>
        <Field label="From / day (€)">
          <input
            value={f.fromDay}
            onChange={(e) => set("fromDay", e.target.value)}
            inputMode="decimal"
            placeholder="5.90"
            aria-label="From price per day"
            style={inputStyle}
          />
        </Field>
        <Field label="Availability">
          <input
            value={f.availability}
            onChange={(e) => set("availability", e.target.value)}
            inputMode="numeric"
            placeholder="0"
            aria-label="Availability"
            style={inputStyle}
          />
        </Field>
        <Field label="Status">
          <Select
            value={f.status}
            onChange={(v) => set("status", v)}
            options={MODEL_STATUSES}
            ariaLabel="Status"
          />
        </Field>
        <Field label="Sort order">
          <input
            value={f.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            inputMode="numeric"
            placeholder="0"
            aria-label="Sort order"
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Badge + popular row */}
      <div style={{ ...gridStyle, marginTop: 16 }}>
        <Field label="Badge text" hint="blank = no badge">
          <input
            value={f.badgeText}
            onChange={(e) => set("badgeText", e.target.value)}
            placeholder="e.g. Most popular"
            aria-label="Badge text"
            style={inputStyle}
          />
        </Field>
        <Field label="Badge variant">
          <Select
            value={f.badgeVariant}
            onChange={(v) => set("badgeVariant", v)}
            options={BADGE_VARIANTS}
            ariaLabel="Badge variant"
          />
        </Field>
        <Field label="Popular">
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              height: 38,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={f.popular}
              onChange={(e) => set("popular", e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--lime)" }}
            />
            <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
              Feature on homepage
            </span>
          </label>
        </Field>
        <Field label="Image path / URL" hint="used if no photo uploaded">
          <input
            value={f.img}
            onChange={(e) => set("img", e.target.value)}
            placeholder="/assets/models/…webp or https://…"
            aria-label="Image path or URL"
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Pills (comma-separated) */}
      <div style={{ marginTop: 16 }}>
        <Field label="Pills" hint="comma-separated marketing chips — no fixed km range">
          <input
            value={f.pills}
            onChange={(e) => set("pills", e.target.value)}
            placeholder="750W · 1200W peak, 75 Nm torque, Full suspension"
            aria-label="Pills"
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Blurb */}
      <div style={{ marginTop: 16 }}>
        <Field label="Blurb">
          <textarea
            value={f.blurb}
            onChange={(e) => set("blurb", e.target.value)}
            placeholder="Short paragraph shown on the card / detail page."
            aria-label="Blurb"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </Field>
      </div>

      {/* Spec (raw JSON object) */}
      <div style={{ marginTop: 16 }}>
        <Field label="Spec (JSON object)" hint="manufacturer sheet — blank for none">
          <textarea
            value={f.spec}
            onChange={(e) => set("spec", e.target.value)}
            placeholder='{ "motorPowerW": 750, "torqueNm": 75, "rangeKm": 110 }'
            aria-label="Spec JSON"
            rows={6}
            spellCheck={false}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.5,
              fontSize: 12,
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
            }}
          />
        </Field>
      </div>

      {formError && (
        <p
          className="mono"
          style={{ color: "var(--danger)", fontSize: 12, margin: "16px 0 0", lineHeight: 1.5 }}
        >
          {formError}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || !codeOk || codeDuplicate}
          style={{
            padding: "11px 22px",
            fontSize: 14,
            opacity: submitting || !codeOk || codeDuplicate ? 0.55 : 1,
            cursor: submitting || !codeOk || codeDuplicate ? "not-allowed" : "pointer",
          }}
        >
          {submitting
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create model"
              : "Save changes"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={submitting}
          style={{ padding: "11px 20px", fontSize: 14 }}
        >
          Cancel
        </button>
        {codeDuplicate && (
          <span className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
            That code is taken.
          </span>
        )}
      </div>
    </form>
  );
}

function initialFields(model?: AdminModel): EditorFields {
  return {
    code: model?.code ?? "",
    brand: model?.brand ?? "",
    name: model?.name ?? "",
    tagline: model?.tagline ?? "",
    blurb: model?.blurb ?? "",
    img: model?.img ?? "",
    fromDay: model?.fromDay != null ? String(model.fromDay) : "5.90",
    status: model?.status ?? MODEL_STATUSES[0].value,
    availability: model?.availability != null ? String(model.availability) : "0",
    popular: model?.popular ?? false,
    sortOrder: model?.sortOrder != null ? String(model.sortOrder) : "0",
    badgeText: model?.badge?.text ?? "",
    badgeVariant: model?.badge?.variant ?? BADGE_VARIANTS[0].value,
    pills: (model?.pills ?? []).join(", "),
    spec: model?.spec ? JSON.stringify(model.spec, null, 2) : "",
  };
}

/* ── Small parse / format helpers ──────────────────────────────────────── */

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNum(value: string): number {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseIntOr0(value: string): number {
  const n = parseInt(value.trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function formatEur(value: number): string {
  return `€${value.toFixed(2)}`;
}

/* ── Reusable inputs (mirrors the maintenance page) ────────────────────── */

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
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

function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  ariaLabel: string;
}) {
  // Include the current value even if it isn't a known option.
  const known = options.some((o) => o.value === value);
  const opts = known ? options : [{ value, label: statusLabel(value) }, ...options];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--r-sm)",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        letterSpacing: "0.02em",
        cursor: "pointer",
      }}
    >
      {opts.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "var(--panel)", color: "var(--text)" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── Row-level buttons ─────────────────────────────────────────────────── */

function RowAction({
  children,
  onClick,
  disabled = false,
  danger = false,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mono"
      style={{
        padding: "6px 11px",
        fontSize: 11.5,
        letterSpacing: "0.03em",
        borderRadius: "var(--r-sm)",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active ? "rgba(216,255,54,0.1)" : "var(--bg-2)",
        border: `1px solid ${
          danger ? "rgba(255,138,120,0.32)" : active ? "rgba(216,255,54,0.3)" : "var(--border)"
        }`,
        color: danger ? "var(--danger)" : active ? "var(--lime)" : "var(--text-2)",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="mono"
      style={{
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--r-sm)",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  );
}

function pillButtonStyle(on: boolean, busy: boolean): React.CSSProperties {
  return {
    fontSize: 10.5,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: "var(--r-full)",
    cursor: busy ? "wait" : "pointer",
    color: on ? "var(--lime)" : "var(--text-dim)",
    background: on ? "rgba(216, 255, 54, 0.12)" : "var(--surface)",
    border: `1px solid ${on ? "rgba(216, 255, 54, 0.3)" : "var(--border)"}`,
    opacity: busy ? 0.6 : 1,
    whiteSpace: "nowrap",
  };
}

/* ── Shared scaffold (mirrors the fleet / maintenance pages) ───────────── */

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
      {typeof count === "number" && (
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {count} {count === 1 ? "model" : "models"}
        </span>
      )}
    </div>
  );
}

function PageHeader({
  showActions,
  onRefresh,
  onNew,
}: {
  showActions: boolean;
  onRefresh: () => void;
  onNew?: () => void;
}) {
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
          <span style={{ color: "var(--lime)" }}>models</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Catalogue, specs, photos &amp; availability
        </p>
        <Link
          href="/admin"
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11.5,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginTop: 12,
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>→</span> Admin home
        </Link>
      </div>
      {showActions && (
        <div style={{ display: "flex", gap: 10 }}>
          {onNew && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "11px 18px", fontSize: 13.5 }}
              onClick={onNew}
            >
              + New model
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "11px 18px", fontSize: 13.5 }}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      )}
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

function InlineError({ message }: { message: string }) {
  return (
    <div
      className="mono"
      style={{
        color: "var(--danger)",
        fontSize: 12.5,
        marginBottom: 20,
        padding: "12px 16px",
        borderRadius: "var(--r-md)",
        border: "1px solid rgba(255, 138, 120, 0.32)",
        background: "rgba(255, 138, 120, 0.06)",
      }}
    >
      {message}
    </div>
  );
}

function AuthGate() {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in required</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        You need an admin session to manage models. Sign in on the admin home, then return here.
      </p>
      <Link
        href="/admin"
        className="btn btn-primary"
        style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}
      >
        Sign in on the admin home
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
        {config ? "Not configured" : unauthorized ? "Unauthorized" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {unauthorized ? (
          <Link
            href="/admin"
            className="btn btn-primary"
            style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}
          >
            Sign in again
          </Link>
        ) : config ? null : (
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
    </div>
  );
}

/* ── Error mapping ─────────────────────────────────────────────────────── */

function toErrorState(err: unknown, fallback: string): LoadState {
  if (err instanceof ModelAuthError) {
    return { phase: "no-auth" };
  }
  if (err instanceof ModelConfigError) {
    return { phase: "error", message: err.message, unauthorized: false, config: true };
  }
  if (err instanceof ModelApiError) {
    return { phase: "error", message: err.message, unauthorized: err.unauthorized, config: false };
  }
  return { phase: "error", message: fallback, unauthorized: false, config: false };
}
