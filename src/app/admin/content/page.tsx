"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  updatePlan,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
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
import { AdminTable, Th, Td, EmptyRow } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";

/** City status options — must match the backend CityStatus enum (lowercased). */
const CITY_STATUSES: readonly CityStatusValue[] = ["available", "limited", "soon"];

/* ── Page data + load state ────────────────────────────────────────────── */

interface ContentData {
  accessories: AdminAccessory[];
  cities: AdminCity[];
  plans: AdminPlan[];
  faqs: AdminFaq[];
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: ContentData }
  | { phase: "no-auth" }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminContentPage() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Page-level banner for any write error (each section also clears it on retry).
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    try {
      const [accessories, cities, plans, faqs] = await Promise.all([
        getAccessories(),
        getCities(),
        getPlans(),
        getFaqs(),
      ]);
      setState({ phase: "ready", data: { accessories, cities, plans, faqs } });
    } catch (err) {
      setState(toErrorState(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Shared error handler for write actions: re-gates on auth, else sets banner. */
  const handleActionError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof CatalogAuthError || (err instanceof CatalogApiError && err.unauthorized)) {
      setState({ phase: "no-auth" });
      return;
    }
    setActionError(err instanceof CatalogApiError ? err.message : fallback);
  }, []);

  /* Optimistic local-state patchers (called after a successful API write). */

  const patch = useCallback((fn: (d: ContentData) => ContentData) => {
    setState((s) => (s.phase === "ready" ? { ...s, data: fn(s.data) } : s));
  }, []);

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <PageHeader
        showRefresh={state.phase === "ready" || state.phase === "error"}
        onRefresh={() => void load()}
      />

      {state.phase === "loading" ? (
        <Notice>Loading content…</Notice>
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

          <FaqSection
            rows={state.data.faqs}
            onError={handleActionError}
            clearError={() => setActionError(null)}
            patch={patch}
          />
        </>
      )}
    </main>
  );
}

/* ── Shared section-prop shape ─────────────────────────────────────────── */

interface SectionProps<T> {
  rows: T[];
  onError: (err: unknown, fallback: string) => void;
  clearError: () => void;
  patch: (fn: (d: ContentData) => ContentData) => void;
}

/* ════════════════════════════════════════════════════════════════════════
   Accessories — id, name, price, icon, sortOrder. Create + edit + delete.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_ACCESSORY: AccessoryInput = { id: "", name: "", price: "", icon: "", sortOrder: 0 };

function AccessoriesSection({ rows, onError, clearError, patch }: SectionProps<AdminAccessory>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccessoryInput>(EMPTY_ACCESSORY);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRow, setNewRow] = useState<AccessoryInput>(EMPTY_ACCESSORY);

  function startEdit(row: AdminAccessory) {
    clearError();
    setCreating(false);
    setEditingId(row.id);
    setDraft({ ...row });
  }

  async function save() {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      const saved = await updateAccessory(editingId!, draft);
      patch((d) => ({ ...d, accessories: d.accessories.map((a) => (a.id === editingId ? saved : a)) }));
      setEditingId(null);
    } catch (err) {
      onError(err, "Could not save the accessory.");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      const saved = await createAccessory(newRow);
      patch((d) => ({ ...d, accessories: [...d.accessories, saved] }));
      setCreating(false);
      setNewRow(EMPTY_ACCESSORY);
    } catch (err) {
      onError(err, "Could not create the accessory.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    if (!window.confirm(`Delete accessory "${id}"? This cannot be undone.`)) return;
    clearError();
    setBusy(true);
    try {
      await deleteAccessory(id);
      patch((d) => ({ ...d, accessories: d.accessories.filter((a) => a.id !== id) }));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      onError(err, "Could not delete the accessory.");
    } finally {
      setBusy(false);
    }
  }

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
          {rows.length === 0 && !creating && <EmptyRow colSpan={6} label="No accessories yet." />}

          {rows.map((row) =>
            editingId === row.id ? (
              <tr key={row.id}>
                <Td mono dim nowrap>{row.id}</Td>
                <Td><TextInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} /></Td>
                <Td><TextInput value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} mono /></Td>
                <Td><TextInput value={draft.icon} onChange={(v) => setDraft({ ...draft, icon: v })} mono /></Td>
                <Td><NumberInput value={draft.sortOrder} onChange={(v) => setDraft({ ...draft, sortOrder: v })} /></Td>
                <Td nowrap><EditActions busy={busy} onSave={save} onCancel={() => setEditingId(null)} /></Td>
              </tr>
            ) : (
              <tr key={row.id}>
                <Td mono nowrap>{row.id}</Td>
                <Td>{row.name}</Td>
                <Td mono dim>{row.price}</Td>
                <Td mono dim>{row.icon}</Td>
                <Td mono dim>{row.sortOrder}</Td>
                <Td nowrap><RowActions busy={busy} onEdit={() => startEdit(row)} onDelete={() => remove(row.id)} /></Td>
              </tr>
            ),
          )}

          {creating && (
            <tr>
              <Td><TextInput value={newRow.id} onChange={(v) => setNewRow({ ...newRow, id: v })} mono placeholder="battery" /></Td>
              <Td><TextInput value={newRow.name} onChange={(v) => setNewRow({ ...newRow, name: v })} placeholder="Extra battery" /></Td>
              <Td><TextInput value={newRow.price} onChange={(v) => setNewRow({ ...newRow, price: v })} mono placeholder="€29 / 30d" /></Td>
              <Td><TextInput value={newRow.icon} onChange={(v) => setNewRow({ ...newRow, icon: v })} mono placeholder="battery" /></Td>
              <Td><NumberInput value={newRow.sortOrder} onChange={(v) => setNewRow({ ...newRow, sortOrder: v })} /></Td>
              <Td nowrap><EditActions busy={busy} saveLabel="Create" onSave={create} onCancel={() => setCreating(false)} /></Td>
            </tr>
          )}
        </tbody>
      </AdminTable>

      {!creating && (
        <AddButton
          label="Add accessory"
          onClick={() => {
            clearError();
            setEditingId(null);
            setNewRow(EMPTY_ACCESSORY);
            setCreating(true);
          }}
        />
      )}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CityInput>(EMPTY_CITY);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRow, setNewRow] = useState<CityInput>(EMPTY_CITY);

  function startEdit(row: AdminCity) {
    clearError();
    setCreating(false);
    setEditingId(row.id);
    setDraft({ ...row });
  }

  async function save() {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      const saved = await updateCity(editingId!, draft);
      patch((d) => ({ ...d, cities: d.cities.map((c) => (c.id === editingId ? saved : c)) }));
      setEditingId(null);
    } catch (err) {
      onError(err, "Could not save the city.");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      const saved = await createCity(newRow);
      patch((d) => ({ ...d, cities: [...d.cities, saved] }));
      setCreating(false);
      setNewRow(EMPTY_CITY);
    } catch (err) {
      onError(err, "Could not create the city.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    if (!window.confirm(`Delete city "${id}"? This cannot be undone.`)) return;
    clearError();
    setBusy(true);
    try {
      await deleteCity(id);
      patch((d) => ({ ...d, cities: d.cities.filter((c) => c.id !== id) }));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      onError(err, "Could not delete the city.");
    } finally {
      setBusy(false);
    }
  }

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
          {rows.length === 0 && !creating && <EmptyRow colSpan={8} label="No cities yet." />}

          {rows.map((row) =>
            editingId === row.id ? (
              <tr key={row.id}>
                <Td mono dim nowrap>{row.id}</Td>
                <Td><TextInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} /></Td>
                <Td><TextInput value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} /></Td>
                <Td><NumberInput value={draft.available} onChange={(v) => setDraft({ ...draft, available: v })} /></Td>
                <Td><TextInput value={draft.pickup} onChange={(v) => setDraft({ ...draft, pickup: v })} /></Td>
                <Td><CityStatusSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} /></Td>
                <Td><NumberInput value={draft.sortOrder} onChange={(v) => setDraft({ ...draft, sortOrder: v })} /></Td>
                <Td nowrap><EditActions busy={busy} onSave={save} onCancel={() => setEditingId(null)} /></Td>
              </tr>
            ) : (
              <tr key={row.id}>
                <Td mono nowrap>{row.id}</Td>
                <Td>{row.name}</Td>
                <Td dim>{row.country}</Td>
                <Td mono dim>{row.available}</Td>
                <Td dim>{row.pickup}</Td>
                <Td nowrap><StatusPill value={row.status} /></Td>
                <Td mono dim>{row.sortOrder}</Td>
                <Td nowrap><RowActions busy={busy} onEdit={() => startEdit(row)} onDelete={() => remove(row.id)} /></Td>
              </tr>
            ),
          )}

          {creating && (
            <tr>
              <Td><TextInput value={newRow.id} onChange={(v) => setNewRow({ ...newRow, id: v })} mono placeholder="tallinn" /></Td>
              <Td><TextInput value={newRow.name} onChange={(v) => setNewRow({ ...newRow, name: v })} placeholder="Tallinn" /></Td>
              <Td><TextInput value={newRow.country} onChange={(v) => setNewRow({ ...newRow, country: v })} placeholder="Estonia" /></Td>
              <Td><NumberInput value={newRow.available} onChange={(v) => setNewRow({ ...newRow, available: v })} /></Td>
              <Td><TextInput value={newRow.pickup} onChange={(v) => setNewRow({ ...newRow, pickup: v })} placeholder="Telliskivi · Kesklinn" /></Td>
              <Td><CityStatusSelect value={newRow.status} onChange={(v) => setNewRow({ ...newRow, status: v })} /></Td>
              <Td><NumberInput value={newRow.sortOrder} onChange={(v) => setNewRow({ ...newRow, sortOrder: v })} /></Td>
              <Td nowrap><EditActions busy={busy} saveLabel="Create" onSave={create} onCancel={() => setCreating(false)} /></Td>
            </tr>
          )}
        </tbody>
      </AdminTable>

      {!creating && (
        <AddButton
          label="Add city"
          onClick={() => {
            clearError();
            setEditingId(null);
            setNewRow(EMPTY_CITY);
            setCreating(true);
          }}
        />
      )}
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Pricing plans — EDIT ONLY. id, term, months, daily, monthly, tag,
   featured, perks[] (comma-separated), sortOrder. No create / delete.
   ════════════════════════════════════════════════════════════════════════ */

function PlansSection({ rows, onError, clearError, patch }: SectionProps<AdminPlan>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanInput | null>(null);
  // perks edited as a single comma-separated string while editing.
  const [perksText, setPerksText] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(row: AdminPlan) {
    clearError();
    setEditingId(row.id);
    const { id: _id, ...rest } = row;
    void _id;
    setDraft({ ...rest });
    setPerksText(row.perks.join(", "));
  }

  async function save() {
    if (busy || !draft) return;
    clearError();
    setBusy(true);
    try {
      const body: PlanInput = { ...draft, perks: parseList(perksText) };
      const saved = await updatePlan(editingId!, body);
      patch((d) => ({ ...d, plans: d.plans.map((p) => (p.id === editingId ? saved : p)) }));
      setEditingId(null);
      setDraft(null);
    } catch (err) {
      onError(err, "Could not save the plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Pricing plans" count={rows.length} note="Edit only — plans cannot be created or deleted.">
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
            <Th>Perks (comma-separated)</Th>
            <Th>Sort</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={10} label="No pricing plans." />}

          {rows.map((row) =>
            editingId === row.id && draft ? (
              <tr key={row.id}>
                <Td mono dim nowrap>{row.id}</Td>
                <Td><TextInput value={draft.term} onChange={(v) => setDraft({ ...draft, term: v })} /></Td>
                <Td><NumberInput value={draft.months} onChange={(v) => setDraft({ ...draft, months: v })} /></Td>
                <Td><NumberInput value={draft.daily} step="0.01" onChange={(v) => setDraft({ ...draft, daily: v })} /></Td>
                <Td><NumberInput value={draft.monthly} step="0.01" onChange={(v) => setDraft({ ...draft, monthly: v })} /></Td>
                <Td><TextInput value={draft.tag} onChange={(v) => setDraft({ ...draft, tag: v })} /></Td>
                <Td><BoolSelect value={draft.featured} onChange={(v) => setDraft({ ...draft, featured: v })} /></Td>
                <Td><TextInput value={perksText} onChange={setPerksText} wide /></Td>
                <Td><NumberInput value={draft.sortOrder} onChange={(v) => setDraft({ ...draft, sortOrder: v })} /></Td>
                <Td nowrap><EditActions busy={busy} onSave={save} onCancel={() => { setEditingId(null); setDraft(null); }} /></Td>
              </tr>
            ) : (
              <tr key={row.id}>
                <Td mono nowrap>{row.id}</Td>
                <Td>{row.term}</Td>
                <Td mono dim>{row.months}</Td>
                <Td mono dim>{row.daily}</Td>
                <Td mono dim>{row.monthly}</Td>
                <Td dim>{row.tag}</Td>
                <Td nowrap><BoolPill value={row.featured} /></Td>
                <Td dim>{row.perks.length ? row.perks.join(", ") : "—"}</Td>
                <Td mono dim>{row.sortOrder}</Td>
                <Td nowrap><RowActions busy={busy} onEdit={() => startEdit(row)} /></Td>
              </tr>
            ),
          )}
        </tbody>
      </AdminTable>
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   FAQ — id (int), question, answer, openByDefault, sortOrder.
   Create + edit + delete.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_FAQ: FaqInput = { question: "", answer: "", openByDefault: false, sortOrder: 0 };

function FaqSection({ rows, onError, clearError, patch }: SectionProps<AdminFaq>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FaqInput>(EMPTY_FAQ);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRow, setNewRow] = useState<FaqInput>(EMPTY_FAQ);

  function startEdit(row: AdminFaq) {
    clearError();
    setCreating(false);
    setEditingId(row.id);
    const { id: _id, ...rest } = row;
    void _id;
    setDraft({ ...rest });
  }

  async function save() {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      const saved = await updateFaq(editingId!, draft);
      patch((d) => ({ ...d, faqs: d.faqs.map((f) => (f.id === editingId ? saved : f)) }));
      setEditingId(null);
    } catch (err) {
      onError(err, "Could not save the FAQ.");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      const saved = await createFaq(newRow);
      patch((d) => ({ ...d, faqs: [...d.faqs, saved] }));
      setCreating(false);
      setNewRow(EMPTY_FAQ);
    } catch (err) {
      onError(err, "Could not create the FAQ.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AdminFaq) {
    if (busy) return;
    if (!window.confirm(`Delete this FAQ entry? This cannot be undone.\n\n"${row.question}"`)) return;
    clearError();
    setBusy(true);
    try {
      await deleteFaq(row.id);
      patch((d) => ({ ...d, faqs: d.faqs.filter((f) => f.id !== row.id) }));
      if (editingId === row.id) setEditingId(null);
    } catch (err) {
      onError(err, "Could not delete the FAQ.");
    } finally {
      setBusy(false);
    }
  }

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
          {rows.length === 0 && !creating && <EmptyRow colSpan={6} label="No FAQ entries yet." />}

          {rows.map((row) =>
            editingId === row.id ? (
              <tr key={row.id}>
                <Td mono dim nowrap>{row.id}</Td>
                <Td><TextArea value={draft.question} onChange={(v) => setDraft({ ...draft, question: v })} rows={2} /></Td>
                <Td><TextArea value={draft.answer} onChange={(v) => setDraft({ ...draft, answer: v })} rows={3} /></Td>
                <Td><BoolSelect value={draft.openByDefault} onChange={(v) => setDraft({ ...draft, openByDefault: v })} /></Td>
                <Td><NumberInput value={draft.sortOrder} onChange={(v) => setDraft({ ...draft, sortOrder: v })} /></Td>
                <Td nowrap><EditActions busy={busy} onSave={save} onCancel={() => setEditingId(null)} /></Td>
              </tr>
            ) : (
              <tr key={row.id}>
                <Td mono nowrap>{row.id}</Td>
                <Td>{row.question}</Td>
                <Td dim>{row.answer}</Td>
                <Td nowrap><BoolPill value={row.openByDefault} /></Td>
                <Td mono dim>{row.sortOrder}</Td>
                <Td nowrap><RowActions busy={busy} onEdit={() => startEdit(row)} onDelete={() => remove(row)} /></Td>
              </tr>
            ),
          )}

          {creating && (
            <tr>
              <Td mono dim nowrap>—</Td>
              <Td><TextArea value={newRow.question} onChange={(v) => setNewRow({ ...newRow, question: v })} rows={2} placeholder="Can I use the bike for delivery work?" /></Td>
              <Td><TextArea value={newRow.answer} onChange={(v) => setNewRow({ ...newRow, answer: v })} rows={3} placeholder="Yes. The fleet is built for city delivery shifts…" /></Td>
              <Td><BoolSelect value={newRow.openByDefault} onChange={(v) => setNewRow({ ...newRow, openByDefault: v })} /></Td>
              <Td><NumberInput value={newRow.sortOrder} onChange={(v) => setNewRow({ ...newRow, sortOrder: v })} /></Td>
              <Td nowrap><EditActions busy={busy} saveLabel="Create" onSave={create} onCancel={() => setCreating(false)} /></Td>
            </tr>
          )}
        </tbody>
      </AdminTable>

      {!creating && (
        <AddButton
          label="Add FAQ"
          onClick={() => {
            clearError();
            setEditingId(null);
            setNewRow(EMPTY_FAQ);
            setCreating(true);
          }}
        />
      )}
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Reusable field controls + row pieces (inline styles + brand CSS vars).
   ════════════════════════════════════════════════════════════════════════ */

const CONTROL_BASE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontSize: 13,
  lineHeight: 1.4,
};

function TextInput({
  value,
  onChange,
  mono = false,
  wide = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  wide?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={mono ? "mono" : undefined}
      style={{
        ...CONTROL_BASE,
        fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
        minWidth: wide ? 240 : 100,
      }}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...CONTROL_BASE, minWidth: 220, resize: "vertical", fontFamily: "var(--font-body)" }}
    />
  );
}

function NumberInput({
  value,
  onChange,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : ""}
      step={step ?? "1"}
      onChange={(e) => {
        const n = e.target.value === "" ? 0 : Number(e.target.value);
        onChange(Number.isNaN(n) ? 0 : n);
      }}
      className="mono"
      style={{ ...CONTROL_BASE, fontFamily: "var(--font-mono)", minWidth: 72, width: 84 }}
    />
  );
}

const SELECT_BASE: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  padding: "8px 12px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.04em",
  cursor: "pointer",
  minWidth: 110,
};

function CityStatusSelect({
  value,
  onChange,
}: {
  value: CityStatusValue;
  onChange: (v: CityStatusValue) => void;
}) {
  return (
    <select
      value={value}
      aria-label="City status"
      onChange={(e) => onChange(e.target.value as CityStatusValue)}
      style={SELECT_BASE}
    >
      {CITY_STATUSES.map((s) => (
        <option key={s} value={s} style={{ background: "var(--panel)", color: "var(--text)" }}>
          {s}
        </option>
      ))}
    </select>
  );
}

function BoolSelect({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <select
      value={value ? "true" : "false"}
      aria-label="Yes or no"
      onChange={(e) => onChange(e.target.value === "true")}
      style={{ ...SELECT_BASE, minWidth: 84 }}
    >
      <option value="true" style={{ background: "var(--panel)", color: "var(--text)" }}>yes</option>
      <option value="false" style={{ background: "var(--panel)", color: "var(--text)" }}>no</option>
    </select>
  );
}

function BoolPill({ value }: { value: boolean }) {
  return <StatusPill value={value ? "yes" : "no"} tone={value ? "good" : "neutral"} />;
}

/* ── Row action clusters ───────────────────────────────────────────────── */

function RowActions({
  busy,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <MiniButton onClick={onEdit} disabled={busy}>Edit</MiniButton>
      {onDelete && (
        <MiniButton onClick={onDelete} disabled={busy} danger>Delete</MiniButton>
      )}
    </div>
  );
}

function EditActions({
  busy,
  onSave,
  onCancel,
  saveLabel = "Save",
}: {
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <MiniButton onClick={onSave} disabled={busy} primary>
        {busy ? "…" : saveLabel}
      </MiniButton>
      <MiniButton onClick={onCancel} disabled={busy}>Cancel</MiniButton>
    </div>
  );
}

function MiniButton({
  children,
  onClick,
  disabled,
  primary = false,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
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
      className="mono"
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

function PageHeader({ showRefresh, onRefresh }: { showRefresh: boolean; onRefresh: () => void }) {
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
          <span style={{ color: "var(--lime)" }}>content</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Accessories, cities, pricing &amp; FAQ
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
      {showRefresh && (
        <div style={{ display: "flex", gap: 10 }}>
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

function AuthGate() {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in required</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        You need an admin session to manage content. Sign in on the admin home, then return here.
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

/* ── Small helpers ─────────────────────────────────────────────────────── */

/** Build the page-level error state from any thrown error. */
function toErrorState(err: unknown): LoadState {
  if (err instanceof CatalogAuthError) return { phase: "no-auth" };
  if (err instanceof CatalogConfigError) {
    return { phase: "error", message: err.message, unauthorized: false, config: true };
  }
  if (err instanceof CatalogApiError) {
    if (err.unauthorized) return { phase: "no-auth" };
    return { phase: "error", message: err.message, unauthorized: false, config: false };
  }
  return { phase: "error", message: "Something went wrong loading content.", unauthorized: false, config: false };
}

/** Parse a comma-separated text field into a trimmed, non-empty string array. */
function parseList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
