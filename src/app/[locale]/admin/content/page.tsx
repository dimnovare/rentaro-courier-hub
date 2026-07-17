"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAccessories,
  createAccessory,
  updateAccessory,
  deleteAccessory,
  getCities,
  createCity,
  updateCity,
  deleteCity,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getMarquee,
  updateMarquee,
  CatalogApiError,
  CatalogConfigError,
  CatalogAuthError,
  type AdminAccessory,
  type AdminCity,
  type AdminFaq,
  type AccessoryInput,
  type CityInput,
  type FaqInput,
  type CityStatusValue,
  type LocalizedText,
} from "@/services/adminCatalogService";
import { Link } from "@/i18n/navigation";
import type { ColorOption } from "@/types/bike";
import type { LocalizedStrings } from "@/types/pricing";
import { AdminTable, Th, Td, EmptyRow } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
import { ColorListEditor } from "@/components/admin/ColorListEditor";
import {
  LocalizedListEditor,
  ADMIN_LOCALES,
  toLocalizedStrings,
  type AdminLocale,
} from "@/components/admin/LocalizedListEditor";
import { Drawer } from "@/components/admin/Drawer";
import { DrawerFooter } from "@/components/admin/DrawerFooter";
import { PageHeader } from "@/components/admin/PageHeader";
import { Notice, InlineError, ErrorPanel, ActionErrorBar } from "@/components/admin/Feedback";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { confirmAction } from "@/lib/confirm";

/** City status options — must match the backend CityStatus enum (lowercased). */
const CITY_STATUSES: readonly CityStatusValue[] = ["available", "limited", "soon"];

/* ── Page data + load state ────────────────────────────────────────────── */

interface ContentData {
  accessories: AdminAccessory[];
  cities: AdminCity[];
  faqs: AdminFaq[];
  /** Hero marquee items per language (locale → string[]). */
  marquee: LocalizedStrings;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: ContentData }
  | { phase: "error"; message: string; config: boolean };

export default function AdminContentPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Page-level banner for any write error (each section also clears it on retry).
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    // Silent reloads (topbar Refresh) keep the current sections on screen — no
    // full-page blank, and any open editor drawer stays mounted.
    const silent = Boolean(opts?.silent);
    if (!silent) setState({ phase: "loading" });
    setActionError(null);
    try {
      const [accessories, cities, faqs, marquee] = await Promise.all([
        getAccessories(),
        getCities(),
        getFaqs(),
        getMarquee(),
      ]);
      setState({ phase: "ready", data: { accessories, cities, faqs, marquee } });
    } catch (err) {
      // Auth failure → drop to the shell's sign-in; otherwise show an error.
      if (err instanceof CatalogAuthError || (err instanceof CatalogApiError && err.unauthorized)) {
        signOut();
      } else if (!silent) {
        // A failed SILENT refresh keeps the (still-valid) data on screen.
        setState(toErrorState(err));
      }
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const silentReload = useCallback(() => void load({ silent: true }), [load]);
  useAdminRefresh(silentReload);

  /**
   * Shared error handler for write actions. Re-gates on auth (signs out), and
   * otherwise returns a human message for the caller to surface — both in the
   * page banner and inside the open drawer.
   */
  const handleActionError = useCallback(
    (err: unknown, fallback: string): string => {
      if (err instanceof CatalogAuthError || (err instanceof CatalogApiError && err.unauthorized)) {
        signOut();
        return fallback;
      }
      const message = err instanceof CatalogApiError ? err.message : fallback;
      setActionError(message);
      return message;
    },
    [signOut],
  );

  /* Optimistic local-state patchers (called after a successful API write). */

  const patch = useCallback((fn: (d: ContentData) => ContentData) => {
    setState((s) => (s.phase === "ready" ? { ...s, data: fn(s.data) } : s));
  }, []);

  return (
    <div>
      {state.phase === "loading" ? (
        <Notice>Loading content…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          <PageHeader
            title="Content"
            subtitle="Accessories, cities, hero marquee and FAQ shown on the public site."
          />

          {/* Sticky quick-nav: every section is one click away on this long page. */}
          <nav className="admin-quicknav" aria-label="Jump to a content section">
            <a href="#accessories">Accessories</a>
            <a href="#cities">Cities</a>
            <a href="#marquee">Marquee</a>
            <a href="#faq">FAQ</a>
          </nav>

          {actionError && <ActionErrorBar message={actionError} onDismiss={() => setActionError(null)} />}

          <AccessoriesSection
            rows={state.data.accessories}
            onError={handleActionError}
            clearError={() => setActionError(null)}
            patch={patch}
          />

          <CitiesSection
            rows={state.data.cities}
            onError={handleActionError}
            clearError={() => setActionError(null)}
            patch={patch}
          />

          {/* Pricing plans used to be edited here; they now live ONLY in Pricelist. */}
          <PlansMovedNote />

          <MarqueeSection
            marquee={state.data.marquee}
            onError={handleActionError}
            clearError={() => setActionError(null)}
            patch={patch}
          />

          <FaqSection
            rows={state.data.faqs}
            onError={handleActionError}
            clearError={() => setActionError(null)}
            patch={patch}
          />
        </>
      )}
    </div>
  );
}

/* ── Shared section-prop shape ─────────────────────────────────────────── */

interface SectionProps<T> {
  rows: T[];
  /** Surfaces the write error in the page banner and returns the message for in-drawer display. */
  onError: (err: unknown, fallback: string) => string;
  clearError: () => void;
  patch: (fn: (d: ContentData) => ContentData) => void;
}

/**
 * Per-section editor state. A discriminated union so the drawer knows whether
 * it is creating (no record id yet) or editing an existing row. `Id` is the
 * row-key type — string for accessories/cities, number for FAQ.
 */
type Editor<Id> = { mode: "create" } | { mode: "edit"; id: Id };

/* ════════════════════════════════════════════════════════════════════════
   Accessories — id, name, price, icon, sortOrder. Create + edit + delete.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_ACCESSORY: AccessoryInput = {
  id: "",
  name: "",
  nameLocalized: {},
  description: null,
  descriptionLocalized: {},
  price: "",
  price30: null,
  price6mo: null,
  price12mo: null,
  isBundle: false,
  componentIds: [],
  icon: "",
  sortOrder: 0,
  colors: [],
};

/** The three price tiers, in display order, paired with their draft field + plan code. */
const ACCESSORY_TIERS = [
  { key: "price30", label: "30-day", plan: "p30" },
  { key: "price6mo", label: "6-month", plan: "p180" },
  { key: "price12mo", label: "12-month", plan: "p365" },
] as const;

function AccessoriesSection({ rows, onError, clearError, patch }: SectionProps<AdminAccessory>) {
  const [editor, setEditor] = useState<Editor<string> | null>(null);
  const [draft, setDraft] = useState<AccessoryInput>(EMPTY_ACCESSORY);
  // Snapshot of the draft the drawer opened with — drives the dirty guard.
  const [baseline, setBaseline] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    clearError();
    setFormError(null);
    setDraft(EMPTY_ACCESSORY);
    setBaseline(JSON.stringify(EMPTY_ACCESSORY));
    setEditor({ mode: "create" });
  }

  function openEdit(row: AdminAccessory) {
    clearError();
    setFormError(null);
    // Clone every nested value so editing the draft never mutates the loaded row.
    const next: AccessoryInput = {
      ...row,
      nameLocalized: { ...(row.nameLocalized ?? {}) },
      descriptionLocalized: { ...(row.descriptionLocalized ?? {}) },
      componentIds: [...(row.componentIds ?? [])],
      colors: (row.colors ?? []).map((c) => ({ ...c })),
    };
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setEditor({ mode: "edit", id: row.id });
  }

  function close() {
    setEditor(null);
    setFormError(null);
  }

  async function submit() {
    if (busy || !editor) return;

    // Client-side validation (mirrors the backend rules; fail fast before the round-trip).
    const name = draft.name.trim();
    if (!name) {
      setFormError("Name is required (the EN base is the fallback for every language).");
      return;
    }
    for (const tier of ACCESSORY_TIERS) {
      const v = draft[tier.key];
      if (v != null && (Number.isNaN(v) || v < 0)) {
        setFormError(`The ${tier.label} price cannot be negative.`);
        return;
      }
    }
    const componentIds = draft.isBundle ? draft.componentIds : [];
    if (draft.isBundle && componentIds.length === 0) {
      setFormError("A bundle needs at least one component accessory.");
      return;
    }

    clearError();
    setFormError(null);
    setBusy(true);
    try {
      const body: AccessoryInput = {
        ...draft,
        name,
        description: (draft.description ?? "").trim() || null,
        nameLocalized: cleanLocalizedText(draft.nameLocalized),
        descriptionLocalized: cleanLocalizedText(draft.descriptionLocalized),
        componentIds,
        colors: cleanColors(draft.colors ?? []),
      };
      if (editor.mode === "create") {
        const saved = await createAccessory(body);
        patch((d) => ({ ...d, accessories: [...d.accessories, saved] }));
      } else {
        const saved = await updateAccessory(editor.id, body);
        patch((d) => ({ ...d, accessories: d.accessories.map((a) => (a.id === editor.id ? saved : a)) }));
      }
      close();
    } catch (err) {
      setFormError(
        onError(err, editor.mode === "create" ? "Could not create the accessory." : "Could not save the accessory."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !editor || editor.mode !== "edit") return;
    const id = editor.id;
    if (!confirmAction(`Delete accessory "${id}"?`, { finality: "irreversible" })) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      await deleteAccessory(id);
      patch((d) => ({ ...d, accessories: d.accessories.filter((a) => a.id !== id) }));
      close();
    } catch (err) {
      // A 409 here means the accessory is a component of some bundle; the server
      // message (with the bundle name) is surfaced inline by onError.
      setFormError(onError(err, "Could not delete the accessory."));
    } finally {
      setBusy(false);
    }
  }

  const isEdit = editor?.mode === "edit";
  const dirty = editor !== null && JSON.stringify(draft) !== baseline;
  // Non-bundle accessories are the only valid bundle components; a bundle can
  // never contain itself or another bundle.
  const componentChoices = rows.filter((r) => !r.isBundle && r.id !== draft.id);
  const legacyAmount = parseLeadingAmount(draft.price);

  return (
    <Section id="accessories" title="Accessories" count={rows.length}>
      <AdminTable>
        <thead>
          <tr>
            <Th>Id</Th>
            <Th>Name</Th>
            <Th>From / 30d</Th>
            <Th>Type</Th>
            <Th>Icon</Th>
            <Th>Sort</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow
              colSpan={7}
              label="No accessories yet — use “+ Add accessory” below to create the first one."
            />
          )}

          {rows.map((row) => (
            <tr key={row.id}>
              <Td mono nowrap>{row.id}</Td>
              <Td>
                <span>{row.name}</span>
                <TranslationCount map={row.nameLocalized} />
              </Td>
              <Td mono dim nowrap>{fromPriceLabel(row)}</Td>
              <Td nowrap>
                {row.isBundle ? (
                  <StatusPill value="Bundle" tone="info" />
                ) : bundleOf(rows, row.id) ? (
                  // Component of a bundle: kept here for editing, but absorbed
                  // into its bundle on the public site (not separately listed).
                  <span
                    className="mono"
                    style={{ color: "var(--text-dim)", fontSize: 11.5 }}
                    title={`Part of "${bundleOf(rows, row.id)!.name}" — hidden from the customer-facing list; customers select the bundle instead.`}
                  >
                    in {bundleOf(rows, row.id)!.id}
                  </span>
                ) : (
                  <span className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>—</span>
                )}
              </Td>
              <Td mono dim>{row.icon}</Td>
              <Td mono dim>{row.sortOrder}</Td>
              <Td nowrap><RowEdit busy={busy} onEdit={() => openEdit(row)} /></Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AddButton label="Add accessory" onClick={openCreate} />

      <Drawer
        open={editor !== null}
        onClose={close}
        dirty={dirty}
        title={isEdit ? "Edit accessory" : "New accessory"}
        subtitle={isEdit && editor ? editor.id : undefined}
        footer={
          <DrawerFooter
            busy={busy}
            onPrimary={() => void submit()}
            onCancel={close}
            primaryLabel={isEdit ? "Save" : "Create"}
            danger={isEdit ? { label: "Delete", onClick: () => void remove() } : undefined}
          />
        }
      >
        <FieldText
          label="Id"
          value={draft.id}
          onChange={(v) => setDraft({ ...draft, id: v })}
          mono
          placeholder="battery"
          readOnly={isEdit}
          hint={isEdit ? "Id is fixed once created." : "Lowercase key, unique across accessories."}
        />

        <GroupLabel hint="EN is the base and required. Other languages fall back to EN when left blank — exactly like the marquee and plan perks.">
          Name &amp; description
        </GroupLabel>
        <LocalizedTextEditor
          baseName={draft.name}
          baseDescription={draft.description ?? ""}
          nameLocalized={draft.nameLocalized}
          descriptionLocalized={draft.descriptionLocalized}
          onNameChange={(locale, v) =>
            setDraft((d) =>
              locale === "en"
                ? { ...d, name: v }
                : { ...d, nameLocalized: { ...d.nameLocalized, [locale]: v } },
            )
          }
          onDescriptionChange={(locale, v) =>
            setDraft((d) =>
              locale === "en"
                ? { ...d, description: v }
                : { ...d, descriptionLocalized: { ...d.descriptionLocalized, [locale]: v } },
            )
          }
        />

        <GroupLabel hint="Price per 30-day period, per plan. Leave a tier blank to fall back to the legacy display price below.">
          Pricing
        </GroupLabel>
        {ACCESSORY_TIERS.map((tier) => (
          <FieldMoney
            key={tier.key}
            label={`${tier.label} (${tier.plan})`}
            value={draft[tier.key]}
            onChange={(v) => setDraft({ ...draft, [tier.key]: v })}
            preview={tierPreview(draft[tier.key], legacyAmount)}
          />
        ))}
        <FieldText
          label="Legacy display price"
          value={draft.price}
          onChange={(v) => setDraft({ ...draft, price: v })}
          mono
          placeholder="€29 / 30d"
          hint="Fallback for any blank tier above. Kept for backward compatibility."
        />

        <GroupLabel>Bundle</GroupLabel>
        <FieldCheckbox
          label="This accessory is a bundle"
          checked={draft.isBundle}
          onChange={(checked) => setDraft({ ...draft, isBundle: checked })}
          hint="A bundle is billed at its own tier price above. Its components are shown to the customer for information only — their prices are never added up."
        />
        {draft.isBundle && (
          <div className="field">
            <label>Components</label>
            {componentChoices.length === 0 ? (
              <p
                className="mono"
                style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "var(--text-dim)" }}
              >
                No non-bundle accessories to include yet. Create some first — a bundle cannot contain another bundle.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {componentChoices.map((choice) => {
                  const on = draft.componentIds.includes(choice.id);
                  return (
                    <ComponentCheckbox
                      key={choice.id}
                      id={choice.id}
                      name={choice.name}
                      checked={on}
                      onToggle={(next) =>
                        setDraft((d) => ({
                          ...d,
                          componentIds: next
                            ? [...d.componentIds, choice.id]
                            : d.componentIds.filter((c) => c !== choice.id),
                        }))
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        <GroupLabel>Appearance</GroupLabel>
        <div className="field-row">
          <FieldText
            label="Icon"
            value={draft.icon}
            onChange={(v) => setDraft({ ...draft, icon: v })}
            mono
            placeholder="battery"
          />
          <FieldNumber
            label="Sort order"
            value={draft.sortOrder}
            onChange={(v) => setDraft({ ...draft, sortOrder: v })}
          />
        </div>
        <div className="field">
          <label>Colours</label>
          <ColorListEditor
            value={draft.colors ?? []}
            onChange={(next) => setDraft({ ...draft, colors: next })}
          />
        </div>
        {formError && <InlineError message={formError} />}
      </Drawer>
    </Section>
  );
}

/* ── Accessory editor sub-pieces ───────────────────────────────────────── */

/**
 * Compact per-language editor for an accessory's name + description. Mirrors the
 * LocalizedListEditor/marquee pattern (EN is the base/fallback), but as a tabbed
 * switcher so the drawer stays short: pick a language, edit that language's name
 * and description. The EN tab edits the required base fields; every other tab
 * edits the optional override map. A dot on a tab marks a filled name.
 */
function LocalizedTextEditor({
  baseName,
  baseDescription,
  nameLocalized,
  descriptionLocalized,
  onNameChange,
  onDescriptionChange,
}: {
  baseName: string;
  baseDescription: string;
  nameLocalized: LocalizedText;
  descriptionLocalized: LocalizedText;
  onNameChange: (locale: AdminLocale, value: string) => void;
  onDescriptionChange: (locale: AdminLocale, value: string) => void;
}) {
  const [active, setActive] = useState<AdminLocale>("en");
  const isEn = active === "en";
  const name = isEn ? baseName : nameLocalized[active] ?? "";
  const description = isEn ? baseDescription : descriptionLocalized[active] ?? "";
  const fallbackHint = isEn
    ? undefined
    : baseName.trim()
      ? `Blank falls back to EN: “${baseName.trim()}”`
      : "Set the EN base name first.";

  return (
    <div className="field">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }} role="tablist" aria-label="Language">
        {ADMIN_LOCALES.map((locale) => {
          const filled =
            locale === "en" ? baseName.trim().length > 0 : (nameLocalized[locale] ?? "").trim().length > 0;
          const selected = locale === active;
          return (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(locale)}
              className="mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--r-full)",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: selected ? "var(--lime)" : "var(--surface)",
                color: selected ? "var(--lime-ink)" : "var(--text-2)",
                border: `1px solid ${selected ? "var(--lime)" : "var(--border-strong)"}`,
                fontWeight: selected ? 600 : 500,
              }}
            >
              {locale.toUpperCase()}
              {locale !== "en" && (
                <span
                  aria-hidden
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "var(--r-full)",
                    background: filled
                      ? selected
                        ? "var(--lime-ink)"
                        : "var(--lime)"
                      : "transparent",
                    border: filled ? "none" : "1px solid var(--border-strong)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <FieldText
        label={isEn ? "Name (EN base — required)" : `Name (${active.toUpperCase()})`}
        value={name}
        onChange={(v) => onNameChange(active, v)}
        placeholder={isEn ? "Extra battery" : fallbackHint}
        hint={fallbackHint}
      />
      <FieldTextArea
        label={isEn ? "Description (EN base)" : `Description (${active.toUpperCase()})`}
        value={description}
        onChange={(v) => onDescriptionChange(active, v)}
        rows={3}
        placeholder={isEn ? "Spare battery for long delivery shifts." : "Optional translation"}
      />
    </div>
  );
}

/** One checkbox row in the bundle component picker. */
function ComponentCheckbox({
  id,
  name,
  checked,
  onToggle,
}: {
  id: string;
  name: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: "var(--r-sm)",
        background: checked ? "rgba(216, 255, 54, 0.06)" : "var(--bg-2)",
        border: `1px solid ${checked ? "rgba(216, 255, 54, 0.3)" : "var(--border)"}`,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "var(--lime)", cursor: "pointer" }}
      />
      <span style={{ fontSize: 13, color: "var(--text)" }}>{name}</span>
      <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
        {id}
      </span>
    </label>
  );
}

/** Small "+N translated" hint shown after a name in the accessories list. */
function TranslationCount({ map }: { map: LocalizedText | undefined }) {
  const n = Object.values(map ?? {}).filter((v) => (v ?? "").trim().length > 0).length;
  if (n === 0) return null;
  return (
    <span className="mono" style={{ marginLeft: 8, fontSize: 10.5, color: "var(--text-dim)" }}>
      +{n} lang
    </span>
  );
}

/** Optional €/30d numeric field: empty string ↔ null so a blank tier stays a fallback. */
function FieldMoney({
  label,
  value,
  onChange,
  preview,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  preview?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value ?? ""}
        placeholder="— blank = legacy"
        aria-label={label}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className="mono"
        style={{ fontFamily: "var(--font-mono)" }}
      />
      {preview && (
        <p className="mono" style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
          {preview}
        </p>
      )}
    </div>
  );
}

/** Checkbox field styled like the other drawer fields (label chrome + hint). */
function FieldCheckbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textTransform: "none" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--lime)", cursor: "pointer" }}
        />
        <span style={{ fontSize: 13, color: "var(--text)", letterSpacing: "0.01em" }}>{label}</span>
      </label>
      {hint && (
        <p className="mono" style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Grouping subheading inside the drawer — separates the editor into scannable blocks. */
function GroupLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ margin: "24px 0 14px", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-2)",
        }}
      >
        {children}
      </span>
      {hint && (
        <p className="mono" style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Cities — id, name, country, available, pickup, status, sortOrder.
   Create + edit + delete.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_CITY: CityInput = {
  id: "",
  name: "",
  country: "",
  available: 0,
  pickup: "",
  status: "available",
  sortOrder: 0,
};

function CitiesSection({ rows, onError, clearError, patch }: SectionProps<AdminCity>) {
  const [editor, setEditor] = useState<Editor<string> | null>(null);
  const [draft, setDraft] = useState<CityInput>(EMPTY_CITY);
  // Snapshot of the draft the drawer opened with — drives the dirty guard.
  const [baseline, setBaseline] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    clearError();
    setFormError(null);
    setDraft(EMPTY_CITY);
    setBaseline(JSON.stringify(EMPTY_CITY));
    setEditor({ mode: "create" });
  }

  function openEdit(row: AdminCity) {
    clearError();
    setFormError(null);
    const next: CityInput = { ...row };
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setEditor({ mode: "edit", id: row.id });
  }

  function close() {
    setEditor(null);
    setFormError(null);
  }

  async function submit() {
    if (busy || !editor) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      // `available` is derived server-side from the real BikeUnit count for every
      // read (list + the create/update responses), so whatever we send here is not
      // what gets displayed. Pass the draft through unchanged — never fabricate a 0,
      // which previously zeroed the stored column on every edit.
      const body: CityInput = { ...draft };
      if (editor.mode === "create") {
        const saved = await createCity(body);
        patch((d) => ({ ...d, cities: [...d.cities, saved] }));
      } else {
        const saved = await updateCity(editor.id, body);
        patch((d) => ({ ...d, cities: d.cities.map((c) => (c.id === editor.id ? saved : c)) }));
      }
      close();
    } catch (err) {
      setFormError(
        onError(err, editor.mode === "create" ? "Could not create the city." : "Could not save the city."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !editor || editor.mode !== "edit") return;
    const id = editor.id;
    if (!confirmAction(`Delete city "${id}"?`, { finality: "irreversible" })) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      await deleteCity(id);
      patch((d) => ({ ...d, cities: d.cities.filter((c) => c.id !== id) }));
      close();
    } catch (err) {
      setFormError(onError(err, "Could not delete the city."));
    } finally {
      setBusy(false);
    }
  }

  const isEdit = editor?.mode === "edit";
  const dirty = editor !== null && JSON.stringify(draft) !== baseline;

  return (
    <Section id="cities" title="Cities" count={rows.length}>
      <AdminTable>
        <thead>
          <tr>
            <Th>Id</Th>
            <Th>Name</Th>
            <Th>Country</Th>
            <Th>Available</Th>
            <Th>Pickup</Th>
            <Th>Status</Th>
            <Th>Sort</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow
              colSpan={8}
              label="No cities yet — use “+ Add city” below to create the first one."
            />
          )}

          {rows.map((row) => (
            <tr key={row.id}>
              <Td mono nowrap>{row.id}</Td>
              <Td>{row.name}</Td>
              <Td dim>{row.country}</Td>
              <Td mono dim>{row.available}</Td>
              <Td dim>{row.pickup}</Td>
              <Td nowrap><StatusPill value={row.status} /></Td>
              <Td mono dim>{row.sortOrder}</Td>
              <Td nowrap><RowEdit busy={busy} onEdit={() => openEdit(row)} /></Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AddButton label="Add city" onClick={openCreate} />

      <Drawer
        open={editor !== null}
        onClose={close}
        dirty={dirty}
        title={isEdit ? "Edit city" : "New city"}
        subtitle={isEdit && editor ? editor.id : undefined}
        footer={
          <DrawerFooter
            busy={busy}
            onPrimary={() => void submit()}
            onCancel={close}
            primaryLabel={isEdit ? "Save" : "Create"}
            danger={isEdit ? { label: "Delete", onClick: () => void remove() } : undefined}
          />
        }
      >
        <FieldText
          label="Id"
          value={draft.id}
          onChange={(v) => setDraft({ ...draft, id: v })}
          mono
          placeholder="tallinn"
          readOnly={isEdit}
          hint={isEdit ? "Id is fixed once created." : "Lowercase key, unique across cities."}
        />
        <div className="field-row">
          <FieldText
            label="Name"
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
            placeholder="Tallinn"
          />
          <FieldText
            label="Country"
            value={draft.country}
            onChange={(v) => setDraft({ ...draft, country: v })}
            placeholder="Estonia"
          />
        </div>
        <FieldText
          label="Pickup"
          value={draft.pickup}
          onChange={(v) => setDraft({ ...draft, pickup: v })}
          placeholder="Telliskivi · Kesklinn"
        />
        <FieldSelect
          label="Status"
          value={draft.status}
          onChange={(v) => setDraft({ ...draft, status: v as CityStatusValue })}
          options={CITY_STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <FieldNote
          label="Available bikes"
          text="Availability is calculated automatically from the bike units in this city. Manage stock under Fleet → bike units."
        />
        <FieldNumber
          label="Sort order"
          value={draft.sortOrder}
          onChange={(v) => setDraft({ ...draft, sortOrder: v })}
        />
        {formError && <InlineError message={formError} />}
      </Drawer>
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Pricing plans — MOVED. Plans are edited only on the Pricelist page now
   (sidebar: Finance → Pricelist). This slim note keeps the old spot
   discoverable for operators who remember plans living here.
   ════════════════════════════════════════════════════════════════════════ */

function PlansMovedNote() {
  return (
    <section style={{ marginBottom: 52 }}>
      <div
        className="card mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          padding: "14px 18px",
          fontSize: 12,
          color: "var(--text-dim)",
        }}
      >
        <span>Pricing plans moved to</span>
        <Link href="/admin/pricelist" style={{ color: "var(--lime)" }}>
          Pricelist
        </Link>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Hero marquee — per-language list of scroller items (locale → string[]).
   Single record (no id); GET loads it, PUT replaces it. Reuses the shared
   LocalizedListEditor (EN / ET / LV / FI / RU).
   ════════════════════════════════════════════════════════════════════════ */

function MarqueeSection({
  marquee,
  onError,
  clearError,
  patch,
}: {
  marquee: LocalizedStrings;
  onError: (err: unknown, fallback: string) => string;
  clearError: () => void;
  patch: (fn: (d: ContentData) => ContentData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LocalizedStrings>(() => toLocalizedStrings(marquee));
  // Snapshot of the draft the drawer opened with — drives the dirty guard.
  const [baseline, setBaseline] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit() {
    clearError();
    setFormError(null);
    const next = toLocalizedStrings(marquee);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setFormError(null);
  }

  async function submit() {
    if (busy) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      const body = toLocalizedStrings(draft);
      const saved = await updateMarquee(body);
      patch((d) => ({ ...d, marquee: saved }));
      close();
    } catch (err) {
      setFormError(onError(err, "Could not save the marquee."));
    } finally {
      setBusy(false);
    }
  }

  const enItems = marquee.en ?? [];

  return (
    <Section id="marquee" title="Hero marquee" note="Scrolling hero strip. Items are set per language; EN is the fallback.">
      <AdminTable>
        <thead>
          <tr>
            <Th>Language</Th>
            <Th>Items</Th>
          </tr>
        </thead>
        <tbody>
          {ADMIN_LOCALES.map((locale) => {
            const items = marquee[locale] ?? [];
            return (
              <tr key={locale}>
                <Td mono nowrap>{locale.toUpperCase()}</Td>
                <Td dim>{items.length ? items.join(", ") : "—"}</Td>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={openEdit}
        style={{ padding: "10px 18px", fontSize: 13.5, marginTop: 16 }}
      >
        Edit marquee
      </button>

      <Drawer
        open={open}
        onClose={close}
        dirty={open && JSON.stringify(draft) !== baseline}
        title="Edit hero marquee"
        subtitle={`${enItems.length} EN ${enItems.length === 1 ? "item" : "items"}`}
        footer={
          <DrawerFooter busy={busy} onPrimary={() => void submit()} onCancel={close} primaryLabel="Save" />
        }
      >
        <div className="field">
          <label>
            Marquee items per language
            <FieldHint text="Comma-separated. EN is the fallback when a locale is empty." />
          </label>
          <LocalizedListEditor
            value={draft}
            onChange={setDraft}
            placeholder="Tallinn, Riga, Helsinki"
          />
        </div>
        {formError && <InlineError message={formError} />}
      </Drawer>
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   FAQ — id (int), question, answer, openByDefault, sortOrder.
   Create + edit + delete.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_FAQ: FaqInput = { question: "", answer: "", openByDefault: false, sortOrder: 0 };

function FaqSection({ rows, onError, clearError, patch }: SectionProps<AdminFaq>) {
  const [editor, setEditor] = useState<Editor<number> | null>(null);
  const [draft, setDraft] = useState<FaqInput>(EMPTY_FAQ);
  // Snapshot of the draft the drawer opened with — drives the dirty guard.
  const [baseline, setBaseline] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    clearError();
    setFormError(null);
    setDraft(EMPTY_FAQ);
    setBaseline(JSON.stringify(EMPTY_FAQ));
    setEditor({ mode: "create" });
  }

  function openEdit(row: AdminFaq) {
    clearError();
    setFormError(null);
    const { id: _id, ...rest } = row;
    void _id;
    const next: FaqInput = { ...rest };
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setEditor({ mode: "edit", id: row.id });
  }

  function close() {
    setEditor(null);
    setFormError(null);
  }

  async function submit() {
    if (busy || !editor) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      if (editor.mode === "create") {
        const saved = await createFaq(draft);
        patch((d) => ({ ...d, faqs: [...d.faqs, saved] }));
      } else {
        const saved = await updateFaq(editor.id, draft);
        patch((d) => ({ ...d, faqs: d.faqs.map((f) => (f.id === editor.id ? saved : f)) }));
      }
      close();
    } catch (err) {
      setFormError(
        onError(err, editor.mode === "create" ? "Could not create the FAQ." : "Could not save the FAQ."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !editor || editor.mode !== "edit") return;
    const id = editor.id;
    const question = draft.question;
    if (!confirmAction(`Delete this FAQ entry?\n\n"${question}"`, { finality: "irreversible" })) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      await deleteFaq(id);
      patch((d) => ({ ...d, faqs: d.faqs.filter((f) => f.id !== id) }));
      close();
    } catch (err) {
      setFormError(onError(err, "Could not delete the FAQ."));
    } finally {
      setBusy(false);
    }
  }

  const isEdit = editor?.mode === "edit";
  const dirty = editor !== null && JSON.stringify(draft) !== baseline;

  return (
    <Section id="faq" title="FAQ" count={rows.length}>
      <AdminTable>
        <thead>
          <tr>
            <Th>Id</Th>
            <Th>Question</Th>
            <Th>Answer</Th>
            <Th>Open by default</Th>
            <Th>Sort</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow
              colSpan={6}
              label="No FAQ entries yet — use “+ Add FAQ” below to create the first one."
            />
          )}

          {rows.map((row) => (
            <tr key={row.id}>
              <Td mono nowrap>{row.id}</Td>
              <Td>{row.question}</Td>
              <Td dim>{row.answer}</Td>
              <Td nowrap><BoolPill value={row.openByDefault} /></Td>
              <Td mono dim>{row.sortOrder}</Td>
              <Td nowrap><RowEdit busy={busy} onEdit={() => openEdit(row)} /></Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AddButton label="Add FAQ" onClick={openCreate} />

      <Drawer
        open={editor !== null}
        onClose={close}
        dirty={dirty}
        title={isEdit ? "Edit FAQ" : "New FAQ"}
        subtitle={isEdit && editor ? `#${editor.id}` : undefined}
        footer={
          <DrawerFooter
            busy={busy}
            onPrimary={() => void submit()}
            onCancel={close}
            primaryLabel={isEdit ? "Save" : "Create"}
            danger={isEdit ? { label: "Delete", onClick: () => void remove() } : undefined}
          />
        }
      >
        <FieldTextArea
          label="Question"
          value={draft.question}
          onChange={(v) => setDraft({ ...draft, question: v })}
          rows={2}
          placeholder="Can I use the bike for delivery work?"
        />
        <FieldTextArea
          label="Answer"
          value={draft.answer}
          onChange={(v) => setDraft({ ...draft, answer: v })}
          rows={4}
          placeholder="Yes. The fleet is built for city delivery shifts…"
        />
        <div className="field-row">
          <FieldSelect
            label="Open by default"
            value={draft.openByDefault ? "true" : "false"}
            onChange={(v) => setDraft({ ...draft, openByDefault: v === "true" })}
            options={BOOL_OPTIONS}
          />
          <FieldNumber
            label="Sort order"
            value={draft.sortOrder}
            onChange={(v) => setDraft({ ...draft, sortOrder: v })}
          />
        </div>
        {formError && <InlineError message={formError} />}
      </Drawer>
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Drawer form fields — use the shared .field / .field-row markup so inputs
   pick up the admin form styling. Selects keep an explicit style because the
   global .field rule only targets input/textarea.
   ════════════════════════════════════════════════════════════════════════ */

const BOOL_OPTIONS = [
  { value: "true", label: "yes" },
  { value: "false", label: "no" },
] as const;

function FieldText({
  label,
  value,
  onChange,
  mono = false,
  placeholder,
  readOnly = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {hint && <FieldHint text={hint} />}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className={mono ? "mono" : undefined}
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          ...(readOnly ? { opacity: 0.6, cursor: "not-allowed" } : null),
        }}
      />
    </div>
  );
}

function FieldTextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        style={{ resize: "vertical", lineHeight: 1.5 }}
      />
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        step={step ?? "1"}
        aria-label={label}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
        className="mono"
        style={{ fontFamily: "var(--font-mono)" }}
      />
    </div>
  );
}

const SELECT_STYLE: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 15px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  letterSpacing: "0.04em",
  cursor: "pointer",
};

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        style={SELECT_STYLE}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "var(--panel)", color: "var(--text)" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Read-only informational field — same label chrome as the editable fields, but
 * renders explanatory copy instead of an input. Used where a value is derived
 * elsewhere (e.g. city availability is computed from the fleet, not edited here).
 */
function FieldNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <p
        className="mono"
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.6,
          letterSpacing: "0.01em",
          color: "var(--text-dim)",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function FieldHint({ text }: { text: string }) {
  return (
    <span
      className="mono"
      style={{
        marginLeft: 8,
        fontSize: 10.5,
        letterSpacing: "0.02em",
        textTransform: "none",
        color: "var(--text-dim)",
      }}
    >
      {text}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Row + footer button pieces (inline styles + brand CSS vars).
   ════════════════════════════════════════════════════════════════════════ */

function BoolPill({ value }: { value: boolean }) {
  return <StatusPill value={value ? "yes" : "no"} tone={value ? "good" : "neutral"} />;
}

/** Single Edit affordance on a read-only table row. Styling comes from the
 *  shared .admin-mini-btn class in globals.css (same visuals as the old
 *  inline-styled MiniButton). */
function RowEdit({ busy, onEdit }: { busy: boolean; onEdit: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button type="button" className="admin-mini-btn" onClick={onEdit} disabled={busy}>
        Edit
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={onClick}
      style={{ padding: "10px 18px", fontSize: 13.5, marginTop: 16 }}
    >
      + {label}
    </button>
  );
}

/* ── Section wrapper + page chrome (mirrors the fleet page) ────────────── */

function Section({
  id,
  title,
  count,
  note,
  children,
}: {
  /** Anchor id targeted by the sticky quick-nav chips under the page header. */
  id?: string;
  title: string;
  count?: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="admin-anchor-sect" style={{ marginBottom: 52 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
        {typeof count === "number" && (
          <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {count} {count === 1 ? "record" : "records"}
          </span>
        )}
      </div>
      {note && (
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "0 0 16px" }}>
          {note}
        </p>
      )}
      {!note && <div style={{ height: 10 }} />}
      {children}
    </section>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────────── */

/** Build the page-level error state from a non-auth thrown error (auth failures
 *  are handled by the caller, which signs out). */
function toErrorState(err: unknown): LoadState {
  if (err instanceof CatalogConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof CatalogApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: "Something went wrong loading content.", config: false };
}

/** Drop blank-name colour rows and trim each, so we never send empty swatches. */
function cleanColors(colors: ColorOption[]): ColorOption[] {
  return colors
    .map((c) => ({ name: c.name.trim(), hex: c.hex.trim() }))
    .filter((c) => c.name.length > 0);
}

/**
 * Drop blank entries and the `en` key from a locale→text map before sending: the
 * base `name`/`description` field already holds the EN value (the fallback), so an
 * `en` override would only duplicate it. Values are trimmed.
 */
function cleanLocalizedText(map: LocalizedText | undefined): LocalizedText {
  const out: LocalizedText = {};
  for (const [locale, raw] of Object.entries(map ?? {})) {
    if (locale === "en") continue;
    const text = (raw ?? "").trim();
    if (text) out[locale] = text;
  }
  return out;
}

/** Format an amount as a compact euro string ("€30", "€29.50"). */
function eur(n: number): string {
  return "€" + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

/** Parse the leading numeric amount out of a legacy display price ("€29 / 30d" → 29). */
function parseLeadingAmount(price: string | null | undefined): number | null {
  if (!price) return null;
  const m = price.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * "From" price for the list view: the lowest set tier, or the legacy display
 * price when no tier is set (matches the contract's no-plan-context rule).
 */
/** The bundle (if any) that lists this accessory as a component — such rows are
 *  hidden from the customer-facing lists and selectable only via their bundle. */
function bundleOf(rows: AdminAccessory[], id: string): AdminAccessory | null {
  return rows.find((r) => r.isBundle && r.componentIds.includes(id)) ?? null;
}

function fromPriceLabel(acc: AdminAccessory): string {
  const tiers = [acc.price30, acc.price6mo, acc.price12mo].filter(
    (v): v is number => v != null && !Number.isNaN(v),
  );
  if (tiers.length) return `from ${eur(Math.min(...tiers))}`;
  const legacy = parseLeadingAmount(acc.price);
  return legacy != null ? eur(legacy) : "—";
}

/** Resolved-price preview line under a tier input: the tier value, else the legacy fallback. */
function tierPreview(value: number | null, legacyAmount: number | null): string {
  if (value != null && !Number.isNaN(value)) return `Charges ${eur(value)} / 30d`;
  if (legacyAmount != null) return `Blank → ${eur(legacyAmount)} / 30d (legacy)`;
  return "Blank → no price set";
}
