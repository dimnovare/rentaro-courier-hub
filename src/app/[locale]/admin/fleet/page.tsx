"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getUnits,
  getRentals,
  updateUnitStatus,
  updateUnit,
  createUnit,
  deleteUnit,
  FleetApiError,
  FleetConfigError,
  FleetAuthError,
  type FleetUnit,
  type FleetRental,
  type CreateUnitInput,
  type UpdateUnitInput,
} from "@/services/adminFleetService";
import { AdminTable, Th, Td, fmtDay } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { modelService } from "@/services/modelService";
import { cityService } from "@/services/cityService";

/** Valid BikeUnitStatus values — must match the backend enum (Rentaro.Domain). */
const UNIT_STATUSES = [
  "available",
  "reserved",
  "rented",
  "returningSoon",
  "maintenance",
  "damaged",
  "retired",
] as const;

/** Pretty label for a status value (camelCase → spaced words). */
function statusLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

interface FleetData {
  units: FleetUnit[];
  rentals: FleetRental[];
  /** Catalogue options for the New-unit form (code + display name). */
  models: { id: string; name: string }[];
  cities: { id: string; name: string }[];
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: FleetData }
  | { phase: "error"; message: string; config: boolean };

export default function AdminFleetPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Tracks which unit codes currently have an in-flight status update.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [updateError, setUpdateError] = useState<string | null>(null);
  // Whether the "New unit" drawer is open.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The unit currently being edited (used/for-sale state), or null when closed.
  const [editingUnit, setEditingUnit] = useState<FleetUnit | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setUpdateError(null);
    try {
      const [units, rentals, models, cities] = await Promise.all([
        getUnits(),
        getRentals(),
        modelService.getModels(),
        cityService.getCities(),
      ]);
      setState({
        phase: "ready",
        data: {
          units,
          rentals,
          models: models.map((m) => ({ id: m.id, name: m.name })),
          cities: cities.map((c) => ({ id: c.id, name: c.name })),
        },
      });
    } catch (err) {
      // A missing token / 401 means the session is gone — drop to sign-in.
      if (err instanceof FleetAuthError || (err instanceof FleetApiError && err.unauthorized)) {
        signOut();
      } else if (err instanceof FleetConfigError) {
        setState({ phase: "error", message: err.message, config: true });
      } else if (err instanceof FleetApiError) {
        setState({ phase: "error", message: err.message, config: false });
      } else {
        setState({ phase: "error", message: "Something went wrong loading the fleet.", config: false });
      }
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRefresh(load);

  async function changeStatus(internalCode: string, nextStatus: string) {
    if (state.phase !== "ready") return;
    const current = state.data.units.find((u) => u.internalCode === internalCode);
    if (!current || current.status === nextStatus) return;

    setUpdateError(null);
    setPending((p) => ({ ...p, [internalCode]: true }));
    try {
      const updated = await updateUnitStatus(internalCode, nextStatus);
      setState((s) =>
        s.phase === "ready"
          ? {
              ...s,
              data: {
                ...s.data,
                units: s.data.units.map((u) =>
                  u.internalCode === internalCode ? updated : u,
                ),
              },
            }
          : s,
      );
    } catch (err) {
      if (err instanceof FleetAuthError || (err instanceof FleetApiError && err.unauthorized)) {
        signOut();
      } else {
        const msg =
          err instanceof FleetApiError
            ? err.message
            : `Could not update ${internalCode}.`;
        setUpdateError(msg);
      }
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[internalCode];
        return next;
      });
    }
  }

  async function submitUnit(input: CreateUnitInput): Promise<string | null> {
    try {
      const created = await createUnit(input);
      setState((s) =>
        s.phase === "ready"
          ? {
              ...s,
              data: {
                ...s.data,
                units: [...s.data.units, created].sort((a, b) =>
                  a.internalCode.localeCompare(b.internalCode),
                ),
              },
            }
          : s,
      );
      setDrawerOpen(false);
      return null;
    } catch (err) {
      if (err instanceof FleetAuthError || (err instanceof FleetApiError && err.unauthorized)) {
        signOut();
        return null;
      }
      return err instanceof FleetApiError ? err.message : "Could not create the bike unit.";
    }
  }

  async function submitEdit(internalCode: string, patch: UpdateUnitInput): Promise<string | null> {
    try {
      const updated = await updateUnit(internalCode, patch);
      setState((s) =>
        s.phase === "ready"
          ? {
              ...s,
              data: {
                ...s.data,
                units: s.data.units.map((u) =>
                  u.internalCode === internalCode ? updated : u,
                ),
              },
            }
          : s,
      );
      setEditingUnit(null);
      return null;
    } catch (err) {
      if (err instanceof FleetAuthError || (err instanceof FleetApiError && err.unauthorized)) {
        signOut();
        return null;
      }
      return err instanceof FleetApiError ? err.message : `Could not update ${internalCode}.`;
    }
  }

  async function removeUnit(internalCode: string) {
    if (
      !window.confirm(`Delete unit ${internalCode}? This cannot be undone.`)
    ) {
      return;
    }
    setUpdateError(null);
    setPending((p) => ({ ...p, [internalCode]: true }));
    try {
      await deleteUnit(internalCode);
      setState((s) =>
        s.phase === "ready"
          ? {
              ...s,
              data: {
                ...s.data,
                units: s.data.units.filter((u) => u.internalCode !== internalCode),
              },
            }
          : s,
      );
      // Close the edit drawer if it was open on the deleted unit.
      setEditingUnit((cur) => (cur?.internalCode === internalCode ? null : cur));
    } catch (err) {
      if (err instanceof FleetAuthError || (err instanceof FleetApiError && err.unauthorized)) {
        signOut();
      } else {
        const msg =
          err instanceof FleetApiError ? err.message : `Could not delete ${internalCode}.`;
        setUpdateError(msg);
      }
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[internalCode];
        return next;
      });
    }
  }

  return (
    <div>
      {state.phase === "loading" ? (
        <Notice>Loading fleet…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          {updateError && (
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
              {updateError}
            </div>
          )}

          <PageHeader
            title="Fleet"
            subtitle="Physical bike units and their rental timeline."
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setDrawerOpen(true)}
              style={{ padding: "11px 20px", fontSize: 14 }}
            >
              + New unit
            </button>
          </PageHeader>

          <UnitsByCity
            units={state.data.units}
            pending={pending}
            onChangeStatus={changeStatus}
            onEdit={setEditingUnit}
            onDelete={removeUnit}
          />

          <RentalTimeline units={state.data.units} rentals={state.data.rentals} />

          <NewUnitDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            models={state.data.models}
            cities={state.data.cities}
            onSubmit={submitUnit}
          />

          <EditUnitDrawer
            unit={editingUnit}
            models={state.data.models}
            cities={state.data.cities}
            onClose={() => setEditingUnit(null)}
            onSubmit={submitEdit}
            onDelete={removeUnit}
          />
        </>
      )}
    </div>
  );
}

/* ── New bike unit drawer ──────────────────────────────────────────────── */

function NewUnitDrawer({
  open,
  onClose,
  models,
  cities,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  models: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  onSubmit: (input: CreateUnitInput) => Promise<string | null>;
}) {
  const [internalCode, setInternalCode] = useState("");
  const [modelId, setModelId] = useState("");
  const [cityId, setCityId] = useState("");
  const [status, setStatus] = useState<string>("available");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [batteryId, setBatteryId] = useState("");
  const [lockId, setLockId] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextServiceDueDate, setNextServiceDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<"new" | "used">("new");
  const [forSale, setForSale] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // The catalogue loads async, so default the selects to the first option once
  // the lists arrive (and whenever they change while still unset).
  useEffect(() => {
    if (!modelId && models[0]) setModelId(models[0].id);
  }, [models, modelId]);
  useEffect(() => {
    if (!cityId && cities[0]) setCityId(cities[0].id);
  }, [cities, cityId]);

  const codeOk = internalCode.trim().length > 0;
  const canSubmit = codeOk && !!modelId && !!cityId && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    const err = await onSubmit({
      internalCode: internalCode.trim(),
      modelId,
      cityId,
      status,
      serialNumber: serialNumber.trim() || undefined,
      location: location.trim() || undefined,
      batteryId: batteryId.trim() || undefined,
      lockId: lockId.trim() || undefined,
      lastServiceDate: lastServiceDate || undefined,
      nextServiceDueDate: nextServiceDueDate || undefined,
      notes: notes.trim() || undefined,
      condition,
      forSale,
      salePrice: forSale && salePrice.trim() !== "" ? Number(salePrice) : null,
    });
    setSubmitting(false);
    if (err) {
      setFormError(err);
    } else {
      // Reset the per-unit fields; keep model/city/status for fast repeat entry.
      setInternalCode("");
      setSerialNumber("");
      setLocation("");
      setBatteryId("");
      setLockId("");
      setLastServiceDate("");
      setNextServiceDueDate("");
      setNotes("");
      setCondition("new");
      setForSale(false);
      setSalePrice("");
    }
  }

  function close() {
    setFormError(null);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New bike unit"
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={close}
            style={{ padding: "11px 20px", fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            style={{
              padding: "11px 20px",
              fontSize: 14,
              opacity: canSubmit ? 1 : 0.55,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Creating…" : "Create unit"}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        {formError && (
          <div
            className="mono"
            role="alert"
            style={{
              color: "var(--danger)",
              fontSize: 12,
              marginBottom: 16,
              padding: "10px 13px",
              borderRadius: "var(--r-sm)",
              border: "1px solid rgba(255, 138, 120, 0.32)",
              background: "rgba(255, 138, 120, 0.06)",
            }}
          >
            {formError}
          </div>
        )}

        <div className="field">
          <label htmlFor="bu-code">Internal code</label>
          <input
            id="bu-code"
            value={internalCode}
            onChange={(e) => setInternalCode(e.target.value)}
            placeholder="e.g. TLN-EP-001"
            aria-label="Internal code"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="bu-model">Model</label>
            <select id="bu-model" value={modelId} onChange={(e) => setModelId(e.target.value)} aria-label="Model">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bu-city">City</label>
            <select id="bu-city" value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label="City">
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="bu-status">Status</label>
            <select id="bu-status" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              {UNIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bu-serial">Serial number</label>
            <input
              id="bu-serial"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="optional"
              aria-label="Serial number"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="bu-battery">Battery ID</label>
            <input
              id="bu-battery"
              value={batteryId}
              onChange={(e) => setBatteryId(e.target.value)}
              placeholder="optional"
              aria-label="Battery ID"
            />
          </div>
          <div className="field">
            <label htmlFor="bu-lock">Lock ID</label>
            <input
              id="bu-lock"
              value={lockId}
              onChange={(e) => setLockId(e.target.value)}
              placeholder="optional"
              aria-label="Lock ID"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="bu-location">Location</label>
          <input
            id="bu-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Telliskivi depot (optional)"
            aria-label="Location"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="bu-last-svc">Last service</label>
            <input
              id="bu-last-svc"
              type="date"
              value={lastServiceDate}
              onChange={(e) => setLastServiceDate(e.target.value)}
              aria-label="Last service date"
            />
          </div>
          <div className="field">
            <label htmlFor="bu-next-svc">Next service due</label>
            <input
              id="bu-next-svc"
              type="date"
              value={nextServiceDueDate}
              onChange={(e) => setNextServiceDueDate(e.target.value)}
              aria-label="Next service due date"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="bu-notes">Notes</label>
          <textarea
            id="bu-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional"
            aria-label="Notes"
            rows={3}
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="bu-condition">Condition</label>
            <select
              id="bu-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as "new" | "used")}
              aria-label="Condition"
            >
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bu-sale-price">Sale price (€)</label>
            <input
              id="bu-sale-price"
              type="number"
              min={0}
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              disabled={!forSale}
              placeholder={forSale ? "optional" : "for-sale only"}
              aria-label="Sale price in euros"
              style={{ opacity: forSale ? 1 : 0.5 }}
            />
          </div>
        </div>

        <div className="field">
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: 9, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={forSale}
              onChange={(e) => setForSale(e.target.checked)}
              aria-label="For sale"
              style={{ width: "auto", margin: 0, cursor: "pointer" }}
            />
            For sale
          </label>
        </div>

        {!codeOk && (
          <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", margin: 0 }}>
            An internal code is required.
          </p>
        )}

        {/* Hidden submit keeps Enter-to-create working. */}
        <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}

/* ── Units, grouped by city ────────────────────────────────────────────── */

function UnitsByCity({
  units,
  pending,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  units: FleetUnit[];
  pending: Record<string, boolean>;
  onChangeStatus: (code: string, status: string) => void;
  onEdit: (unit: FleetUnit) => void;
  onDelete: (code: string) => void;
}) {
  // Group units by city, preserving first-seen city order.
  const groups = useMemo(() => {
    const map = new Map<string, FleetUnit[]>();
    for (const u of units) {
      const list = map.get(u.cityId);
      if (list) list.push(u);
      else map.set(u.cityId, [u]);
    }
    return [...map.entries()];
  }, [units]);

  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHead title="Units" count={units.length} />

      {groups.length === 0 ? (
        <div
          className="card mono"
          style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}
        >
          No bike units.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {groups.map(([city, cityUnits]) => (
            <div key={city}>
              <h3
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                {city} · {cityUnits.length}
              </h3>
              <AdminTable>
                <thead>
                  <tr>
                    <Th>Internal code</Th>
                    <Th>Model</Th>
                    <Th>Serial</Th>
                    <Th>Status</Th>
                    <Th>Change status</Th>
                    <Th>Sale state</Th>
                    <Th>Last service</Th>
                    <Th>Next due</Th>
                    <Th>Notes</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {cityUnits.map((u) => (
                    <tr key={u.internalCode}>
                      <Td mono nowrap>
                        {u.internalCode}
                      </Td>
                      <Td mono dim>
                        {u.modelId}
                      </Td>
                      <Td mono dim>
                        {u.serialNumber ?? "—"}
                      </Td>
                      <Td nowrap>
                        <StatusPill value={u.status} />
                      </Td>
                      <Td nowrap>
                        <StatusSelect
                          value={u.status}
                          busy={Boolean(pending[u.internalCode])}
                          onChange={(next) => onChangeStatus(u.internalCode, next)}
                        />
                      </Td>
                      <Td nowrap>
                        <SaleState unit={u} />
                      </Td>
                      <Td mono nowrap>
                        {fmtDay(u.lastServiceDate)}
                      </Td>
                      <Td mono nowrap>
                        {fmtDay(u.nextServiceDueDate)}
                      </Td>
                      <Td dim>{u.notes?.trim() ? u.notes : "—"}</Td>
                      <Td nowrap>
                        <span style={{ display: "inline-flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onEdit(u)}
                            style={{ padding: "7px 14px", fontSize: 12 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onDelete(u.internalCode)}
                            disabled={Boolean(pending[u.internalCode])}
                            style={{
                              padding: "7px 14px",
                              fontSize: 12,
                              color: "var(--danger)",
                              borderColor: "rgba(255, 138, 120, 0.32)",
                              opacity: pending[u.internalCode] ? 0.55 : 1,
                              cursor: pending[u.internalCode] ? "not-allowed" : "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Compact used/for-sale tags for a unit row. Renders nothing extra for a new,
 *  not-for-sale unit (just a muted dash) to keep the table quiet. */
function SaleState({ unit }: { unit: FleetUnit }) {
  const used = unit.condition === "used";
  if (!used && !unit.forSale) {
    return <span style={{ color: "var(--text-dim)" }}>—</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {used && <StatusPill value="used" tone="neutral" />}
      {unit.forSale && (
        <StatusPill
          value={unit.salePrice != null ? `for sale · €${unit.salePrice}` : "for sale"}
          tone="info"
        />
      )}
    </span>
  );
}

/* ── Edit bike unit drawer (full physical editor) ──────────────────────── */

function EditUnitDrawer({
  unit,
  models,
  cities,
  onClose,
  onSubmit,
  onDelete,
}: {
  unit: FleetUnit | null;
  models: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (internalCode: string, patch: UpdateUnitInput) => Promise<string | null>;
  onDelete: (code: string) => void;
}) {
  const [internalCode, setInternalCode] = useState("");
  const [modelId, setModelId] = useState("");
  const [cityId, setCityId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [batteryId, setBatteryId] = useState("");
  const [lockId, setLockId] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextServiceDueDate, setNextServiceDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<"new" | "used">("new");
  const [forSale, setForSale] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Seed every field from the unit each time a new one is opened.
  useEffect(() => {
    if (!unit) return;
    setInternalCode(unit.internalCode);
    setModelId(unit.modelId);
    setCityId(unit.cityId);
    setSerialNumber(unit.serialNumber ?? "");
    setLocation(unit.location ?? "");
    setBatteryId(unit.batteryId ?? "");
    setLockId(unit.lockId ?? "");
    setLastServiceDate(unit.lastServiceDate ?? "");
    setNextServiceDueDate(unit.nextServiceDueDate ?? "");
    setNotes(unit.notes ?? "");
    setCondition(unit.condition);
    setForSale(unit.forSale);
    setSalePrice(unit.salePrice != null ? String(unit.salePrice) : "");
    setFormError(null);
  }, [unit]);

  async function handleSubmit() {
    if (!unit || submitting) return;
    const nextCode = internalCode.trim();
    if (!nextCode) {
      setFormError("An internal code is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // Send each field's current/edited value. Optional strings send the trimmed
    // value or "" to clear; modelId/cityId are validated server-side (blank
    // leaves the current one). Include internalCode only when it actually
    // changed — that renames the unit (backend 409s on a code collision).
    const err = await onSubmit(unit.internalCode, {
      ...(nextCode !== unit.internalCode ? { internalCode: nextCode } : {}),
      modelId,
      cityId,
      serialNumber: serialNumber.trim(),
      location: location.trim(),
      batteryId: batteryId.trim(),
      lockId: lockId.trim(),
      lastServiceDate,
      nextServiceDueDate,
      notes: notes.trim(),
      condition,
      forSale,
      salePrice: forSale && salePrice.trim() !== "" ? Number(salePrice) : null,
    });
    setSubmitting(false);
    if (err) setFormError(err);
  }

  return (
    <Drawer
      open={unit !== null}
      onClose={onClose}
      title="Edit bike unit"
      subtitle={unit?.internalCode}
      footer={
        <>
          {unit && (
            <button
              type="button"
              className="btn btn-ghost spacer"
              onClick={() => onDelete(unit.internalCode)}
              disabled={submitting}
              style={{
                padding: "11px 20px",
                fontSize: 14,
                color: "var(--danger)",
                borderColor: "rgba(255, 138, 120, 0.32)",
                opacity: submitting ? 0.55 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: "11px 20px", fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{
              padding: "11px 20px",
              fontSize: 14,
              opacity: submitting ? 0.55 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        {formError && (
          <div
            className="mono"
            role="alert"
            style={{
              color: "var(--danger)",
              fontSize: 12,
              marginBottom: 16,
              padding: "10px 13px",
              borderRadius: "var(--r-sm)",
              border: "1px solid rgba(255, 138, 120, 0.32)",
              background: "rgba(255, 138, 120, 0.06)",
            }}
          >
            {formError}
          </div>
        )}

        {/* Internal code is a unique business key — editable here so a mistyped
            code can be corrected; submitting a new value renames the unit. */}
        <div className="field">
          <label htmlFor="eu-code">Internal code</label>
          <input
            id="eu-code"
            value={internalCode}
            onChange={(e) => setInternalCode(e.target.value)}
            placeholder="e.g. TLN-EP-001"
            aria-label="Internal code"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="eu-model">Model</label>
            <select id="eu-model" value={modelId} onChange={(e) => setModelId(e.target.value)} aria-label="Model">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="eu-city">City</label>
            <select id="eu-city" value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label="City">
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="eu-serial">Serial number</label>
          <input
            id="eu-serial"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="optional"
            aria-label="Serial number"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="eu-battery">Battery ID</label>
            <input
              id="eu-battery"
              value={batteryId}
              onChange={(e) => setBatteryId(e.target.value)}
              placeholder="optional"
              aria-label="Battery ID"
            />
          </div>
          <div className="field">
            <label htmlFor="eu-lock">Lock ID</label>
            <input
              id="eu-lock"
              value={lockId}
              onChange={(e) => setLockId(e.target.value)}
              placeholder="optional"
              aria-label="Lock ID"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="eu-location">Location</label>
          <input
            id="eu-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Telliskivi depot (optional)"
            aria-label="Location"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="eu-last-svc">Last service</label>
            <input
              id="eu-last-svc"
              type="date"
              value={lastServiceDate}
              onChange={(e) => setLastServiceDate(e.target.value)}
              aria-label="Last service date"
            />
          </div>
          <div className="field">
            <label htmlFor="eu-next-svc">Next service due</label>
            <input
              id="eu-next-svc"
              type="date"
              value={nextServiceDueDate}
              onChange={(e) => setNextServiceDueDate(e.target.value)}
              aria-label="Next service due date"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="eu-notes">Notes</label>
          <textarea
            id="eu-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional"
            aria-label="Notes"
            rows={3}
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="eu-condition">Condition</label>
            <select
              id="eu-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as "new" | "used")}
              aria-label="Condition"
            >
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="eu-sale-price">Sale price (€)</label>
            <input
              id="eu-sale-price"
              type="number"
              min={0}
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              disabled={!forSale}
              placeholder={forSale ? "optional" : "for-sale only"}
              aria-label="Sale price in euros"
              style={{ opacity: forSale ? 1 : 0.5 }}
            />
          </div>
        </div>

        <div className="field">
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: 9, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={forSale}
              onChange={(e) => setForSale(e.target.checked)}
              aria-label="For sale"
              style={{ width: "auto", margin: 0, cursor: "pointer" }}
            />
            For sale
          </label>
        </div>

        {/* Hidden submit keeps Enter-to-save working. */}
        <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}

function StatusSelect({
  value,
  busy,
  onChange,
}: {
  value: string;
  busy: boolean;
  onChange: (next: string) => void;
}) {
  // Include the current value even if it isn't in the known list, so the select
  // never silently drops an unexpected backend status.
  const options = UNIT_STATUSES.includes(value as (typeof UNIT_STATUSES)[number])
    ? UNIT_STATUSES
    : ([value, ...UNIT_STATUSES] as readonly string[]);

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Change unit status"
      style={{
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
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
        minWidth: 138,
      }}
    >
      {options.map((s) => (
        <option key={s} value={s} style={{ background: "var(--panel)", color: "var(--text)" }}>
          {statusLabel(s)}
        </option>
      ))}
    </select>
  );
}

/* ── Rental timeline (lightweight month grid) ──────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function RentalTimeline({
  units,
  rentals,
}: {
  units: FleetUnit[];
  rentals: FleetRental[];
}) {
  // Build a contiguous window covering all rentals (clamped to a sensible
  // minimum), so bars line up against a shared, evenly-divided day axis.
  const axis = useMemo(() => {
    const starts: number[] = [];
    const ends: number[] = [];
    for (const r of rentals) {
      const s = parseDay(r.startDate);
      const e = parseDay(r.plannedEndDate) ?? s;
      if (s) starts.push(s.getTime());
      if (e) ends.push(e.getTime());
    }
    const today = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    );
    let min = starts.length ? Math.min(...starts) : today;
    let max = ends.length ? Math.max(...ends) : today + 30 * DAY_MS;
    // Pad a couple of days on each side and enforce a >= ~30-day window.
    min -= 2 * DAY_MS;
    max += 2 * DAY_MS;
    if (max - min < 30 * DAY_MS) max = min + 30 * DAY_MS;
    const totalDays = Math.max(1, Math.round((max - min) / DAY_MS));
    return { min, max, totalDays, today };
  }, [rentals]);

  // Only show units that actually have rentals; key rows by unit code.
  const rows = useMemo(() => {
    const byCode = new Map<string, FleetRental[]>();
    for (const r of rentals) {
      const code = r.bikeUnitInternalCode ?? "unassigned";
      const list = byCode.get(code);
      if (list) list.push(r);
      else byCode.set(code, [r]);
    }
    return [...byCode.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rentals]);

  // Month tick labels across the window for light orientation.
  const months = useMemo(() => {
    const ticks: { left: number; label: string }[] = [];
    const start = new Date(axis.min);
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cursor.getTime() <= axis.max) {
      const t = cursor.getTime();
      if (t >= axis.min) {
        const left = ((t - axis.min) / (axis.totalDays * DAY_MS)) * 100;
        ticks.push({
          left,
          label: cursor.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return ticks;
  }, [axis]);

  const todayLeft =
    axis.today >= axis.min && axis.today <= axis.max
      ? ((axis.today - axis.min) / (axis.totalDays * DAY_MS)) * 100
      : null;

  function unitCity(code: string): string | null {
    return units.find((u) => u.internalCode === code)?.cityId ?? null;
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHead title="Rental timeline" count={rentals.length} />

      {rentals.length === 0 ? (
        <div
          className="card mono"
          style={{ padding: 28, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}
        >
          No rentals to show yet. Active rentals appear here as a timeline once they exist.
        </div>
      ) : (
        <div className="card" style={{ padding: "22px 22px 26px", overflowX: "auto" }}>
          <div style={{ minWidth: 720 }}>
            {/* Month axis */}
            <div
              style={{
                position: "relative",
                height: 18,
                marginLeft: 168,
                marginBottom: 10,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {months.map((m) => (
                <span
                  key={`${m.label}-${m.left}`}
                  className="mono"
                  style={{
                    position: "absolute",
                    left: `${m.left}%`,
                    top: 0,
                    fontSize: 9.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    transform: "translateX(-2px)",
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Rows: one per unit that has rentals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map(([code, unitRentals]) => {
                const city = unitCity(code);
                return (
                  <div key={code} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    {/* Row label */}
                    <div style={{ width: 168, flexShrink: 0, paddingRight: 12 }}>
                      <div
                        className="mono"
                        style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}
                      >
                        {code}
                      </div>
                      {city && (
                        <div
                          className="mono"
                          style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}
                        >
                          {city}
                        </div>
                      )}
                    </div>

                    {/* Track */}
                    <div
                      style={{
                        position: "relative",
                        flex: 1,
                        height: 30,
                        borderRadius: "var(--r-sm)",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Today marker */}
                      {todayLeft !== null && (
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: `${todayLeft}%`,
                            width: 1,
                            background: "rgba(111, 180, 255, 0.6)",
                          }}
                        />
                      )}

                      {unitRentals.map((r) => {
                        const s = parseDay(r.startDate);
                        const e = parseDay(r.plannedEndDate) ?? s;
                        if (!s || !e) return null;
                        const startMs = Math.max(s.getTime(), axis.min);
                        const endMs = Math.min(e.getTime() + DAY_MS, axis.max); // inclusive end day
                        const span = axis.totalDays * DAY_MS;
                        const left = ((startMs - axis.min) / span) * 100;
                        const width = Math.max(1.2, ((endMs - startMs) / span) * 100);
                        return (
                          <span
                            key={r.id}
                            title={`${r.customerEmail} · ${r.planId} · ${r.startDate} → ${
                              r.plannedEndDate ?? "open"
                            } · ${statusLabel(r.status)}`}
                            style={{
                              position: "absolute",
                              top: 4,
                              bottom: 4,
                              left: `${left}%`,
                              width: `${width}%`,
                              borderRadius: "var(--r-full)",
                              background:
                                "linear-gradient(90deg, rgba(216,255,54,0.9), rgba(196,240,42,0.75))",
                              border: "1px solid rgba(216, 255, 54, 0.5)",
                              boxShadow: "0 4px 14px -6px var(--lime-glow)",
                              display: "flex",
                              alignItems: "center",
                              paddingLeft: 8,
                              overflow: "hidden",
                            }}
                          >
                            <span
                              className="mono"
                              style={{
                                fontSize: 9.5,
                                color: "var(--lime-ink)",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                              }}
                            >
                              {r.planId}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div
              className="mono"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px dashed var(--border)",
                fontSize: 10,
                color: "var(--text-dim)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    width: 16,
                    height: 8,
                    borderRadius: 999,
                    background: "var(--lime)",
                    display: "inline-block",
                  }}
                />
                rental (start → planned end)
              </span>
              {todayLeft !== null && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{ width: 1, height: 12, background: "rgba(111,180,255,0.8)", display: "inline-block" }}
                  />
                  today
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Shared pieces ─────────────────────────────────────────────────────── */

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
      {typeof count === "number" && (
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {count} {count === 1 ? "record" : "records"}
        </span>
      )}
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
