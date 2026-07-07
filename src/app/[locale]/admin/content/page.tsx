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
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
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
  type AdminPlan,
  type AdminFaq,
  type AccessoryInput,
  type CityInput,
  type PlanInput,
  type FaqInput,
  type CityStatusValue,
} from "@/services/adminCatalogService";
import type { ColorOption } from "@/types/bike";
import type { LocalizedStrings } from "@/types/pricing";
import { AdminTable, Th, Td, EmptyRow } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
import { ColorListEditor } from "@/components/admin/ColorListEditor";
import {
  LocalizedListEditor,
  ADMIN_LOCALES,
  toLocalizedStrings,
} from "@/components/admin/LocalizedListEditor";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";

/** City status options — must match the backend CityStatus enum (lowercased). */
const CITY_STATUSES: readonly CityStatusValue[] = ["available", "limited", "soon"];

/* ── Page data + load state ────────────────────────────────────────────── */

interface ContentData {
  accessories: AdminAccessory[];
  cities: AdminCity[];
  plans: AdminPlan[];
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

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    try {
      const [accessories, cities, plans, faqs, marquee] = await Promise.all([
        getAccessories(),
        getCities(),
        getPlans(),
        getFaqs(),
        getMarquee(),
      ]);
      setState({ phase: "ready", data: { accessories, cities, plans, faqs, marquee } });
    } catch (err) {
      // Auth failure → drop to the shell's sign-in; otherwise show an error.
      if (err instanceof CatalogAuthError || (err instanceof CatalogApiError && err.unauthorized)) {
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
            subtitle="Accessories, cities, pricing plans, hero marquee and FAQ shown on the public site."
          />

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

          <PlansSection
            rows={state.data.plans}
            onError={handleActionError}
            clearError={() => setActionError(null)}
            patch={patch}
          />

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
 * row-key type — string for accessories/cities/plans, number for FAQ.
 */
type Editor<Id> = { mode: "create" } | { mode: "edit"; id: Id };

/* ════════════════════════════════════════════════════════════════════════
   Accessories — id, name, price, icon, sortOrder. Create + edit + delete.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_ACCESSORY: AccessoryInput = { id: "", name: "", price: "", icon: "", sortOrder: 0, colors: [] };

function AccessoriesSection({ rows, onError, clearError, patch }: SectionProps<AdminAccessory>) {
  const [editor, setEditor] = useState<Editor<string> | null>(null);
  const [draft, setDraft] = useState<AccessoryInput>(EMPTY_ACCESSORY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    clearError();
    setFormError(null);
    setDraft(EMPTY_ACCESSORY);
    setEditor({ mode: "create" });
  }

  function openEdit(row: AdminAccessory) {
    clearError();
    setFormError(null);
    // Clone the colour rows so editing the draft never mutates the loaded row.
    setDraft({ ...row, colors: (row.colors ?? []).map((c) => ({ ...c })) });
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
      // Drop blank-name colour rows and trim before sending.
      const body: AccessoryInput = { ...draft, colors: cleanColors(draft.colors ?? []) };
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
    if (!window.confirm(`Delete accessory "${id}"? This cannot be undone.`)) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      await deleteAccessory(id);
      patch((d) => ({ ...d, accessories: d.accessories.filter((a) => a.id !== id) }));
      close();
    } catch (err) {
      setFormError(onError(err, "Could not delete the accessory."));
    } finally {
      setBusy(false);
    }
  }

  const isEdit = editor?.mode === "edit";

  return (
    <Section title="Accessories" count={rows.length}>
      <AdminTable>
        <thead>
          <tr>
            <Th>Id</Th>
            <Th>Name</Th>
            <Th>Price</Th>
            <Th>Icon</Th>
            <Th>Sort</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6} label="No accessories yet." />}

          {rows.map((row) => (
            <tr key={row.id}>
              <Td mono nowrap>{row.id}</Td>
              <Td>{row.name}</Td>
              <Td mono dim>{row.price}</Td>
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
        title={isEdit ? "Edit accessory" : "New accessory"}
        subtitle={isEdit && editor ? editor.id : undefined}
        footer={
          <DrawerFooter
            busy={busy}
            onSave={submit}
            onCancel={close}
            saveLabel={isEdit ? "Save" : "Create"}
            onDelete={isEdit ? remove : undefined}
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
        <FieldText
          label="Name"
          value={draft.name}
          onChange={(v) => setDraft({ ...draft, name: v })}
          placeholder="Extra battery"
        />
        <div className="field-row">
          <FieldText
            label="Price"
            value={draft.price}
            onChange={(v) => setDraft({ ...draft, price: v })}
            mono
            placeholder="€29 / 30d"
          />
          <FieldText
            label="Icon"
            value={draft.icon}
            onChange={(v) => setDraft({ ...draft, icon: v })}
            mono
            placeholder="battery"
          />
        </div>
        <FieldNumber
          label="Sort order"
          value={draft.sortOrder}
          onChange={(v) => setDraft({ ...draft, sortOrder: v })}
        />
        <div className="field">
          <label>Colours</label>
          <ColorListEditor
            value={draft.colors ?? []}
            onChange={(next) => setDraft({ ...draft, colors: next })}
          />
        </div>
        <FormError message={formError} />
      </Drawer>
    </Section>
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
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    clearError();
    setFormError(null);
    setDraft(EMPTY_CITY);
    setEditor({ mode: "create" });
  }

  function openEdit(row: AdminCity) {
    clearError();
    setFormError(null);
    setDraft({ ...row });
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
    if (!window.confirm(`Delete city "${id}"? This cannot be undone.`)) return;
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

  return (
    <Section title="Cities" count={rows.length}>
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
          {rows.length === 0 && <EmptyRow colSpan={8} label="No cities yet." />}

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
        title={isEdit ? "Edit city" : "New city"}
        subtitle={isEdit && editor ? editor.id : undefined}
        footer={
          <DrawerFooter
            busy={busy}
            onSave={submit}
            onCancel={close}
            saveLabel={isEdit ? "Save" : "Create"}
            onDelete={isEdit ? remove : undefined}
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
        <FormError message={formError} />
      </Drawer>
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Pricing plans — id (code), term, months, daily, monthly, tag, featured,
   perks (per-language list), sortOrder. Create + edit + delete. Pricing is
   GLOBAL per plan (the same tier applies to every model). Perks are edited per
   locale (EN / ET / LV / FI / RU) via the shared LocalizedListEditor.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_PLAN: AdminPlan = {
  id: "",
  term: "",
  months: 1,
  daily: 0,
  monthly: 0,
  tag: "",
  featured: false,
  perks: {},
  sortOrder: 0,
};

function PlansSection({ rows, onError, clearError, patch }: SectionProps<AdminPlan>) {
  const [editor, setEditor] = useState<Editor<string> | null>(null);
  const [draft, setDraft] = useState<AdminPlan>(EMPTY_PLAN);
  // perks edited per language while the drawer is open (always all 5 locales).
  const [perks, setPerks] = useState<LocalizedStrings>(() => toLocalizedStrings(undefined));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    clearError();
    setFormError(null);
    setDraft(EMPTY_PLAN);
    setPerks(toLocalizedStrings(undefined));
    setEditor({ mode: "create" });
  }

  function openEdit(row: AdminPlan) {
    clearError();
    setFormError(null);
    setDraft({ ...row });
    setPerks(toLocalizedStrings(row.perks));
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
      // Normalise to a full { en, et, lv, fi, ru } map (LocalizedListEditor already
      // parses/trims/drops blanks on every keystroke).
      const perksBody = toLocalizedStrings(perks);
      if (editor.mode === "create") {
        const saved = await createPlan({ ...draft, perks: perksBody });
        patch((d) => ({ ...d, plans: [...d.plans, saved] }));
      } else {
        const { id: _id, ...rest } = draft;
        void _id;
        const body: PlanInput = { ...rest, perks: perksBody };
        const saved = await updatePlan(editor.id, body);
        patch((d) => ({ ...d, plans: d.plans.map((p) => (p.id === editor.id ? saved : p)) }));
      }
      close();
    } catch (err) {
      setFormError(
        onError(err, editor.mode === "create" ? "Could not create the plan." : "Could not save the plan."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !editor || editor.mode !== "edit") return;
    const id = editor.id;
    if (!window.confirm(`Delete pricing plan "${id}"? This cannot be undone.`)) return;
    clearError();
    setFormError(null);
    setBusy(true);
    try {
      await deletePlan(id);
      patch((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== id) }));
      close();
    } catch (err) {
      setFormError(onError(err, "Could not delete the plan."));
    } finally {
      setBusy(false);
    }
  }

  const isEdit = editor?.mode === "edit";

  return (
    <Section title="Pricing plans" count={rows.length}>
      <AdminTable>
        <thead>
          <tr>
            <Th>Id</Th>
            <Th>Term</Th>
            <Th>Months</Th>
            <Th>Daily €</Th>
            <Th>Monthly €</Th>
            <Th>Tag</Th>
            <Th>Featured</Th>
            <Th>Perks (EN)</Th>
            <Th>Sort</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={10} label="No pricing plans." />}

          {rows.map((row) => (
            <tr key={row.id}>
              <Td mono nowrap>{row.id}</Td>
              <Td>{row.term}</Td>
              <Td mono dim>{row.months}</Td>
              <Td mono dim>{row.daily}</Td>
              <Td mono dim>{row.monthly}</Td>
              <Td dim>{row.tag}</Td>
              <Td nowrap><BoolPill value={row.featured} /></Td>
              <Td dim>{(row.perks?.en ?? []).length ? (row.perks.en as string[]).join(", ") : "—"}</Td>
              <Td mono dim>{row.sortOrder}</Td>
              <Td nowrap><RowEdit busy={busy} onEdit={() => openEdit(row)} /></Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AddButton label="New plan" onClick={openCreate} />

      <Drawer
        open={editor !== null}
        onClose={close}
        title={isEdit ? "Edit plan" : "New plan"}
        subtitle={isEdit && editor ? editor.id : undefined}
        footer={
          <DrawerFooter
            busy={busy}
            onSave={submit}
            onCancel={close}
            saveLabel={isEdit ? "Save" : "Create"}
            onDelete={isEdit ? remove : undefined}
          />
        }
      >
        <FieldText
          label="Id"
          value={draft.id}
          onChange={(v) => setDraft({ ...draft, id: v })}
          mono
          placeholder="p39"
          readOnly={isEdit}
          hint={isEdit ? "Id is fixed once created." : "Lowercase code, unique across plans (max 64 chars)."}
        />
        <FieldText label="Term" value={draft.term} onChange={(v) => setDraft({ ...draft, term: v })} placeholder="12 months" />
        <div className="field-row">
          <FieldNumber
            label="Months"
            value={draft.months}
            onChange={(v) => setDraft({ ...draft, months: v })}
          />
          <FieldText label="Tag" value={draft.tag} onChange={(v) => setDraft({ ...draft, tag: v })} placeholder="Best price" />
        </div>
        <div className="field-row">
          <FieldNumber
            label="Daily €"
            value={draft.daily}
            step="0.01"
            onChange={(v) => setDraft({ ...draft, daily: v })}
          />
          <FieldNumber
            label="Monthly €"
            value={draft.monthly}
            step="0.01"
            onChange={(v) => setDraft({ ...draft, monthly: v })}
          />
        </div>
        <FieldSelect
          label="Featured"
          value={draft.featured ? "true" : "false"}
          onChange={(v) => setDraft({ ...draft, featured: v === "true" })}
          options={BOOL_OPTIONS}
        />
        <div className="field">
          <label>
            Perks per language
            <FieldHint text="Comma-separated. EN is the fallback when a locale is empty." />
          </label>
          <LocalizedListEditor
            value={perks}
            onChange={setPerks}
            placeholder="Free service, Priority support, Free helmet"
          />
        </div>
        <FieldNumber
          label="Sort order"
          value={draft.sortOrder}
          onChange={(v) => setDraft({ ...draft, sortOrder: v })}
        />
        <FormError message={formError} />
      </Drawer>
    </Section>
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
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit() {
    clearError();
    setFormError(null);
    setDraft(toLocalizedStrings(marquee));
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
    <Section title="Hero marquee" note="Scrolling hero strip. Items are set per language; EN is the fallback.">
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
        title="Edit hero marquee"
        subtitle={`${enItems.length} EN ${enItems.length === 1 ? "item" : "items"}`}
        footer={
          <DrawerFooter busy={busy} onSave={submit} onCancel={close} saveLabel="Save" />
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
        <FormError message={formError} />
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
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    clearError();
    setFormError(null);
    setDraft(EMPTY_FAQ);
    setEditor({ mode: "create" });
  }

  function openEdit(row: AdminFaq) {
    clearError();
    setFormError(null);
    const { id: _id, ...rest } = row;
    void _id;
    setDraft({ ...rest });
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
    if (!window.confirm(`Delete this FAQ entry? This cannot be undone.\n\n"${question}"`)) return;
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

  return (
    <Section title="FAQ" count={rows.length}>
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
          {rows.length === 0 && <EmptyRow colSpan={6} label="No FAQ entries yet." />}

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
        title={isEdit ? "Edit FAQ" : "New FAQ"}
        subtitle={isEdit && editor ? `#${editor.id}` : undefined}
        footer={
          <DrawerFooter
            busy={busy}
            onSave={submit}
            onCancel={close}
            saveLabel={isEdit ? "Save" : "Create"}
            onDelete={isEdit ? remove : undefined}
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
        <FormError message={formError} />
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

/** In-drawer submit / validation error line. */
function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="mono"
      style={{ color: "var(--danger)", fontSize: 12, margin: "16px 0 0", lineHeight: 1.5 }}
      role="alert"
    >
      {message}
    </p>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Row + footer button pieces (inline styles + brand CSS vars).
   ════════════════════════════════════════════════════════════════════════ */

function BoolPill({ value }: { value: boolean }) {
  return <StatusPill value={value ? "yes" : "no"} tone={value ? "good" : "neutral"} />;
}

/** Single Edit affordance on a read-only table row. */
function RowEdit({ busy, onEdit }: { busy: boolean; onEdit: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <MiniButton onClick={onEdit} disabled={busy}>Edit</MiniButton>
    </div>
  );
}

/**
 * Sticky drawer footer: optional Delete pinned left (via the .spacer class the
 * global .drawer-foot rule honours), then Cancel + Save on the right. Reuses the
 * same MiniButton styling the page already uses for its actions.
 */
function DrawerFooter({
  busy,
  onSave,
  onCancel,
  saveLabel,
  onDelete,
}: {
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  onDelete?: () => void;
}) {
  return (
    <>
      {onDelete && (
        <MiniButton onClick={onDelete} disabled={busy} danger className="spacer">
          Delete
        </MiniButton>
      )}
      <MiniButton onClick={onCancel} disabled={busy}>Cancel</MiniButton>
      <MiniButton onClick={onSave} disabled={busy} primary>
        {busy ? "…" : saveLabel}
      </MiniButton>
    </>
  );
}

function MiniButton({
  children,
  onClick,
  disabled,
  primary = false,
  danger = false,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  className?: string;
}) {
  const palette = primary
    ? { fg: "var(--lime-ink)", bg: "var(--lime)", bd: "var(--lime)" }
    : danger
      ? { fg: "var(--danger)", bg: "transparent", bd: "rgba(255, 138, 120, 0.32)" }
      : { fg: "var(--text-2)", bg: "var(--surface)", bd: "var(--border-strong)" };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className ? `mono ${className}` : "mono"}
      style={{
        padding: "7px 13px",
        borderRadius: "var(--r-full)",
        background: palette.bg,
        border: `1px solid ${palette.bd}`,
        color: palette.fg,
        fontSize: 11.5,
        letterSpacing: "0.04em",
        fontWeight: primary ? 600 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
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
  title,
  count,
  note,
  children,
}: {
  title: string;
  count?: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 52 }}>
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
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>
        {message}
      </p>
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
